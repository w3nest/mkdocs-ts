/**
 * This file gathers views related to table of content.
 */

import {
    AnyVirtualDOM,
    attr$,
    child$,
    ChildrenLike,
    CSSAttribute,
    replace$,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'
import { isResolvedTarget, Router } from '../router'
import {
    BehaviorSubject,
    debounceTime,
    filter,
    from,
    mergeMap,
    Observable,
    Subject,
    switchMap,
    timer,
    combineLatest,
} from 'rxjs'
import { DisplayMode, DisplayOptions } from './default-layout.view'

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

const debounceTimeToc = 200
/**
 * The table of content view.
 */
export class TOCView implements VirtualDOM<'div'> {
    static readonly CssSelector = 'mkdocs-TOCView'
    public readonly router: Router
    public readonly html: HTMLElement
    public readonly tag = 'div'
    public readonly class = `${TOCView.CssSelector} h-100 border-primary border-start rounded px-3 d-flex flex-column`
    public readonly children: ChildrenLike

    public readonly style: CSSAttribute

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
                    addedNodes
                        .filter((node) => node instanceof HTMLElement)
                        .find((node) => node.tagName.startsWith('H')) !==
                    undefined
                )
            }),
            debounceTime(debounceTimeToc),
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
        if (this.router.scrollableElement) {
            this.router.scrollableElement.onscroll = () => {
                this.getFirstVisible(headings$.value)
            }
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
                class: 'px-0 py-2 flex-grow-1 mkdocs-thin-v-scroller',
                connectedCallback: (elem: RxHTMLElement<'ul'>) => {
                    elem.ownSubscriptions(
                        this.indexFirstVisibleHeading$
                            .pipe(debounceTime(debounceTimeToc))
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
        const getText = (heading: HTMLElement) => {
            if (heading.innerText) {
                return heading.innerText
            }
            const firstTextElement = [...heading.children]
                .filter((c) => c instanceof HTMLElement)
                .find((c) => c.innerText !== '')
            return firstTextElement?.innerText ?? ''
        }
        const defaultConv = (heading: HTMLElement) => ({
            tag: 'div' as const,
            class: '',
            innerText: getText(heading),
        })
        const getItemClass = (firstIndex: number): string => {
            if (index === firstIndex) {
                return 'fw-bolder'
            }
            return index < firstIndex ? 'text-dark' : 'mkdocs-text-1'
        }
        this.style = ['H1', 'H2', 'H3', 'H4', 'H5'].includes(heading.tagName)
            ? {
                  paddingLeft:
                      headingsPadding[heading.tagName as SupportedHeading],
              }
            : {}
        this.class = `mkdocs-TocItemView ${heading.classList.value} pe-1`
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
                }?nav=${router.parseUrl().path}.${heading.id}`,
                children: [(domConvertor ?? defaultConv)(heading)],
                onclick: (ev) => {
                    ev.preventDefault()
                    router.scrollTo(heading)
                },
            },
        ]
    }
}

interface TocTrait {
    layout: {
        toc: ({
            router,
            html,
        }: {
            html: HTMLElement
            router: Router
        }) => Promise<AnyVirtualDOM>
    }
}
function hasTocViewTrait(node: unknown): node is TocTrait {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return (node as TocTrait)?.layout?.toc !== undefined
}

export class TocWrapperView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class =
        'mkdocs-TocWrapperView w-100 h-100 d-flex flex-grow-1 py-1'

    public readonly children: ChildrenLike

    public readonly displayMode$: BehaviorSubject<DisplayMode>
    public readonly router: Router
    public readonly displayOptions: DisplayOptions
    public readonly content$: Observable<HTMLElement>

    constructor(params: {
        router: Router
        displayMode$: BehaviorSubject<DisplayMode>
        displayOptions: DisplayOptions
        content$: Observable<HTMLElement>
    }) {
        Object.assign(this, params)
        const toc: AnyVirtualDOM = {
            tag: 'div',
            class: 'h-100',
            style: attr$({
                source$: this.displayMode$,
                vdomMap: (mode) => {
                    const padding =
                        mode === 'pined'
                            ? this.displayOptions.pageVertPadding
                            : '0px'
                    return {
                        minWidth: `${String(this.displayOptions.tocMinWidth)}px`,
                        paddingTop: padding,
                        paddingBottom: padding,
                    }
                },
            }),
            children: [
                child$({
                    source$: combineLatest([
                        this.router.target$.pipe(
                            filter((t) => isResolvedTarget(t)),
                        ),
                        this.content$,
                    ]).pipe(
                        mergeMap(([target, elem]) => {
                            if (!hasTocViewTrait(target.node)) {
                                return from(
                                    tocView({
                                        html: elem,
                                        router: this.router,
                                    }),
                                )
                            }
                            return from(
                                target.node.layout.toc({
                                    html: elem,
                                    router: this.router,
                                }),
                            )
                        }),
                    ),
                    vdomMap: (toc?): AnyVirtualDOM => {
                        return toc ?? { tag: 'div' }
                    },
                }),
            ],
        }
        this.children = [
            {
                tag: 'div',
                class: 'h-100',
                children: [toc],
            },
        ]
    }
}

export function tocView({
    html,
    router,
    domConvertor,
}: {
    html: HTMLElement
    router: Router
    domConvertor?: (e: HTMLHeadingElement) => AnyVirtualDOM
}): Promise<TOCView> {
    return Promise.resolve(new TOCView({ router: router, html, domConvertor }))
}
