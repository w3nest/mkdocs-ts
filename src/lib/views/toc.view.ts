import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { Router } from '../router'
import { BehaviorSubject } from 'rxjs'

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

    public readonly indexFirstVisibleHeading$ = new BehaviorSubject<number>(0)
    constructor(params: {
        html: HTMLElement
        router: Router
        domConvertor?: (e: HTMLHeadingElement) => AnyVirtualDOM
    }) {
        Object.assign(this, params)
        const headings: NodeListOf<HTMLElement> =
            this.html.querySelectorAll('h1, h2, h3, h4')
        const defaultConv = (heading: HTMLElement) => ({
            tag: 'div' as const,
            class: 'fv-hover-text-focus',
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
        this.router.scrollableElement.onscroll = () => {
            this.getFirstVisible(headingsArray)
        }

        this.children = [
            headingsArray.length > 0
                ? {
                      tag: 'div',
                      innerText: 'Table of content',
                      style: {
                          fontWeight: 'bolder',
                      },
                  }
                : undefined,
            {
                tag: 'ul',
                class: 'p-0',
                children: headingsArray.map(
                    (heading: HTMLHeadingElement, index: number) => {
                        const getItemClass = (firstIndex: number) => {
                            if (index == firstIndex) {
                                return 'fv-text-focus font-weight-bold'
                            }
                            return index < firstIndex
                                ? 'text-dark'
                                : 'fv-text-disabled'
                        }
                        return {
                            tag: 'li' as const,
                            class: heading.classList.value,
                            style: { paddingLeft: padding[heading.tagName] },
                            children: [
                                {
                                    tag: 'a' as const,
                                    class: {
                                        source$: this.indexFirstVisibleHeading$,
                                        vdomMap: getItemClass,
                                        wrapper: (d) =>
                                            `fv-hover-text-focus ${d} `,
                                    },
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
                    },
                ),
            },
        ]
    }
    getFirstVisible(headings: HTMLElement[]) {
        for (let i = 0; i < headings.length; i++) {
            const rect = headings[i].getBoundingClientRect()

            if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
                this.indexFirstVisibleHeading$.next(i)
                return
            }
        }
    }
}

export async function tocView({
    html,
    router,
    domConvertor,
}: {
    html: HTMLElement
    router: Router
    domConvertor?: (e: HTMLHeadingElement) => AnyVirtualDOM
}) {
    return new TOCView({ router: router, html, domConvertor })
}
