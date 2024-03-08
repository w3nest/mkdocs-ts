import { parse, setOptions } from 'marked'
import highlight from 'highlight.js'
import { AnyVirtualDOM, render, VirtualDOM } from '@youwol/rx-vdom'
import * as webpm from '@youwol/webpm-client'
import { from } from 'rxjs'
import { Router } from './router'
import { CodeLanguage, CodeSnippetView } from './md-widgets/code-snippet.view'

export class GlobalMarkdownViews {
    /**
     * Static factory for markdown inlined views.
     */
    static factory: { [k: string]: (e: Element) => AnyVirtualDOM } = {
        'code-snippet': (elem: HTMLElement) => {
            return new CodeSnippetView({
                language: elem.getAttribute('language') as CodeLanguage,
                highlightedLines: elem.getAttribute('highlightedLines'),
                content: elem.innerHTML,
            })
        },
    }
}

export function fromMarkdown({
    url,
    placeholders,
    preprocessing,
}: {
    url: string
    placeholders?: { [k: string]: string }
    preprocessing?: (text: string) => string
}) {
    setOptions({
        langPrefix: 'hljs language-',
        highlight: function (code, lang) {
            return highlight.highlightAuto(code, [lang]).value
        },
    })

    return ({ router }: { router: Router }) => {
        return fromMarkdownImpl({ url, router, placeholders, preprocessing })
    }
}
export async function fromMarkdownImpl({
    url,
    router,
    placeholders,
    preprocessing,
}: {
    url: string
    router: Router
    placeholders?: { [k: string]: string }
    preprocessing?: (text: string) => string
}) {
    const srcRaw = await fetch(url).then((resp) => resp.text())
    const src = preprocessing?.(srcRaw) || srcRaw

    if (!placeholders) {
        return parseMd({ src, router })
    }
    const regex = new RegExp(Object.keys(placeholders || {}).join('|'), 'g')

    // Replace patterns with corresponding values
    const replacedText = src.replace(regex, (match) => placeholders[match])

    return parseMd({ src: replacedText, router })
}

export function parseMd({
    src,
    router,
    navigations,
    views,
    emitHtmlUpdated,
}: {
    src: string
    router: Router
    navigations?: { [k: string]: (e: HTMLAnchorElement) => void }
    views?: { [k: string]: (e: Element) => AnyVirtualDOM }
    emitHtmlUpdated?: boolean
}): VirtualDOM<'div'> {
    views = { ...views, ...GlobalMarkdownViews.factory }
    const div = fixedMarkedParseCustomViews({ input: src, views })

    // Custom views
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
        if (link.href.includes('@nav')) {
            const path = link.href.split('@nav')[1]
            link.href = `/applications/py-youwol-doc/latest?nav=${path}`
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
    Object.entries(views || {}).forEach(([k, v]) => {
        const elems = div.querySelectorAll(k)
        elems.forEach((elem) => {
            elem.parentNode.replaceChild(render(v(elem)), elem)
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
