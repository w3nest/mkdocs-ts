import { parse, setOptions } from 'marked'
import highlight from 'highlight.js'
import { AnyVirtualDOM, render, VirtualDOM } from '@youwol/rx-vdom'
import * as webpm from '@youwol/webpm-client'
import { from } from 'rxjs'
import { Router } from './router'

export function fromMarkdown({ url }: { url: string }) {
    setOptions({
        langPrefix: 'hljs language-',
        highlight: function (code, lang) {
            return highlight.highlightAuto(code, [lang]).value
        },
    })

    return ({ router }: { router: Router }) => {
        return fromMarkdownImpl({ url, router })
    }
}
export async function fromMarkdownImpl({
    url,
    router,
}: {
    url: string
    router: Router
}) {
    const src = await fetch(url).then((resp) => resp.text())
    const div = document.createElement('div')
    div.innerHTML = parse(src)

    return parseMd({ src, router })
}

export function parseMd({
    src,
    router,
    navigations,
}: {
    src: string
    router: Router
    navigations?: { [k: string]: (e: HTMLAnchorElement) => void }
}): VirtualDOM<'div'> {
    const div = document.createElement('div')
    div.innerHTML = parse(src)

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
    return { tag: 'div', children: [div] }
}
