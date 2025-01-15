/**
 * This file gathers entry points related to Mardown parsing.
 *
 */
import { parse, setOptions } from 'marked'
import highlight from 'highlight.js'
import { AnyVirtualDOM, child$, render, VirtualDOM } from 'rx-vdom'
import * as webpm from '@w3nest/webpm-client'
import { from } from 'rxjs'
import { headingPrefixId, type Router } from './router'
import { CodeSnippetView, NoteView, CodeBadgesView } from './md-widgets'
import { AnyView } from './navigation.node'

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
) => AnyView

/**
 * Options for parsing Markdown content.
 */
export interface MdParsingOptions {
    /**
     * Placeholders to account for. A form of preprocessing that replace any occurrences of the keys
     * in the source by their corresponding values.
     */
    placeholders?: Record<string, string>
    /**
     * Preprocessing step. This callback is called to transform the source before parsing is executed.
     * @param text original text
     * @return transformed text
     */
    preprocessing?: (text: string) => string
    /**
     *  Custom views generators corresponding to HTMLElement referenced in the Markdown source.
     */
    views?: Record<string, ViewGenerator>

    /**
     * Whether to parse Latex equations.
     * If `true` the MathJax module needs to be loaded by the consumer before parsing occurs.
     *
     * Using the webpm client:
     * ````js
     * import { install } from '@w3nest/webpm-client'
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
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GlobalMarkdownViews {
    /**
     * Static factory for markdown inlined views.
     */
    static factory: Record<string, ViewGenerator> = {
        /**
         * Transforms a `<code-snippet></code-snippet>` element into {@link CodeSnippetView}.
         */
        'code-snippet': (elem: HTMLElement) =>
            CodeSnippetView.fromHTMLElement(elem),
        /**
         * Transforms a `<note></note>`  element into {@link NoteView}.
         */
        note: (...args) => NoteView.fromHTMLElement(...args),
        /**
         * Transforms a `<code-badges></code-badges>`  element into {@link CodeBadgesView}.
         */
        'code-badges': (elem: HTMLElement) =>
            CodeBadgesView.fromHTMLElement(elem),
    }
}

export type FetchMdInput = {
    url: string
} & MdParsingOptions
/**
 * Fetch & parse a Markdown file from specified with a URL.
 *
 * @param params see {@link MdParsingOptions} for additional options.
 * @param params.url The URL of the file.
 */
export function fetchMd(
    params: FetchMdInput,
): ({ router }: { router: Router }) => Promise<VirtualDOM<'div'>> {
    return async ({ router }: { router: Router }) => {
        const resp = await fetch(params.url)
        const src = await resp.text()
        return parseMd({
            src,
            router,
            ...params,
        })
    }
}

export function fetchMarkdown(p: FetchMdInput) {
    return fetchMd(p)
}
export function fromMarkdown(p: FetchMdInput) {
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
 * @returns A virtual DOM encapsulating the parsed Markdown.
 */
export function parseMd({
    src,
    router,
    views,
    placeholders,
    preprocessing,
    emitHtmlUpdated,
    latex,
}: {
    src: string
    router?: Router
    navigations?: Record<string, (e: HTMLAnchorElement) => void>
} & MdParsingOptions): VirtualDOM<'div'> {
    src = preprocessing?.(src) ?? src
    if (placeholders && Object.keys(placeholders).length > 0) {
        const regex = new RegExp(Object.keys(placeholders).join('|'), 'g')
        src = src.replace(regex, (match) => placeholders[match])
    }
    views = { ...views, ...GlobalMarkdownViews.factory }
    const { div, replacedViews } = fixedMarkedParseCustomViews({
        input: src,
        views: views,
    })

    // @ts-expect-error Need to find a better way
    if (latex && window.MathJax) {
        // eslint-disable-next-line
        window['MathJax'].typeset([div])
    }

    const customs = div.querySelectorAll('.language-custom-view')
    ;[...customs]
        .filter((custom) => custom instanceof HTMLElement)
        .forEach((custom) => {
            // eslint-disable-next-line @typescript-eslint/no-implied-eval,@typescript-eslint/no-unsafe-call
            const fct = new Function(custom.innerText)()({
                webpm,
            }) as unknown as Promise<AnyVirtualDOM>
            const view = render({
                tag: 'div',
                children: [
                    child$({
                        source$: from(fct),
                        vdomMap: (vDom) => vDom,
                    }),
                ],
            })
            custom.parentNode?.parentNode?.replaceChild(view, custom.parentNode)
        })

    const options = {
        router,
        preprocessing,
        placeholders,
        latex,
        views,
        emitHtmlUpdated,
    }
    const viewsTagUpperCase: Record<
        Uppercase<string>,
        ViewGenerator
    > = Object.entries(views).reduce(
        (acc, [k, v]) => ({ ...acc, [k.toUpperCase()]: v }),
        {},
    )
    Object.entries(replacedViews).forEach(([k, content]: [string, string]) => {
        const elem = div.querySelector(`#${k}`)
        if (!elem || !(elem instanceof HTMLElement)) {
            return
        }
        elem.textContent = content
        if (!((elem.tagName as Uppercase<string>) in viewsTagUpperCase)) {
            return
        }
        const factory = viewsTagUpperCase[elem.tagName as Uppercase<string>]
        const replacedView = factory(elem, options)
        elem.parentNode?.replaceChild(
            replacedView instanceof HTMLElement
                ? replacedView
                : render(replacedView),
            elem,
        )
    })

    return {
        tag: 'div',
        children: [div],
        connectedCallback: (elem) => {
            // Navigation links
            if (router) {
                replaceLinks({ router, elem, fromMarkdown: true })
            }
            if (emitHtmlUpdated && router) {
                router.emitHtmlUpdated()
            }
        },
    }
}

export function patchSrc({
    src,
    views,
    idGenerator,
}: {
    src: string
    views: Record<string, unknown>
    idGenerator?: () => string
}) {
    let patchedSrc = ''
    const lines = src.split('\n')
    const contents: Record<string, string> = {}

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
            // noinspection ContinueStatementJS
            continue
        }
        const rndNumber = Math.floor(Math.random() * Math.pow(10, 6))
        const id = idGenerator ? idGenerator() : `id_${String(rndNumber)}`
        if (line.includes(`</${processor}>`)) {
            const extracted = extractInlinedElem(line, processor, id)
            if (extracted) {
                patchedSrc += extracted.patchedLine + '\n'
                contents[id] = extracted.content
            }
            // noinspection ContinueStatementJS
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
                // noinspection ContinueStatementJS
                continue
            }
            if (newLine.includes(`</${processor}>`)) {
                openedCount--
            }
            if (openedCount > 0) {
                acc += newLine + '\n'
                // noinspection ContinueStatementJS
                continue
            }
            // If there was a content, remove the last '\n'
            if (acc !== '') {
                acc = acc.slice(0, -1)
            }
            // noinspection AssignmentToForLoopParameterJS
            i = j
            const restOfLine = newLine.split(`</${processor}>`)[1].trim()
            if (restOfLine !== '') {
                patchedSrc += restOfLine + `\n`
            }
            contents[id] = acc
            // noinspection BreakStatementJS
            break
        }
    }
    return {
        // remove the last '\n'
        patchedInput: patchedSrc.slice(0, -1),
        contents,
    }
}

