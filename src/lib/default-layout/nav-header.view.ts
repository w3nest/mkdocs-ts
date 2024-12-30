import {
    AnyVirtualDOM,
    attr$,
    AttributeLike,
    child$,
    ChildrenLike,
    CSSAttribute,
    VirtualDOM,
} from 'rx-vdom'
import { AnyNavNode, NavNodeResolved } from '../navigation.node'
import { BehaviorSubject, map } from 'rxjs'
import { Router } from '../router'
import { NavHeader } from './navigation.view'

export class NavActionView implements VirtualDOM<'button'> {
    public readonly tag = 'button'
    public readonly class =
        'NavActionView btn btn-sm mkdocs-hover-bg-4 mkdocs-text-5'
    public readonly style = {
        transform: 'scale(0.75)',
    }
    public readonly children: ChildrenLike
    public readonly onclick: (ev: MouseEvent) => void

    constructor({
        content,
        action,
    }: {
        content: AnyVirtualDOM
        action: () => void
    }) {
        this.children = [content]
        this.onclick = (ev: MouseEvent) => {
            ev.stopPropagation()
            ev.preventDefault()
            action()
        }
    }
}

export class HandlerView implements VirtualDOM<'div'> {
    public readonly node: AnyNavNode<unknown, unknown>
    public readonly expandedNodes$: BehaviorSubject<string[]>

    public readonly tag = 'div'
    public readonly class =
        'mkdocs-HandlerView d-flex flex-column justify-content-center text-center rounded-circle mkdocs-ts-expand-nav-node  mkdocs-hover-bg-1 mkdocs-hover-text-1'
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
            {
                tag: 'i',
                class: 'fas fa-chevron-right text-center',
                style: attr$({
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
            },
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
            class: attr$({
                source$: bookmarks$.pipe(map((ids) => ids.includes(node.id))),
                vdomMap: (toggled) =>
                    toggled ? 'fas fa-bookmark' : 'far fa-bookmark',
            }),
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
export class NavHeaderView implements VirtualDOM<'a'> {
    static readonly DefaultWrapperClass =
        'mkdocs-NavigationHeader w-100 d-flex align-items-center fv-pointer pe-2'
    public readonly tag = 'a'
    public readonly href: string
    public readonly class: AttributeLike<string>

    public readonly children: ChildrenLike
    public readonly style: CSSAttribute
    public readonly onclick: (e: MouseEvent) => void
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
                innerText: node.name,
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
            router.fireNavigateTo({ path: node.href })
        }
    }
}
