/**
 * This file gathers views related to table of content.
 */

import {
    AnyVirtualDOM,
    attr$,
    ChildrenLike,
    CSSAttribute,
    replace$,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'
import { Router } from '../router'
import {
    BehaviorSubject,
    debounceTime,
    filter,
    Observable,
    Subject,
    switchMap,
    timer,
} from 'rxjs'

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
    H1: '0.5em',
    H2: '1.5em',
    H3: '2.5em',
    H4: '3.5em',
    H5: '4.5em',
}

/**
 * The table of content view when the screen is large enough to display it, otherwise see {@link ModalTocView}
 */
export class TOCView implements VirtualDOM<'div'> {
    public readonly router: Router
    public readonly html: HTMLElement
    public readonly tag = 'div'
    public readonly class = 'mkdocs-TOCView h-100 border-primary border-start'
    public readonly children: ChildrenLike

    public readonly indexFirstVisibleHeading$ = new BehaviorSubject<number>(0)
    public readonly connectedCallback: (elem: RxHTMLElement<'div'>) => void
    public readonly disconnectedCallback: (elem: RxHTMLElement<'div'>) => void

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

        const allMutations$ = new Subject<MutationRecord[]>()

        const observer = new MutationObserver((mutationsList) => {
            allMutations$.next(mutationsList)
        })

        const headingsMutation$ = allMutations$.pipe(
            filter((mutationsList) => {
                const addedNodes: Node[] = mutationsList
                    .map((mut) =>
                        mut.type === 'childList'
                            ? [...mut.addedNodes, ...mut.removedNodes]
                            : [],
                    )
                    .flat()
                return (
                    addedNodes.find(
                        (node) =>
                            node['tagName'] && node['tagName'].startsWith('H'),
                    ) !== undefined
                )
            }),
            debounceTime(200),
        )

        this.connectedCallback = (elem) => {
            timer(1000, -1).subscribe(() => {
                headings$.next(headingsArray())
            })
            observer.observe(this.html, { childList: true, subtree: true })
            elem.ownSubscriptions(
                this.router.htmlUpdated$.subscribe(() => {
                    headings$.next(headingsArray())
                }),
            )
            elem.ownSubscriptions(
                timer(1000, -1)
                    .pipe(switchMap(() => headingsMutation$))
                    .subscribe(() => {
                        headings$.next(headingsArray())
                    }),
            )
        }
        this.disconnectedCallback = () => {
            observer.disconnect()
        }
        this.router.scrollableElement.onscroll = () => {
            this.getFirstVisible(headings$.value)
        }

        this.children = [
            {
                tag: 'div',
                innerText: 'On this page',
                class: 'border-bottom mb-2',
                style: {
                    fontWeight: 'bolder',
                    fontSize: 'larger',
                },
            },
            {
                tag: 'ul',
                class: 'p-0 h-100 mkdocs-thin-v-scroller',
                connectedCallback: (elem: RxHTMLElement<'ul'>) => {
                    elem.ownSubscriptions(
                        this.indexFirstVisibleHeading$
                            .pipe(debounceTime(200))
                            .subscribe((index) => {
                                const headings = [
                                    ...elem.querySelectorAll('li'),
                                ]
                                const br = elem.getBoundingClientRect()
                                const offset = headings[index]?.offsetTop || 0
                                elem.scrollTo({
                                    top: offset - br.top,
                                    left: 0,
                                    behavior: 'smooth',
                                })
                            }),
                    )
                },
                children: replace$({
                    policy: 'replace',
                    source$: headings$,
                    vdomMap: (headingsArray) => {
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
                }),
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
            class: '',
            innerText: heading.innerText
                ? heading.innerText
                : heading.firstChild['innerText'],
        })
        const getItemClass = (firstIndex: number): string => {
            if (index == firstIndex) {
                return 'fw-bolder'
            }
            return index < firstIndex ? 'text-dark' : 'mkdocs-text-1'
        }
        this.style = { paddingLeft: headingsPadding[heading.tagName] }
        this.class = `mkdocs-TocItemView ${heading.classList.value} `
        this.children = [
            {
                tag: 'a' as const,
                style: {
                    textDecoration: 'none',
                },
                class: attr$({
                    source$: indexFirstVisibleHeading$,
                    vdomMap: getItemClass,
                    wrapper: (d) => `${d} `,
                }),
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