/**
 * This function takes an input text, remove the escaped parts:
 * *  a line start with triple back-quote: this line is escaped as well as all the following line until one starts
 * with triple back-quote.
 * *  a line include a single back quote: the remaining of the line as well as all the following line until a corresponding
 * single back-quote is found.
 *
 * When a part of the input is escaped it is replaced by a string `__ESCAPED_${ID}` where ID is a unique ID,
 * the function returned the escaped text as well as a dict that gathers the escaped elements.
 */
export function removeEscapedText(src: string): {
    escapedContent: string
    replaced: Record<string, string>
} {
    let escapedContent = src // Initialize the escaped content with the source text
    const replaced = {} // Initialize an object to store the replaced escaped elements

    // Regular expression patterns to match escaped parts
    const tripleBackquotePattern = /```([\s\S]*?)```/g

    // Replace triple back-quote escaped parts
    escapedContent = escapedContent.replace(tripleBackquotePattern, (match) => {
        const id = `__ESCAPED_${String(Object.keys(replaced).length)}` // Generate a unique ID
        replaced[id] = match // Store the escaped part in the replaced object
        return id // Replace the escaped part with the unique ID
    })

    // Regular expression pattern to match single back-quoted escaped parts spanning multiple lines
    const multilineBackquotePattern = /`([\s\S]*?)`/g

    // Replace single back-quote escaped parts
    escapedContent = escapedContent.replace(
        multilineBackquotePattern,
        (match) => {
            const id = `__ESCAPED_${String(Object.keys(replaced).length)}` // Generate a unique ID
            replaced[id] = match // Store the escaped part in the replaced object
            return id // Replace the escaped part with the unique ID
        },
    )

    return { escapedContent, replaced }
}
function fixedMarkedParseCustomViews({
    input,
    views,
}: {
    input: string
    views: Record<string, ViewGenerator>
}) {
    /**
     * The library 'marked' parse the innerHTML of HTML elements as markdown,
     * while their innerHTML should be preserved for custom views.
     * The purpose of this function is to fix this behavior.
     */
    const divPatched = document.createElement('div')
    const { patchedInput, contents } = patchSrc({ src: input, views })

    const divResult = document.createElement('div')
    divResult.classList.add('mkdocs-markdown')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    setOptions({
        langPrefix: 'hljs language-',
        highlight: function (code: string, lang: string) {
            return highlight.highlightAuto(code, [lang]).value
        },
        // deprecated since v0.3.0, removed in v8.0.0,
        // see https://marked.js.org/using_advanced
        headerPrefix: headingPrefixId,
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
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

export function replaceLinks({
    router,
    elem,
    fromMarkdown,
}: {
    router: Router
    elem: HTMLElement
    fromMarkdown: boolean
}) {
    const links = elem.querySelectorAll('a')
    links.forEach((link) => {
        if (link.href.includes('@nav')) {
            const path = `nav=${link.href.split('@nav')[1]}`
            link.href = `${router.basePath}?${path}`
            link.onclick = (e: MouseEvent) => {
                e.preventDefault()
                router.fireNavigateTo(path)
            }
            if (fromMarkdown && link.title) {
                // When the anchor is generated from markdown, the title is used to append classes to the generated
                // element.
                const metadata_json = JSON.parse(
                    link.title,
                ) as unknown as Record<string, string | undefined>
                link.title = ''
                const classes = metadata_json.class?.split(' ') ?? []
                link.classList.add(...classes)
            }
        }
    })
}
