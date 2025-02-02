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
    of,
    take,
    map,
} from 'rxjs'
import {
    ClientTocView,
    DisabledTocMarker,
    DisplayMode,
    DisplayOptions,
} from './default-layout.view'

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

function isWithinDepth(
    element: HTMLElement,
    parent: HTMLElement,
    maxDepth: number,
    depth = 0,
): boolean {
    if (!element.parentElement || depth > maxDepth) return false
    if (element.parentElement === parent) return true
    return isWithinDepth(element.parentElement, parent, maxDepth, depth + 1)
}
/**
 * Represents the default Table of Contents (TOC) view for a documentation page, presenting the headings list.
 * It dynamically observes the document structure and updates itself in response to content changes w/ headings.
 *
 * To customize the {@link TocItemView} displayed, the function {@link tocView} can be used to provide
 * {@link NavLayout}'s `toc` view generator.
 * Within the default {@link Layout}, this view is embedded within {@link TocWrapperView}.
 *
 */
export class TOCView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-TOCView'
    public readonly router: Router
    public readonly html: HTMLElement
    public readonly tag = 'div'
    public readonly class = `${TOCView.CssSelector} h-100 border-primary border-start rounded px-3 d-flex flex-column`
    public readonly children: ChildrenLike

    public readonly style: CSSAttribute

    /**
     * The maximum heading depth considered for the TOC.
     * If set, headings beyond this depth are ignored.
     */
    public readonly maxHeadingDepth?: number = 2
    /**
     * An observable tracking the index of the first visible heading on the page.
     * This is updated dynamically as the user scrolls.
     */
    public readonly indexFirstVisibleHeading$ = new BehaviorSubject<number>(0)
    public readonly connectedCallback: (elem: RxHTMLElement<'div'>) => void
    public readonly disconnectedCallback: (elem: RxHTMLElement<'div'>) => void

    /**
     *
     * @param params
     * @param params.html The root HTML element of the page, returned by {@link NavLayout}'s `content`.
     * @param params.router The application's router instance.
     * @param params.domConvertor (Optional) A function to convert heading elements into TOC items.
     * See {@link TocItemView}.
     * @param params.maxHeadingsDepth (Optional) Maximum heading depth w/ root HTML element to be included in the TOC.
     */
    constructor(params: {
        html: HTMLElement
        router: Router
        domConvertor?: (e: HTMLHeadingElement) => AnyVirtualDOM
        maxHeadingsDepth?: number
    }) {
        Object.assign(this, params)
        const queryHeadings = supportedHeadingTags
            .reduce((acc, e) => `${acc},${e}`, '')
            .toLowerCase()
            .slice(1)
        const headingsArray = (): HTMLElement[] => {
            return Array.from(
                this.html.querySelectorAll<HTMLElement>(queryHeadings),
            ).filter((e) => {
                if (this.maxHeadingDepth === undefined) {
                    return true
                }
                const startContentDepth = 2
                const maxDepth = startContentDepth + this.maxHeadingDepth
                return isWithinDepth(e, params.html, maxDepth)
            })
        }

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
                tag: 'div',
                class: 'px-0 py-2 flex-grow-1 mkdocs-thin-v-scroller',
                connectedCallback: (elem: RxHTMLElement<'div'>) => {
                    elem.ownSubscriptions(
                        this.indexFirstVisibleHeading$
                            .pipe(debounceTime(debounceTimeToc))
                            .subscribe((index) => {
                                const headings = [
                                    ...elem.querySelectorAll<HTMLElement>(
                                        `.${TocItemView.CssSelector}`,
                                    ),
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

/**
 * Represents the view of an item in the {@link TOCView}.
 * It can be customized by providing a `domConvertor` function to the constructor.
 */
class TocItemView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-TocItemView'
    public readonly tag = 'div'
    public readonly class: string
    public readonly style: CSSAttribute
    public readonly children: ChildrenLike

    /**
     *
     * @param _p
     * @param _p.heading The heading.
     * @param _p.index Heading's index in the page.
     * @param _p.indexFirstVisibleHeading$ An observable tracking the index of the first visible heading on the page.
     * This is updated dynamically as the user scrolls.
     * @param _p.router The application's router instance.
     * @param _p.domConvertor (Optional) A function to convert heading elements into TOC items.
     */
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
        this.class = `${TocItemView.CssSelector} ${heading.classList.value} pe-1`
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
        toc: DisabledTocMarker | ClientTocView
    }
}
function hasTocViewTrait(node: unknown): node is TocTrait {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return (node as TocTrait)?.layout?.toc !== undefined
}

/**
 * Wrapper of TOC view within the default {@link Layout} , embedding either:
 * *  {@link TOCView} for {@link NavLayout} with no custom `toc` .
 * *  A custom view otherwise.
 *
 * It can be configured using the attribute {@link DisplayOptions.pageVertPadding} and
 * {@link DisplayOptions.tocMinWidth}.
 */
export class TocWrapperView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-TocWrapperView'
    public readonly tag = 'div'
    public readonly class = `${TocWrapperView.CssSelector} w-100 h-100 d-flex flex-grow-1 py-1`

    public readonly children: ChildrenLike

    public readonly displayMode$: BehaviorSubject<DisplayMode>
    public readonly router: Router
    public readonly displayOptions: DisplayOptions
    public readonly content$: Observable<HTMLElement>
    public readonly tocEnabled$: Observable<boolean>
    /**
     *
     * @param params
     * @param params.router The application's router instance.
     * @param params.displayMode$ The display mode for the TOC, depending on screen size.
     * @param params.displayOptions The display options, see {@link DisplayOptions.pageVertPadding} and
     * {@link DisplayOptions.tocMinWidth}
     * @param params.content$ The page content, emitting each time a new path of the navigation is hit.
     */
    constructor(params: {
        router: Router
        displayMode$: BehaviorSubject<DisplayMode>
        displayOptions: DisplayOptions
        content$: Observable<HTMLElement>
    }) {
        Object.assign(this, params)
        const target$ = this.router.target$.pipe(
            filter((t) => isResolvedTarget(t)),
        )
        this.tocEnabled$ = target$.pipe(
            map((target) => {
                if (
                    !target.node.layout ||
                    typeof target.node.layout !== 'object'
                ) {
                    return true
                }
                if (!('toc' in target.node.layout)) {
                    return true
                }
                return target.node.layout.toc !== 'disabled'
            }),
        )
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
                    source$: combineLatest([target$, this.content$]).pipe(
                        mergeMap(([target, elem]) => {
                            if (!hasTocViewTrait(target.node)) {
                                return from(
                                    tocView({
                                        html: elem,
                                        router: this.router,
                                    }),
                                )
                            }
                            if (target.node.layout.toc === 'disabled') {
                                return of(undefined)
                            }
                            const toc = target.node.layout.toc({
                                html: elem,
                                router: this.router,
                            })
                            if (!toc) {
                                return of(undefined)
                            }
                            if (toc instanceof Promise) {
                                return from(toc)
                            }
                            if (toc instanceof Observable) {
                                return toc.pipe(take(1))
                            }
                            if (toc instanceof HTMLElement) {
                                return of(toc)
                            }
                            if ('source$' in toc) {
                                return of(toc)
                            }
                            return of(toc)
                        }),
                    ),
                    vdomMap: (toc?): AnyVirtualDOM => {
                        if (!toc) {
                            return { tag: 'div' }
                        }
                        if (toc instanceof HTMLElement) {
                            return { tag: 'div', children: [toc] }
                        }
                        if ('source$' in toc) {
                            return { tag: 'div', children: [toc] }
                        }
                        return toc
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

/**
 * Helper to specify a `toc` view in {@link NavLayout} using the default {@link TOCView} with a custom `domConverter`
 * for rendering the {@link TocItemView}.
 *
 * <note level='example'>
 * <code-snippet language='javascript'>
 *
 * const domConvertor = (heading: HTMLHeadingElement) => ({
 *     tag: 'div',
 *     class:'custom-class',
 *     innerText: heading.innerText
 * })
 * const layout: NavLayout = {
 *     content: () => ({ tag:'h1', innerText: 'Title' }),
 *     toc: ({router, html}) => tocView({html, router,domConvertor})
 * }
 * </code-snippet>
 * </note>
 *
 * @param _p
 * @param _p.html
 * @param _p.router
 * @param _p.domConvertor
 */
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
