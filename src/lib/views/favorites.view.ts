import {
    attr$,
    AttributeLike,
    ChildrenLike,
    replace$,
    VirtualDOM,
} from 'rx-vdom'
import {
    BehaviorSubject,
    combineLatest,
    debounceTime,
    map,
    Observable,
} from 'rxjs'
import { NavNodeBase } from '../navigation.node'
import { Router } from '../router'
import { DisplayMode } from './default-layout.view'

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

    /**
     *
     * @param bookmarks$ Observable over the bookmarked pages' href.
     * @param router Application's router.
     * @param displayMode$ The display mode.
     */
    constructor({
        bookmarks$,
        router,
        displayMode$,
    }: {
        bookmarks$: Observable<string[]>
        router: Router
        displayMode$: BehaviorSubject<DisplayMode>
    }) {
        this.children = [
            new ToggleNavButton({
                displayMode$: displayMode$,
            }),
            new BookmarksView({ bookmarks$, router }),
        ]
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
     * @param displayMode$ The display mode.
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
    /**
     * Class list of the element.
     */
    public readonly class =
        'mkdocs-BookmarksView d-flex flex-column align-items-center overflow-auto'
    public readonly children: ChildrenLike

    /**
     *
     * @param bookmarks$ Observable over the bookmarked pages' href.
     * @param router Application's router.
     */
    constructor({
        bookmarks$,
        router,
    }: {
        bookmarks$: Observable<string[]>
        router: Router
    }) {
        const source$ = combineLatest([
            bookmarks$,
            router.explorerState.root$.pipe(debounceTime(500)),
        ]).pipe(
            map(([favorites]) => {
                return favorites.map((favorite) => {
                    return router.explorerState.getNode(favorite)
                })
            }),
        )
        this.children = replace$({
            policy: 'replace',
            source$,
            vdomMap: (nodes) => {
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
    /**
     * Class list of the element.
     */
    public readonly class = 'mkdocs-BookmarkView mb-3'
    public readonly children: ChildrenLike
    /**
     *
     * @param node node associated to the bookmark.
     * @param router Application's router.
     */
    constructor({ node, router }: { node: NavNodeBase; router: Router }) {
        this.children = [
            {
                tag: 'div',
                children: [
                    {
                        tag: 'a',
                        class: attr$({
                            source$: router.currentPath$,
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
                            node.decoration?.icon,
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
                            router.navigateTo({ path: node.href })
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
