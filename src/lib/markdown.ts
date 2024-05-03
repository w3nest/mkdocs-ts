/**
 * This file gathers entry points related to Mardown parsing.
 *
 */
import { parse, setOptions } from 'marked'
import highlight from 'highlight.js'
import { AnyVirtualDOM, render, VirtualDOM } from '@youwol/rx-vdom'
import * as webpm from '@youwol/webpm-client'
import { from } from 'rxjs'
import { Router } from './router'
import { CodeLanguage, CodeSnippetView } from './md-widgets/code-snippet.view'
import { NoteLevel, NoteView } from './md-widgets'

/**
 * Type definition for custom view generators.
 *
 * The function takes as arguments:
 * *  **elem**: The HTMLElement in Markdown that triggered the generator.
 * *  **options**: The options that were provided to the MD parser.
 *
 * It returns the generated virtual DOM.
 *
 *  See details in the documentation of {@link parseMd} to register views.
 *
 */
export type ViewGenerator = (
    elem: HTMLElement,
    options: { router?: Router } & MdParsingOptions,
) => AnyVirtualDOM

/**
 * Options for parsing Markdown content.
 */
export type MdParsingOptions = {
    /**
     * Placeholders to account for. A form of preprocessing that replace any occurrences of the keys
     * in the source by their corresponding values.
     */
    placeholders?: { [k: string]: string }
    /**
     * Preprocessing step. This callback is called to transform the source before parsing is executed.
     * @param text original text
     * @return transformed text
     */
    preprocessing?: (text: string) => string
    /**
     *  Custom views generators corresponding to HTMLElement referenced in the Markdown source.
     */
    views?: { [k: string]: ViewGenerator }

    /**
     * Whether to parse Latex equations.
     * If `true` the MathJax module needs to be loaded by the consumer before parsing occurs.
     *
     * Using the webpm client:
     * ````js
     * import { install } from '@youwol/webpm-client'
     *
     * await install({
     *     modules: ['mathjax#^3.1.4'],
     * })
     * ```
     *
     * Within the markdown page, equation blocks are written between `$$` and inline elements between
     * `\\(` and `\\)`
     */
    latex?: boolean

    /**
     * If true, call {@link Router.emitHtmlUpdated} when the markdown is rendered.
     */
    emitHtmlUpdated?: boolean
}
/**
 * Represents global Markdown views that can be referenced when using {@link parseMd}.
 *
 * By default, it is populated with `code-snippet`, more information in {@link CodeSnippetView}.
 *
 * The definition of a custom view is provided using a function that:
 * *  Takes as single argument the HTML element as declared in the markdown file.
 * The raw text content within the DOM element can be accessed using `elem.textContent` and attributes using
 * `elem.getAttribute`.
 * *  Returns a virtual dom defining the corresponding implementation of the HTML element.
 *
 */
export class GlobalMarkdownViews {
    /**
     * Static factory for markdown inlined views.
     */
    static factory: { [k: string]: ViewGenerator } = {
        'code-snippet': (elem: HTMLElement) => {
            return new CodeSnippetView({
                language: elem.getAttribute('language') as CodeLanguage,
                highlightedLines: elem.getAttribute('highlightedLines'),
                content: elem.textContent,
            })
        },
        note: (elem: HTMLElement, parsingArgs) => {
            return new NoteView({
                level: elem.getAttribute('level') as NoteLevel,
                label: elem.getAttribute('label'),
                content: elem.textContent,
                parsingArgs,
            })
        },
    }
}

/**
 * Fetch & parse a Markdown file from specified with a URL.
 *
 * @param params see {@link MdParsingOptions} for additional options.
 * @param params.url The URL of the file.
 */
export function fetchMarkdown(
    params: {
        url: string
    } & MdParsingOptions,
): ({ router }: { router: Router }) => Promise<VirtualDOM<'div'>> {
    setOptions({
        langPrefix: 'hljs language-',
        highlight: function (code, lang) {
            return highlight.highlightAuto(code, [lang]).value
        },
    })

    return ({ router }: { router: Router }) => {
        return fetch(params.url)
            .then((resp) => resp.text())
            .then((src) => {
                return parseMd({
                    src,
                    router,
                    ...params,
                })
            })
    }
}

export function fromMarkdown(p) {
    return fetchMarkdown(p)
}

/**
 * Parse a Markdown file specified with a URL.
 *
 * Note that custom views provided using the attribute `views ̀ comes in addition to those registered globally in
 * {@link GlobalMarkdownViews}.
 *
 * **Notes on custom views**
 *
 * Custom views allow to replace in Markdown sources some elements by dynamically generated ones in javascript.
 *
 *
 * For instance, a custom view `foo-view` can be referenced in the Markdown:
 *  ```
 *  # An example of custom-view
 *
 *  This is a custom view:
 *  <foo-view barAttr='bar' bazAttr="baz">some content</foo-view>
 *  ```
 *  When parsed, it will be replaced by its corresponding generated view if `foo-view` is included in this
 *  `views` mapping provided to this function. The associated generator can access attributes (here `barAttr` &
 *  `bazAttr`) as well as the original text content (`some content`).
 *
 *  The generator functions are called in the order of their corresponding elements in the Markdown source.
 *
 * @param args see {@link MdParsingOptions} for additional options.
 * @param args.src Markdown source.
 * @param args.router The router instance.
 * @param args.navigations Specify custom redirections for HTMLAnchorElement.
 * @returns A virtual DOM encapsulating the parsed Markdown.
 */
