import {
    AnyVirtualDOM,
    attr$,
    child$,
    ChildrenLike,
    EmptyDiv,
    replace$,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'

import {
    BehaviorSubject,
    combineLatest,
    distinctUntilChanged,
    map,
    Observable,
    ReplaySubject,
} from 'rxjs'
import { Router } from '../router'
import { NavNodeResolved } from '../navigation.node'
import { NavHeader, DisplayMode, TopBannerSpec } from './common'
import { ToggleSidePanelButton } from './small-screen.view'

export class Logo implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-Logo'
    public readonly tag = 'div'
    public readonly class = `${Logo.CssSelector} d-flex align-items-center`
    public readonly children: ChildrenLike
    public readonly onclick: (ev: MouseEvent) => void
    public readonly style = {
        cursor: 'pointer',
    }
    constructor({
        spec,
        router,
    }: {
        spec: Pick<TopBannerSpec, 'logo'>
        router: Router
    }) {
        this.children = [
            typeof spec.logo.icon === 'string'
                ? {
                      tag: 'img',
                      style: { height: '2rem' },
                      src: spec.logo.icon,
                  }
                : spec.logo.icon,
            {
                tag: 'i',
                class: 'mx-2',
            },
            {
                tag: 'div',
                innerText: spec.logo.title,
                style: {
                    fontWeight: 'bolder',
                    fontSize: 'larger',
                },
            },
        ]
        this.onclick = (ev) => {
            ev.stopPropagation()
            router.fireNavigateTo('/')
        }
    }
}

export class EmptyTopBanner implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly boundingBox$ = new ReplaySubject<DOMRect>(1)
    public readonly connectedCallback: (element: RxHTMLElement<'div'>) => void

    constructor() {
        this.connectedCallback = (elem) => {
            const resizeObserver = new ResizeObserver(() => {
                this.boundingBox$.next(elem.getBoundingClientRect())
            })
            resizeObserver.observe(elem)
        }
    }
}

/**
 * Sticky top banner component that remains visible while scrolling.
 *
 * This component adapts its layout based on screen size and display mode:
 * - On small screens: uses {@link TopBannerMinimized}.
 * - On large screens: uses {@link TopBannerExpanded}.
 *
 * The banner includes a logo, optional dynamic content, and an optional badge.
 *
 * Content is defined using {@link TopBannerSpec}.
 */
export class TopBanner implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-TopBanner'
    public readonly tag = 'div'
    public readonly class = `${TopBanner.CssSelector} mkdocs-bg-5 mkdocs-text-5 border-bottom`
    public readonly children: ChildrenLike
    public readonly boundingBox$ = new ReplaySubject<DOMRect>(1)
    public readonly connectedCallback: (element: RxHTMLElement<'div'>) => void

    public readonly style = {
        width: 'vw-100',
        position: 'sticky' as const,
        top: '0px',
        zIndex: 100,
    }
    constructor(params: {
        router: Router
        spec: TopBannerSpec
        navigationBoundingBox$: Observable<DOMRect>
        tocBoundingBox$: Observable<DOMRect>
        displayMode$: BehaviorSubject<DisplayMode>
    }) {
        if (params.spec.zIndex) {
            this.style.zIndex = params.spec.zIndex
        }
        this.children = [
            child$({
                source$: params.displayMode$.pipe(
                    map((mode) => {
                        if (mode === 'removed') {
                            return 'removed'
                        }
                        return mode === 'pined' ? 'pined' : 'expandable'
                    }),
                    distinctUntilChanged(),
                ),
                vdomMap: (displayMode) => {
                    return displayMode === 'pined'
                        ? new TopBannerExpanded(params)
                        : new TopBannerMinimized({
                              displayMode$: params.displayMode$,
                              router: params.router,
                              spec: params.spec,
                          })
                },
            }),
        ]
        this.connectedCallback = (elem) => {
            const resizeObserver = new ResizeObserver(() => {
                this.boundingBox$.next(elem.getBoundingClientRect())
            })
            resizeObserver.observe(elem)
        }
    }
}

/**
 * Compact top banner layout for small screens.
 *
 * Layout (left to right):
 * - Toggle button to open/close navigation.
 * - Logo and title.
 * - Optional badge on the right.
 *
 * Optimized for mobile and narrow displays.
 */
export class TopBannerMinimized implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-TopBannerMinimized'
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = `${TopBannerMinimized.CssSelector} d-flex  justify-content-center py-1`
    public readonly style = {
        cursor: 'pointer',
    }
    constructor(params: {
        displayMode$: BehaviorSubject<DisplayMode>
        router: Router
        spec: Pick<TopBannerSpec, 'logo' | 'badge'>
    }) {
        this.children = [
            {
                tag: 'i',
                class: 'mx-3',
            },
            new ToggleSidePanelButton({
                displayMode$: params.displayMode$,
                icon: ' fa-sitemap',
            }),
            {
                tag: 'div',
                class: 'flex-grow-1',
            },
            new Logo({ router: params.router, spec: params.spec }),
            {
                tag: 'div',
                class: 'flex-grow-1',
            },
            params.spec.badge,
            {
                tag: 'i',
                class: 'mx-3',
            },
        ]
    }
}
/**
 * Full-width top banner layout for large screens.
 *
 * Layout (left to right):
 * - Logo aligned with navigation sidebar.
 * - Optional expanded content aligned with page content.
 * - Optional badge aligned with the table of contents.
 *
 */
