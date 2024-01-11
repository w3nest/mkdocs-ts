import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { Router } from '../router'

export class TOCView implements VirtualDOM<'div'> {
    public readonly router: Router
    public readonly html: HTMLElement
    public readonly tag = 'div'
    public readonly class = 'h-100'
    public readonly children: ChildrenLike
    public readonly style = {
        fontSize: '0.9rem',
        lineHeight: '1.5rem',
    }
    constructor(params: {
        html: HTMLElement
        router: Router
        domConvertor?: (e: HTMLHeadingElement) => AnyVirtualDOM
    }) {
        Object.assign(this, params)
        const headings = this.html.querySelectorAll('h1, h2, h3')
        const defaultConv = (heading: HTMLElement) => ({
            tag: 'div' as const,
            innerText: heading.innerText
                ? heading.innerText
                : heading.firstChild['innerText'],
        })

        const headingsArray = Array.from(headings)
        const padding = {
            H1: '0em',
            H2: '1em',
            H3: '2em',
        }
        this.children = [
            {
                tag: 'ul',
                children: headingsArray.map((heading: HTMLHeadingElement) => {
                    return {
                        tag: 'li' as const,
                        class: heading.classList.value,
                        style: { paddingLeft: padding[heading.tagName] },
                        children: [
                            {
                                tag: 'a' as const,
                                href: `${
                                    this.router.basePath
                                }?nav=${this.router.getCurrentPath()}.${
                                    heading.id
                                }`,
                                children: [
                                    (params.domConvertor || defaultConv)(
                                        heading,
                                    ),
                                ],
                                onclick: (ev) => {
                                    ev.preventDefault()
                                    this.router.scrollTo(heading)
                                },
                            },
                        ],
                    }
                }),
            },
        ]
    }
}

export async function tocView({
    html,
    appState,
    domConvertor,
}: {
    html: HTMLElement
    appState: Router
    domConvertor?: (e: HTMLHeadingElement) => AnyVirtualDOM
}) {
    return new TOCView({ router: appState, html, domConvertor })
}
