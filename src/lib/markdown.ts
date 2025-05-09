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
import { parseUrl } from './browser.interface'
import {
    ApiLink,
    CrossLink,
    ExtLink,
    GitHubLink,
} from './md-widgets/links.view'

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
 * Configuration options for parsing Markdown content, using *e.g.* {@link parseMd}.
 */
export interface MdParsingOptions {
    /**
     * Defines placeholders for preprocessing. Any occurrence of a key in the source
     * will be replaced with its corresponding value.
     */
    placeholders?: Record<string, string>
    /**
     * Preprocessing callback to transform the source before parsing.
     * @param text The original Markdown content.
     * @returns The transformed content.
     */
    preprocessing?: (text: string) => string
    /**
     * Custom view generators for specific HTML elements referenced in the Markdown source.
     * These allow dynamically replacing custom DOM elements with JavaScript-generated content.
     *
     * **Example**:
     *
     * <js-cell>
     * const { rxjs, MkDocs } = await webpm.install({esm:[
     *     'mkdocs-ts#{{mkdocs-version}} as MkDocs',
     *     'rxjs#^7.5.6 as rxjs']
     * })
     * const clockView = (elem) => {
     *     // elem is the corresponding DOM element included in the MD source.
     *     // use `elem.getAttribute` or `elem.textContent` to retrieve inputs.
     *     const period = parseInt(elem.getAttribute('period') ?? '1000')
     *     return {
     *         tag: 'div',
     *         innerText: {
     *             source$: rxjs.timer(period, 0),
     *             vdomMap: () => new Date().toLocaleTimeString()
     *         }
     *     }
     * }
     * const parsed = MkDocs.parseMd({
     *     src:`
     * **The custom view**:
     * <clock period='1000'></clock>
     * `,
     *     views: {
     *         'clock': clockView
     *     }
     * })
     * display(parsed)
     * </js-cell>
     *
     * <note level="hint">
     *  Custom views specified here are in addition to globally registered ones in {@link GlobalMarkdownViews}.
     * </note>
     */
    views?: Record<string, ViewGenerator>

    /**
     * Enables LaTeX equation parsing. Requires `MathJax` to be loaded before parsing.
     *
     * **Example**
     *
     * <js-cell>
     * const { MkDocs } = await webpm.install({esm: [
     *     'mkdocs-ts#{{mkdocs-version}} as MkDocs',
     *     'mathjax#^3.1.4'
     * ]})
     * const parsed = MkDocs.parseMd({
     *     src:`
     * This is a latex equation:
     * $$
     * E = mc^2
     * $$
     * `,
     *     latex: true
     * })
     * display(parsed)
     * </js-cell>
     *
     * <note level='warning' text='Delimiters'>
     * `MathJax` is configured by default using
     * - Block equations: `$$ ... $$`
     * - Inline equations: `\( ... \)`
     *
     *  Since Markdown escape backslashes, inline equations should be written as `\\(` and `\\)`.
     *  If Markdown is inside JavaScript (which also escapes backslashes), it becomes `\\\\(` and `\\\\)`.
     *
     *  To use `$` for inline equations instead, configure MathJax **before** loading it:
     *
     * <code-snippet language='javascript'>
     * window.MathJax = {
     *     tex: { inlineMath: [ ['$', '$'] ],
     *     },
     * }
     * </code-snippet>
     *
     * More details
     * <a target='_blank' href='https://docs.mathjax.org/en/latest/input/tex/delimiters.html'>here </a>.
     *
     * </note>
     */
    latex?: boolean