export class TopBannerExpanded implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-TopBannerExpanded'
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = `${TopBannerExpanded.CssSelector} d-flex justify-content-center py-1`

    constructor({
        router,
        navigationBoundingBox$,
        tocBoundingBox$,
        spec,
    }: {
        router: Router
        navigationBoundingBox$: Observable<DOMRect>
        tocBoundingBox$: Observable<DOMRect>
        spec: TopBannerSpec
    }) {
        const logo: AnyVirtualDOM = {
            tag: 'div',
            class: 'd-flex align-items-center justify-content-center mkdocs-hover-bg-5',
            style: attr$({
                source$: navigationBoundingBox$,
                vdomMap: (navBox) => ({
                    width: `${String(navBox.width)}px`,
                }),
            }),
            children: [new Logo({ router, spec })],
        }
        const expandedContent =
            typeof spec.expandedContent === 'function'
                ? spec.expandedContent({ router })
                : spec.expandedContent
        this.children = [
            logo,
            {
                tag: 'div',
                class: 'flex-grow-1 d-flex flex-column justify-content-center',
                children: [expandedContent],
            },
            {
                tag: 'div',
                class: 'd-flex justify-content-left pe-5',
                style: attr$({
                    source$: tocBoundingBox$,
                    vdomMap: (tocBox) => ({
                        width: `${String(tocBox.width)}px`,
                        minWidth: 'fit-content',
                    }),
                }),
                children: [spec.badge],
            },
        ]
    }
}

/**
 * Displays a list of bookmarks as navigable items in a horizontal row.
 *
 * Bookmarks are resolved from navigation paths and updated reactively.
 * Typically defined as expanded content of {@link TopBanner}.
 *
 * <note level="hint">
 * The `bookmarks$` observable required by the constructor is usually also provided to {@link DefaultLayoutParams}
 * when creating the {@link Layout}.
 * </note>
 */
export class BookmarksView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-BookmarksView'
    public readonly tag = 'div'
    public readonly class = `${BookmarksView.CssSelector} d-flex align-items-center justify-content-center d-flex`
    public readonly children: ChildrenLike

    /**
     * Initializes a new instance.
     *
     * @param _p Parameters
     * @param _p.bookmarks$ Observable of the bookmarks' navigation path.
     * @param _p.router Applications's router.
     */
    constructor({
        bookmarks$,
        router,
    }: {
        bookmarks$?: Observable<string[]>
        router: Router
    }) {
        if (!bookmarks$) {
            return
        }
        const source$ = combineLatest([bookmarks$, router.explorerState.root$])
        this.children = replace$({
            policy: 'replace',
            source$,
            vdomMap: ([bookmarks, _root]) => {
                return bookmarks.map((bookmark) => {
                    const node = router.explorerState.getNode(
                        bookmark,
                    ) as unknown
                    return node
                        ? new BookmarkView({
                              node: node as NavNodeResolved<unknown, NavHeader>,
                              router,
                          })
                        : EmptyDiv
                })
            },
        })
    }
}
/**
 * A single bookmark view.
 */
export class BookmarkView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector: string = 'mkdocs-BookmarkView mx-3'

    public readonly tag = 'div'
    public readonly class = BookmarkView.CssSelector
    public readonly children: ChildrenLike
    /**
     * Initializes a new instance.
     *
     * @param _p Parameters
     * @param _p.node Node associated to the bookmark.
     * @param _p.router Application's router.
     */
    constructor({
        node,
        router,
    }: {
        node: NavNodeResolved<unknown, NavHeader>
        router: Router
    }) {
        this.children = [
            {
                tag: 'a',
                class: attr$({
                    source$: router.path$,
                    vdomMap: (path) => {
                        return path === node.href
                            ? 'mkdocs-text-5 selected mkdocs-text-focus'
                            : 'mkdocs-text-4'
                    },
                    wrapper: (d) =>
                        `${d} mkdocs-hover-text-5 text-center d-flex flex-column align-items-center`,
                    untilFirst: 'mkdocs-text-4',
                }),
                style: {
                    textDecoration: 'none',
                },
                href: node.href,
                children: [
                    {
                        tag: 'div',
                        innerText: node.name,
                    },
                ],
                onclick: (ev) => {
                    ev.preventDefault()
                    router.fireNavigateTo({ path: node.href })
                    if (node.href === '/') {
                        router.explorerState.expandedNodes$.next(['/'])
                        return
                    }
                    const expanded =
                        router.explorerState.expandedNodes$.value.filter(
                            (n) => {
                                return n.startsWith(node.href)
                            },
                        )
                    router.explorerState.expandedNodes$.next(['/', ...expanded])
                },
            },
        ]
    }
}