export function parseMd({
    src,
    router,
    navigations,
    views,
    placeholders,
    preprocessing,
    emitHtmlUpdated,
    latex,
}: {
    src: string
    router?: Router
    navigations?: { [k: string]: (e: HTMLAnchorElement) => void }
} & MdParsingOptions): VirtualDOM<'div'> {
    if (typeof src !== 'string') {
        console.error('Given MD source is not a string', src)
        return {
            tag: 'div',
            innerText: 'Error: given MD source is not a string"',
        }
    }
    src = preprocessing?.(src) || src
    if (placeholders) {
        const regex = new RegExp(Object.keys(placeholders || {}).join('|'), 'g')
        src = src.replace(regex, (match) => placeholders[match])
    }
    views = { ...views, ...GlobalMarkdownViews.factory }
    const { div, replacedViews } = fixedMarkedParseCustomViews({
        input: src,
        views: views,
    })

    latex && window['MathJax'] && window['MathJax'].typeset([div])

    const customs = div.querySelectorAll('.language-custom-view')
    customs.forEach((custom) => {
        const fct = new Function(custom['innerText'])()({ webpm })
        const view = render({
            tag: 'div',
            children: [
                {
                    source$: from(fct),
                    vdomMap: (vDom) => vDom as AnyVirtualDOM,
                },
            ],
        })
        custom.parentNode.parentNode.replaceChild(view, custom.parentNode)
    })

    // Navigation links
    const links = div.querySelectorAll('a')
    links.forEach((link) => {
        if (link.href.includes('@nav') && router) {
            const path = link.href.split('@nav')[1]
            link.href = `${router.basePath}?nav=${path}`
            link.onclick = (e: MouseEvent) => {
                e.preventDefault()
                router.navigateTo({ path })
            }
        }
        if (navigations) {
            Object.entries(navigations).forEach(([k, v]) => {
                if (link.href.includes(`@${k}`)) {
                    link.onclick = (e: MouseEvent) => {
                        e.preventDefault()
                        v(link)
                    }
                }
            })
        }
    })
    const options = {
        router,
        preprocessing,
        placeholders,
        latex,
        views,
        emitHtmlUpdated,
    }
    const viewsTagUpperCase = Object.entries(views).reduce(
        (acc, [k, v]) => ({ ...acc, [k.toUpperCase()]: v }),
        {},
    )
    Object.entries(replacedViews).forEach(([k, content]: [string, string]) => {
        const elem = div.querySelector(`#${k}`)
        if (!elem) {
            return
        }
        elem.textContent = content
        const factory = viewsTagUpperCase[elem.tagName]
        factory &&
            elem.parentNode.replaceChild(render(factory(elem, options)), elem)
    })

    return {
        tag: 'div',
        children: [div],
        connectedCallback: () => emitHtmlUpdated && router.emitHtmlUpdated(),
    }
}

export function patchSrc({
    src,
    views,
    idGenerator,
}: {
    src: string
    views
    idGenerator?: () => string
}) {
    let patchedSrc = ''
    const lines = src.split('\n')
    const contents = {}

    function extractInlinedElem(line: string, tagName: string, id: string) {
        const regex = new RegExp(
            `<${tagName}\\s*([^>]*)>([\\s\\S]*?)<\\/${tagName}>`,
            'i',
        )
        const match = line.match(regex)

        if (!match) {
            return null
        }
        const patchedLine = line.replace(
            regex,
            `<${tagName} id="${id}" $1></${tagName}>`,
        )
        const content = match[2].trim()
        return { patchedLine, content }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const processor = Object.keys(views).find((viewId) =>
            line.trim().includes(`<${viewId}`),
        )
        if (!processor) {
            patchedSrc += line + '\n'
            continue
        }

        const id = idGenerator
            ? idGenerator()
            : `id_${Math.floor(Math.random() * 1e6)}`
        if (line.includes(`</${processor}>`)) {
            const { patchedLine, content } = extractInlinedElem(
                line,
                processor,
                id,
            )
            patchedSrc += patchedLine + '\n'
            contents[id] = content
            continue
        }
        patchedSrc += `${line.trim().slice(0, -1)} id="${id}"></${processor}>\n`
        let acc = ''
        let openedCount = 1
        for (let j = i + 1; j < lines.length; j++) {
            const newLine = lines[j]
            if (newLine.includes(`<${processor}`)) {
                acc += newLine + '\n'
                openedCount++
                continue
            }
            if (newLine.includes(`</${processor}>`)) {
                openedCount--
            }
            if (openedCount > 0) {
                acc += newLine + '\n'
                continue
            }
            // If there was a content, remove the last '\n'
            if (acc !== '') {
                acc = acc.slice(0, -1)
            }
            i = j
            const restOfLine = newLine.split(`</${processor}>`)[1].trim()
            if (restOfLine !== '') {
                patchedSrc += restOfLine + `\n`
            }
            contents[id] = acc
            break
        }
    }
    return {
        // remove the last '\n'
        patchedInput: patchedSrc.slice(0, -1),
        contents,
    }
}
function fixedMarkedParseCustomViews({
    input,
    views,
}: {
    input: string
    views: { [k: string]: ViewGenerator }
}) {
    /**
     * The library 'marked' parse the innerHTML of HTML elements as markdown,
     * while their innerHTML should be preserved for custom views.
     * The purpose of this function is to fix this behavior.
     */
    const divPatched = document.createElement('div')
    const { patchedInput, contents } = patchSrc({ src: input, views })

    const divResult = document.createElement('div')
    divResult.innerHTML = parse(patchedInput)
    Object.entries(contents).forEach(([id, content]) => {
        const elem = divResult.querySelector(`#${id}`)
        if (!elem) {
            console.error('Can not replace HTML element', {
                text: divPatched.innerHTML,
                element: content,
            })
            return
        }
        elem.id = id
    })

    return { div: divResult, replacedViews: contents }
}