    /**
     * Callback triggered when the view has been added to the DOM.
     *
     * @param elem The rendered element.
     */
    onRendered?: (elem: HTMLElement) => void
}
/**
 * Provides a collection of global Markdown views that can be referenced when using {@link parseMd}.
 *
 * Custom views are defined as functions with the following structure:
 * - **Arguments**:
 *   - `elem`: The HTML element as declared in the Markdown file. You can access its raw text content using
 *     `elem.textContent` and its attributes using `elem.getAttribute`.
 *   - `options`: An instance of {@link MdParsingOptions}, providing additional context for parsing.
 * - **Returns**: A {@link ViewGenerator} that implements the corresponding behavior for the HTML element.
 *
 * These views enable dynamic, reusable components to be seamlessly integrated into Markdown content.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GlobalMarkdownViews {
    /**
     * A static factory object containing pre-defined Markdown inline views.
     *
     * See {@link MdWidgets} regarding implementations.
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
        /**
         * Transforms a `<ext-link target='...'></ext-link>`  element into {@link ExtLink}.
         */
        'ext-link': (elem: HTMLElement) => ExtLink.fromHTMLElement(elem),
        /**
         * Transforms a `<cross-link target='...'></cross-link>`  element into {@link CrossLink}.
         */
        'cross-link': (elem: HTMLElement) => CrossLink.fromHTMLElement(elem),
        /**
         * Transforms a `<api-link target='...'></api-link>`  element into {@link ApiLink}.
         */
        'api-link': (elem: HTMLElement) => ApiLink.fromHTMLElement(elem),
        /**
         * Transforms a `<github-link target='...'></github-link>`  element into {@link GitHubLink}.
         */
        'github-link': (elem: HTMLElement) => GitHubLink.fromHTMLElement(elem),
    }
}

export type FetchMdInput = {
    url: string
} & MdParsingOptions

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
 * Just like {@link parseMd}, but the source is first fetched using an HTTP get request using the provided URL.
 *
 * @param params The {@link MdParsingOptions} completed by:
 * @param params.url The URL from which the source content is fetched.
 * @param params.router Optional router instance,  to enable navigation related feature.
 */
export async function parseMdFromUrl(
    params: {
        url: string
        router?: Router
    } & MdParsingOptions,
) {
    const resp = await fetch(params.url)
    return parseMd({
        src: await resp.text(),
        router: params.router,
        ...params,
    })
}
/**
 * Parse Markdown source to generate corresponding view. See {@link MdParsingOptions} for examples.
 *
 * @param args  The {@link MdParsingOptions} completed by:
 * @param args.src Markdown source.
 * @param args.router Optional router instance, to enable navigation related feature.
 * @returns A virtual DOM encapsulating the parsed Markdown.
 */
export function parseMd({
    src,
    router,
    views,
    placeholders,
    preprocessing,
    latex,
    onRendered,
}: {
    src: string
    router?: Router
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
        onRendered,
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
            if (onRendered) {
                onRendered(elem)
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
    const contents: Record<string, string> = {}

    function addNewlineAfterTokens(input: string, tokens: string[]): string {
        // Create a regex pattern matching any token inside </token>
        const pattern = new RegExp(`</(${tokens.join('|')})>`, 'g')

        // Replace each occurrence with '</token>\n'
        return input.replace(pattern, '</$1>__FAKE_NEW_LINE__\n')
    }
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

    src = addNewlineAfterTokens(src, Object.keys(views))

    const lines = src.split('\n')

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
            contents[id] = acc.replace(/__FAKE_NEW_LINE__\n/g, '')
            // noinspection BreakStatementJS
            break
        }
    }
    return {
        // remove the last '\n'
        patchedInput: patchedSrc.replace(/__FAKE_NEW_LINE__\n/g, '').trim(),
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

/**
 * This function scans all anchor (`<a>`) elements inside `elem` with `href` starting with `@nav` marker and
 * transforms them with an anchor element that properly triggers a navigation event to the path defined
 * after the `@nav` marker.
 *
 * The processed anchors typically have the form `<a href='@nav/path/to/link'>link</a>`.
 * The transformation is basically executing:
 * <code-snippet language="javascript">
 * if (link.href.includes('@nav')) {
 *     const path = `nav=${link.href.split('@nav')[1]}`
 *     link.href = `${router.basePath}?${path}`
 *     link.onclick = (e: MouseEvent) => {
 *         e.preventDefault()
 *         router.fireNavigateTo(path)
 *     }
 * }
 * </code-snippet>
 *
 * If `fromMarkdown` is `true`, it processes metadata stored in the `title` attribute (e.g., additional CSS classes)
 * for links that were generated from Markdown content.
 *
 * @param _p
 * @param _p.router The router instance used for navigation.
 * @param _p.elem The HTML element containing links to be processed.
 * @param _p.fromMarkdown - Whether the links originate from Markdown content.
 *
 */
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
                const target = parseUrl(path)
                router.fireNavigateTo({ ...target, issuer: 'link' })
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
