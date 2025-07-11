import {
    AnyVirtualDOM,
    attr$,
    AttributeLike,
    child$,
    ChildrenLike,
    CSSAttribute,
    VirtualDOM,
} from 'rx-vdom'
import { AnyNavNode, AnyView, NavNodeResolved } from '../navigation.node'
import { BehaviorSubject, map } from 'rxjs'
import { Router } from '../router'
import { NavHeader } from './common'
import { faIconTyped } from './fa-icons'

export class NavActionView implements VirtualDOM<'button'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-NavActionView'

    public readonly tag = 'button'
    public readonly class = `${NavActionView.CssSelector} btn btn-sm mkdocs-hover-bg-4 mkdocs-text-5 border`
    public readonly style = {
        transform: 'scale(0.75)',
    }
    public readonly children: ChildrenLike
    public readonly onclick: (ev: MouseEvent) => void

    constructor({ content, action }: { content: AnyView; action: () => void }) {
        this.children = [content]
        this.onclick = (ev: MouseEvent) => {
            ev.stopPropagation()
            ev.preventDefault()
            action()
        }
    }
}

export class HandlerView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-HandlerView'

    public readonly node: AnyNavNode<unknown, unknown>
    public readonly expandedNodes$: BehaviorSubject<string[]>

    public readonly tag = 'div'
    public readonly class = `${HandlerView.CssSelector} d-flex flex-column justify-content-center text-center rounded-circle mkdocs-ts-expand-nav-node  mkdocs-hover-bg-1 mkdocs-hover-text-1`
    public readonly style = {
        width: '20px',
        height: '20px',
        fontSize: '0.7rem',
    }

    public readonly onclick: (ev: MouseEvent) => void
    public readonly children: ChildrenLike

    constructor(params: {
        node: AnyNavNode<unknown, unknown>
        expandedNodes$: BehaviorSubject<string[]>
    }) {
        Object.assign(this, params)
        this.children = [
            faIconTyped('fa-chevron-right', {
                withStyle: attr$({
                    source$: this.expandedNodes$,
                    vdomMap: (nodes) => {
                        return nodes.includes(this.node.id)
                            ? {
                                  transform: 'rotate(90deg)',
                              }
                            : {
                                  transform: 'rotate(0deg)',
                              }
                    },
                    wrapper: (style) => ({
                        ...style,
                        transition: 'transform 0.3s ease 0s',
                    }),
                }),
            }),
        ]

        this.onclick = (ev) => {
            ev.stopPropagation()
            ev.preventDefault()
            const ids = this.expandedNodes$.value
            if (ids.includes(this.node.id)) {
                this.expandedNodes$.next(
                    ids.filter((id) => id !== this.node.id),
                )
                return
            }
            this.expandedNodes$.next([...ids, this.node.id])
        }
    }
}

function bookmarkView({
    node,
    bookmarks$,
}: {
    node: NavNodeResolved<unknown, unknown>
    bookmarks$: BehaviorSubject<string[]>
}) {
    return new NavActionView({
        content: {
            tag: 'i',
            children: [
                child$({
                    source$: bookmarks$.pipe(
                        map((ids) => ids.includes(node.id)),
                    ),
                    vdomMap: (toggled) =>
                        toggled
                            ? faIconTyped('fa-bookmark')
                            : faIconTyped('far-bookmark'),
                }),
            ],
        },
        action: () => {
            const selected = bookmarks$.value.includes(node.href)
            if (selected) {
                const filtered = bookmarks$.value.filter(
                    (href) => href !== node.href,
                )
                bookmarks$.next(filtered)
                return
            }
            bookmarks$.next([...bookmarks$.value, node.href])
        },
    })
}

/**
 * Represents the header view for a navigation node.
 * It is responsible for rendering individual navigation node headers within the navigation tree.
 * It provides dynamic styling, interactivity, and integration with features like bookmarks and navigation state
 * management. Customization options are gathered by {@link NavHeader} structure
 * (defined by the attribute `header` of {@link Navigation} node).
 *
 *
 * **Structure**
 *
 * The `NavHeaderView` is structured as a flexible, responsive layout:
 *
 * - **Icon**: Displays a custom icon, if provided by the node's header configuration.
 *
 * - **Title**: The name of the node, dynamically styled based on the node's selected state.
 *
 * - **Bookmark**: Displays a bookmark indicator or action, if `bookmarks$` is provided.
 *
 * - **Actions**: Additional user-defined actions can be added to the header.
 *
 * - **Expand/Collapse Control**: For nodes with children, a toggle is rendered to expand or collapse the node's
 * subtree.
 **/
export class NavHeaderView implements VirtualDOM<'a'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-NavHeaderView'

    static readonly DefaultWrapperClass = `${NavHeaderView.CssSelector} w-100 d-flex align-items-center fv-pointer pe-2`
    public readonly tag = 'a'
    public readonly href: string
    public readonly class: AttributeLike<string>

    public readonly children: ChildrenLike
    public readonly style: CSSAttribute
    public readonly onclick: (e: MouseEvent) => void

    /**
     * Initializes a new instance.
     *
     * @param _p
     * @param _p.node  The node.
     * @param _p.router The application router.
     * @param _p.bookmarks$ State of bookmarked URLs.
     */
    constructor({
        node,
        router,
        bookmarks$,
    }: {
        node: NavNodeResolved<unknown, NavHeader>
        router: Router
        bookmarks$?: BehaviorSubject<string[]>
    }) {
        const header =
            typeof node.header === 'function'
                ? node.header({ router })
                : node.header
        this.class = header?.wrapperClass ?? NavHeaderView.DefaultWrapperClass

        this.style =
            node.id === '/'
                ? {
                      textDecoration: 'none',
                      color: 'inherit',
                      fontWeight: 'bolder' as const,
                  }
                : {
                      textDecoration: 'none',
                      color: 'inherit',
                  }
        const bookmark = bookmarks$
            ? bookmarkView({ node, bookmarks$ })
            : undefined

        const sep: (i: number) => AnyVirtualDOM = (i) => ({
            tag: 'div',
            class: `mx-${String(i)}`,
        })
        const hExpand: AnyVirtualDOM = {
            tag: 'div',
            class: 'flex-grow-1',
        }
        this.children = [
            header?.icon ?? undefined,
            sep(2),
            {
                tag: 'div',
                class: attr$({
                    source$: router.explorerState.selectedNode$,
                    vdomMap: (selected): string =>
                        selected.id === node.id ? 'font-weight-bold' : '',
                    wrapper: (d) => `${d} mkdocs-NavigationHeader-title`,
                }),
                children: [
                    header?.name
                        ? header.name
                        : { tag: 'div', innerText: node.name },
                ],
            },
            sep(1),
            bookmark
                ? child$({
                      source$: router.explorerState.selectedNode$,
                      vdomMap: (selected) =>
                          selected.id === node.id ? bookmark : { tag: 'div' },
                  })
                : undefined,
            hExpand,
            {
                tag: 'div',
                class: 'mkdocs-NavigationHeader-actions',
                children: header?.actions ?? [],
            },
            node.children
                ? new HandlerView({
                      node: node,
                      expandedNodes$: router.explorerState.expandedNodes$,
                  })
                : undefined,
        ]
        this.href = `${router.basePath}?nav=` + node.href
        this.onclick = (e) => {
            e.preventDefault()
            router.fireNavigateTo({ path: node.href, issuer: 'navigation' })
        }
    }
}
