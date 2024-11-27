import { attr$, ChildrenLike, replace$, VirtualDOM } from 'rx-vdom'
import { combineLatest, debounceTime, map, Observable } from 'rxjs'
import { NavNodeBase } from '../navigation.node'
import { Router } from '../router'

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
        'mkdocs-BookmarksView d-flex flex-column align-items-center mkdocs-bg-6 py-2 px-1'
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
