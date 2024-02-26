import {
    AnyVirtualDOM,
    ChildrenLike,
    CSSAttribute,
    RxHTMLElement,
    VirtualDOM,
} from '@youwol/rx-vdom'
import { Router } from '../router'
import { BehaviorSubject, Observable } from 'rxjs'
import { DefaultLayoutView } from './default-layout.view'

type H1 = 'H1'
type H2 = 'H2'
type H3 = 'H3'
type H4 = 'H4'
type H5 = 'H5'
type SupportedHeading = H1 | H2 | H3 | H4 | H5
const supportedHeadingTags: [H1, H2, H3, H4, H5] = [
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
]

const headingsPadding: Record<SupportedHeading, string> = {
    H1: '0em',
    H2: '1em',
    H3: '2em',
    H4: '3em',
    H5: '4em',
}

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

    public readonly connectedCallback: (elem: RxHTMLElement<'div'>) => void

    constructor(params: {
        html: HTMLElement
        router: Router
        domConvertor?: (e: HTMLHeadingElement) => AnyVirtualDOM
    }) {
        Object.assign(this, params)
        const queryHeadings = supportedHeadingTags
            .reduce((acc, e) => `${acc},${e}`, '')
            .toLowerCase()
            .slice(1)
        const headingsArray = (): HTMLElement[] =>
            Array.from(this.html.querySelectorAll(queryHeadings))
        const headings$ = new BehaviorSubject<HTMLElement[]>(headingsArray())

        this.connectedCallback = (elem) => {
            elem.ownSubscriptions(
                this.router.htmlUpdated$.subscribe(() => {
                    headings$.next(headingsArray())
                }),
            )
        }

        this.router.scrollableElement.onscroll = () => {
            this.getFirstVisible(headings$.value)
        }

        this.children = [
            headingsArray.length > 0 &&
            DefaultLayoutView.displayModeToc.value === 'Full'
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
                class: 'p-0 h-100 scrollbar-on-hover ',
                connectedCallback: (elem: RxHTMLElement<'ul'>) => {
                    const headings = [...elem.querySelectorAll('li')]
                    elem.ownSubscriptions(
                        this.indexFirstVisibleHeading$.subscribe((index) => {
                            const br = elem.getBoundingClientRect()
                            const offset = headings[index]?.['offsetTop'] || 0
                            elem.scrollTo({
                                top: offset + br.top - br.height / 4,
                                left: 0,
                                behavior: 'smooth',
                            })
                        }),
                    )
                },
                children: {
                    policy: 'replace',
                    source$: headings$,
                    vdomMap: (headingsArray: HTMLElement[]) => {
                        return headingsArray.map(
                            (heading: HTMLHeadingElement, index: number) => {
                                return new TocItemView({
                                    heading,
                                    index,
                                    indexFirstVisibleHeading$:
                                        this.indexFirstVisibleHeading$,
                                    router: this.router,
                                    domConvertor: params.domConvertor,
                                })
                            },
                        )
                    },
                },
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

class TocItemView implements VirtualDOM<'li'> {
    public readonly tag = 'li'
    public readonly class: string
    public readonly style: CSSAttribute
    public readonly children: ChildrenLike

    constructor({
        heading,
        index,
        indexFirstVisibleHeading$,
        router,
        domConvertor,
    }: {
        heading: HTMLHeadingElement
        index: number
        indexFirstVisibleHeading$: Observable<number>
        router: Router
        domConvertor?: (e: HTMLHeadingElement) => AnyVirtualDOM
    }) {
        const defaultConv = (heading: HTMLElement) => ({
            tag: 'div' as const,
            class: 'fv-hover-text-focus',
            innerText: heading.innerText
                ? heading.innerText
                : heading.firstChild['innerText'],
        })
        const getItemClass = (firstIndex: number) => {
            if (index == firstIndex) {
                return 'fv-text-focus font-weight-bold'
            }
            return index < firstIndex ? 'text-dark' : 'fv-text-disabled'
        }
        this.style = { paddingLeft: headingsPadding[heading.tagName] }
        this.class = heading.classList.value
        this.children = [
            {
                tag: 'a' as const,
                class: {
                    source$: indexFirstVisibleHeading$,
                    vdomMap: getItemClass,
                    wrapper: (d) => `fv-hover-text-focus ${d} `,
                },
                href: `${
                    router.basePath
                }?nav=${router.getCurrentPath()}.${heading.id}`,
                children: [(domConvertor || defaultConv)(heading)],
                onclick: (ev) => {
                    ev.preventDefault()
                    router.scrollTo(heading)
                },
            },
        ]
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
