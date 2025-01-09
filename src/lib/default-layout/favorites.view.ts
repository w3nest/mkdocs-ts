import {
    attr$,
    AttributeLike,
    ChildrenLike,
    CSSAttribute,
    replace$,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'
import {
    BehaviorSubject,
    combineLatest,
    debounceTime,
    map,
    Observable,
    ReplaySubject,
} from 'rxjs'
import { NavNodeResolved } from '../navigation.node'
import { Router } from '../router'
import { DisplayMode } from './default-layout.view'
import { NavHeader } from './navigation.view'

/**
 * Column gathering favorites (at the very left, always visible whatever device's screen size).
 *
 * It includes:
 * *  Optionally, a toggle button to display the navigation panel (on small screen).
 * *  The list of bookmarks.
 */
export class FavoritesView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Class list of the element.
     */
    public readonly class =
        'mkdocs-FavoritesView d-flex flex-column align-items-center mkdocs-bg-6 px-1'
    public readonly children: ChildrenLike
    public readonly style: CSSAttribute

    public readonly displayMode$: BehaviorSubject<DisplayMode>
    public readonly topStickyPaddingMax: string
    public readonly bottomStickyPaddingMax: string
    public readonly bookmarks$: Observable<string[]>
    public readonly router: Router<unknown, NavHeader>

    public readonly htmlElement$ = new ReplaySubject<RxHTMLElement<'div'>>(1)
    public readonly connectedCallback: (elem: RxHTMLElement<'div'>) => void
    /**
     * @param params
     * @param params.bookmarks$ Observable over the bookmarked pages' href.
     * @param params.router Application's router.
     * @param params.displayMode$ The display mode.
     */
    constructor(params: {
        bookmarks$: Observable<string[]>
        router: Router<unknown, NavHeader>
        displayMode$: BehaviorSubject<DisplayMode>
        topStickyPaddingMax: string
        bottomStickyPaddingMax: string
    }) {
        Object.assign(this, params)
        const { displayMode$, bookmarks$, router } = this
        this.style = {
            height: `calc(100vh - ${this.topStickyPaddingMax} - ${this.bottomStickyPaddingMax})`,
        }
        this.children = [
            new ToggleNavButton({
                displayMode$: displayMode$,
            }),
            new BookmarksView({ bookmarks$, router }),
        ]
        this.connectedCallback = (elem) => {
            this.htmlElement$.next(elem)
        }
    }
}

/**
 * The toggle button to display / hide the navigation panel.
 */
export class ToggleNavButton implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class: AttributeLike<string>
    public readonly children: ChildrenLike
    /**
     * Initializes a new instance.
     *
     * @param params
     * @param params.displayMode$ The display mode.
     */
    constructor(params: { displayMode$: BehaviorSubject<DisplayMode> }) {
        const sep = {
            tag: 'div' as const,
            class: 'my-3 w-100 border',
        }
        const button = {
            tag: 'button' as const,
            class: attr$({
                source$: params.displayMode$,
                vdomMap: (mode): string => {
                    if (mode === 'hidden') {
                        return 'fa-bars'
                    }
                    if (mode === 'expanded') {
                        return 'fa-minus-square'
                    }
                    return ''
                },
                wrapper: (c) => {
                    return `btn btn-sm fas ${c} mkdocs-text-5 mkdocs-bg-3 mkdocs-hover-bg-2`
                },
            }),
            onclick: () => {
                if (params.displayMode$.value === 'hidden') {
                    params.displayMode$.next('expanded')
                    return
                }
                if (params.displayMode$.value === 'expanded') {
                    params.displayMode$.next('hidden')
                    return
                }
            },
        }
        this.children = replace$({
            policy: 'replace',
            source$: params.displayMode$,
            vdomMap: (mode) => {
                return mode === 'pined' ? [] : [button, sep]
            },
        })
    }
}
/**
 * A column gathering the list of bookmarked pages.
 * Each bookmark is rendered using {@link BookmarkView}.
 */
export class BookmarksView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class =
        'mkdocs-BookmarksView d-flex flex-column align-items-center overflow-auto flex-grow-1'
    public readonly children: ChildrenLike

    /**
     * Initializes a new instance.
     *
     * @param _p Parameters
     * @param _p.bookmarks$ Observable over the bookmarked pages' href.
     * @param _p.router Application's router.
     */
    constructor({
        bookmarks$,
        router,
    }: {
        bookmarks$: Observable<string[]>
        router: Router<unknown, NavHeader>
    }) {
        const source$ = combineLatest([
            bookmarks$,
            router.explorerState.root$.pipe(debounceTime(500)),
        ]).pipe(
            map(([favorites]) => {
                return favorites
                    .map((favorite) => {
                        return router.explorerState.getNode(favorite)
                    })
                    .filter((node) => node !== undefined)
            }),
        )
        this.children = replace$({
            policy: 'replace',
            source$,
            vdomMap: (nodes: NavNodeResolved<unknown, NavHeader>[]) => {
                return nodes.map((node) => {
                    return new BookmarkView({
                        node,
                        router: router,
                    })
                })
            },
        })
    }
}

/**
 * A single bookmark view.
 */
export class BookmarkView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'mkdocs-BookmarkView mb-3'
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
        const header =
            typeof node.header === 'function'
                ? node.header({ router })
                : node.header
        this.children = [
            {
                tag: 'div',
                children: [
                    {
                        tag: 'a',
                        class: attr$({
                            source$: router.path$,
                            vdomMap: (path) => {
                                return path === node.href
                                    ? 'mkdocs-text-5 selected mkdocs-text-focus'
                                    : 'mkdocs-text-5'
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
                            header?.icon,
                            {
                                tag: 'div',
                                style: {
                                    fontSize: 'smaller',
                                },
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
                            router.explorerState.expandedNodes$.next([
                                '/',
                                ...expanded,
                            ])
                        },
                    },
                ],
            },
        ]
    }
}
