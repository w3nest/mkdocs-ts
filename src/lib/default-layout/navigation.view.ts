/**
 * This file gathers views related to navigation.
 */

import {
    ChildrenLike,
    VirtualDOM,
    CSSAttribute,
    AnyVirtualDOM,
    AttributeLike,
    attr$,
    child$,
    ChildLike,
} from 'rx-vdom'
import { Router } from '../router'
import { NavNodeBase } from '../navigation.node'
import { ImmutableTree } from '@w3nest/rx-tree-views'
import { BehaviorSubject, map } from 'rxjs'
import { LayoutOptions } from './default-layout.view'
import { NavNodeView } from '../router.view'

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
    public readonly node: NavNodeBase
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
        node: NavNodeBase
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
/**
 * Defines attributes regarding the visual rendering of the node if the navigation view.
 */
export interface NodeDecorationSpec {
    /**
     * Optional class added as wrapper to the HTML element representing the node.
     */
    wrapperClass?: AttributeLike<string>
    /**
     * Optional icon, inserted before the node's name.
     */
    icon?: ChildLike
    /**
     * Optional actions, inserted after the node's name.
     */
    actions?: ChildrenLike
}

/**
 * A specification for node decorations, either as a resolved object or a function
 * returning a resolved decoration.
 *
 * - If an object is provided, it directly specifies the decorations.
 * - If a function is provided, it dynamically computes the decorations based on the router state.
 */
export type NodeDecoration =
    | NodeDecorationSpec
    | ((p: { router: Router }) => NodeDecorationSpec)

export class NavigationNodeHeader implements VirtualDOM<'a'> {
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
        node: NavNodeBase
        router: Router
        bookmarks$: BehaviorSubject<string[]>
    }) {
        const decoration =
            typeof node.decoration === 'function'
                ? node.decoration({ router })
                : node.decoration

        this.class =
            decoration?.wrapperClass ?? NavigationNodeHeader.DefaultWrapperClass

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
        const bookmark = new NavActionView({
            content: {
                tag: 'i',
                class: attr$({
                    source$: bookmarks$.pipe(
                        map((ids) => ids.includes(node.id)),
                    ),
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
        const sep: (i: number) => AnyVirtualDOM = (i) => ({
            tag: 'div',
            class: `mx-${String(i)}`,
        })
        const hExpand: AnyVirtualDOM = {
            tag: 'div',
            class: 'flex-grow-1',
        }
        this.children = [
            decoration?.icon,
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
            child$({
                source$: router.explorerState.selectedNode$,
                vdomMap: (selected) =>
                    selected.id === node.id ? bookmark : { tag: 'div' },
            }),
            hExpand,
            {
                tag: 'div',
                class: 'mkdocs-NavigationHeader-actions',
                children: decoration?.actions ?? [],
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
            router.navigateTo({ path: node.href })
        }
    }
}

/**
 * The 'regular' navigation view (when the screen size is large enough).
 */
export class NavigationView implements VirtualDOM<'div'> {
    public readonly router: Router

    public readonly tag = 'div'
    public readonly class: string =
        'mkdocs-NavigationView mkdocs-thin-v-scroller mkdocs-bg-5 mkdocs-text-5 px-1 rounded'
    public readonly style: CSSAttribute
    public readonly children: ChildrenLike
    public readonly layoutOptions: LayoutOptions
    public readonly navNodeView: NavNodeView

    constructor(params: {
        router: Router
        navNodeView: NavNodeView
        layoutOptions: LayoutOptions
    }) {
        Object.assign(this, params)
        this.style = {
            minWidth: `${String(params.layoutOptions.navMinWidth)}px`,
            height: `calc(100vh-${params.layoutOptions.topStickyPaddingMax}-${params.layoutOptions.bottomStickyPaddingMax})`,
        }
        this.children = [
            new ImmutableTree.View({
                state: this.router.explorerState,
                headerView: (_, node) => {
                    return this.navNodeView({ node, router: this.router })
                },
                options: {
                    autoScroll: {
                        trigger: 'not-visible',
                        top: 50,
                    },
                },
            }),
        ]
    }
}
