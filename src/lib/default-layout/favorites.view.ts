import {
    attr$,
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
import {
    defaultDisplayOptions,
    DisplayMode,
    DisplayOptions,
} from './default-layout.view'
import { NavHeader } from './navigation.view'

/**
 * Sizing hints regarding for {@link FavoritesView}.
 *
 */
export type FavoritesDisplayOptions = Pick<DisplayOptions, 'favoritesMaxWidth'>

/**
 * Column gathering favorites (at the very left, always visible whatever device's screen size).
 * This implementation only includes the {@link BookmarksView}.
 */
export class FavoritesView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-FavoritesView'

    public readonly tag = 'div'
    public readonly class = `${FavoritesView.CssSelector} d-flex flex-column align-items-center mkdocs-bg-6 p-1 h-100`
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
     * @param params.displayOptions Sizing hints.
     */
    constructor(params: {
        bookmarks$: Observable<string[]>
        router: Router<unknown, NavHeader>
        displayMode$: BehaviorSubject<DisplayMode>
        displayOptions?: FavoritesDisplayOptions
    }) {
        Object.assign(this, params)
        this.style = {
            maxWidth: (params.displayOptions ?? defaultDisplayOptions)
                .favoritesMaxWidth,
        }
        const { bookmarks$, router } = this
        this.children = [new BookmarksView({ bookmarks$, router })]
        this.connectedCallback = (elem) => {
            this.htmlElement$.next(elem)
        }
    }
}

/**
 * A column gathering the list of bookmarked pages.
 * Each bookmark is rendered using {@link BookmarkView}.
 */
export class BookmarksView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-BookmarksView'

    public readonly tag = 'div'
    public readonly class = `${BookmarksView.CssSelector} d-flex flex-column align-items-center overflow-auto flex-grow-1 mkdocs-thin-v-scroller`
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
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-BookmarkView'

    public readonly tag = 'div'
    public readonly class = `${BookmarkView.CssSelector} mb-3`
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
