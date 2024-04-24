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

/**
 * Type definition for custom view generators.
 */
export type viewGenerator = (e: HTMLElement) => AnyVirtualDOM

/**
 * Options for parsing Markdown content.
 */
export type ParsingArguments = {
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
     *  Custom views referenced in the source. See details in the documentation of {@link parseMd} to register views.
     */
    views?: { [k: string]: viewGenerator }
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
    static factory: { [k: string]: viewGenerator } = {
        'code-snippet': (elem: HTMLElement) => {
            return new CodeSnippetView({
                language: elem.getAttribute('language') as CodeLanguage,
                highlightedLines: elem.getAttribute('highlightedLines'),
                content: elem.textContent,
            })
        },
    }
}

/**
 * Fetch & parse a Markdown file from specified with a URL.
 *
 * @param params see {@link ParsingArguments} for additional options.
 * @param params.url The URL of the file.
 */
export function fetchMarkdown(
    params: {
        url: string
    } & ParsingArguments,
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

export async function fromMarkdownImpl({
    url,
    router,
    placeholders,
    preprocessing,
    views,
}: {
    url: string
    router: Router
    placeholders?: { [k: string]: string }
    preprocessing?: (text: string) => string
    views?: { [k: string]: viewGenerator }
}): Promise<VirtualDOM<'div'>> {
    const src = await fetch(url).then((resp) => resp.text())

    return parseMd({ src, router, views, placeholders, preprocessing })
}

/**
 * Parse a Markdown file specified with a URL.
 *
 * Note that custom views provided using the attribute `views ̀ comes in addition to those registered globally in
 * {@link GlobalMarkdownViews}.
 *
 * @param args see {@link ParsingArguments} for additional options.
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
}: {
    src: string
    router?: Router
    navigations?: { [k: string]: (e: HTMLAnchorElement) => void }
} & ParsingArguments): VirtualDOM<'div'> {
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
    const div = fixedMarkedParseCustomViews({ input: src, views: views })

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
    Object.entries(views || {}).forEach(([k, v]) => {
        const elems = div.querySelectorAll(k)
        elems.forEach((elem) => {
            elem.parentNode.replaceChild(render(v(elem as HTMLElement)), elem)
        })
    })
    return {
        tag: 'div',
        children: [div],
        connectedCallback: () => emitHtmlUpdated && router.emitHtmlUpdated(),
    }
}

function fixedMarkedParseCustomViews({
    input,
    views,
}: {
    input: string
    views: { [k: string]: (e: Element) => AnyVirtualDOM }
}) {
    /**
     * The library 'marked' parse the innerHTML of HTML elements as markdown,
     * while their innerHTML should be preserved for custom views.
     * The purpose of this function is to fix this behavior.
     */
    const divPatched = document.createElement('div')
    divPatched.innerHTML = input
    const replacedElements = []
    Array.from(divPatched.children).forEach((child) => {
        const view_keys_lower = Object.keys(views).map((k) => k.toLowerCase())
        if (!view_keys_lower.includes(child.tagName.toLowerCase())) {
            return
        }
        const attributes = Array.from(child.attributes).reduce(
            (acc, it) => ({ ...acc, [it.name]: it.value }),
            {},
        )
        const generatedId = `id_${Math.floor(Math.random() * 1e6)}`
        replacedElements.push({
            tag: child.tagName,
            id: child.id,
            generatedId,
            innerHTML: child.innerHTML,
            attributes,
        })
        child.id = generatedId
        child.innerHTML = ''
    })

    const divResult = document.createElement('div')
    divResult.innerHTML = parse(divPatched.innerHTML)
    replacedElements.forEach((detail) => {
        const elem = divResult.querySelector(`#${detail.generatedId}`)
        if (!elem) {
            console.error('Can not replace HTML element', {
                text: divPatched.innerHTML,
                element: detail,
            })
            return
        }
        elem.innerHTML = detail.innerHTML
        elem.id = detail.id
    })

    return divResult
}
