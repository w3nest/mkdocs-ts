/**
 * This file gathers views related to navigation.
 */

import {
    ChildrenLike,
    VirtualDOM,
    CSSAttribute,
    AnyVirtualDOM,
    AttributeLike,
} from '@youwol/rx-vdom'
import { Router } from '../router'
import { NavNodeBase } from '../navigation.node'
import { ImmutableTree } from '@youwol/rx-tree-views'
import { BehaviorSubject, distinctUntilChanged, Observable } from 'rxjs'
import { DisplayMode, TocWrapperView } from './default-layout.view'

export class HandlerView implements VirtualDOM<'div'> {
    public readonly node: NavNodeBase
    public readonly expandedNodes$: BehaviorSubject<string[]>

    public readonly tag = 'div'
    public readonly class =
        'mkdocs-HandlerView d-flex flex-column justify-content-center rounded-circle mkdocs-ts-expand-nav-node  fv-hover-bg-background-alt fv-hover-text-focus fv-hover-xx-lighter'
    public readonly style = {
        width: '1.1em',
        height: '1.1em',
        fontSize: '0.8em',
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
                style: {
                    source$: this.expandedNodes$,
                    vdomMap: (nodes: string[]) => {
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
                },
            },
        ]

        this.onclick = (ev) => {
            ev.stopPropagation()
            ev.preventDefault()
            const ids = this.expandedNodes$.value
            ids.includes(this.node.id)
                ? this.expandedNodes$.next(
                      ids.filter((id) => id != this.node.id),
                  )
                : this.expandedNodes$.next([...ids, this.node.id])
        }
    }
}

export class NavigationHeader implements VirtualDOM<'a'> {
    static DefaultWrapperClass: string =
        'mkdocs-NavigationHeader w-100 d-flex align-items-center fv-pointer pr-2'
    public readonly tag = 'a'
    public readonly href: string
    public readonly class: AttributeLike<string>

    public readonly children: ChildrenLike
    public readonly style: CSSAttribute
    public readonly onclick: (e: MouseEvent) => void
    constructor({
        node,
        router,
        withChildren,
    }: {
        node: NavNodeBase
        router: Router
        withChildren?: AnyVirtualDOM[]
    }) {
        this.class =
            node.decoration?.wrapperClass ||
            NavigationHeader.DefaultWrapperClass

        this.style =
            node.id == '/'
                ? {
                      textDecoration: 'none',
                      color: 'black',
                      fontWeight: 'bolder' as const,
                  }
                : {
                      textDecoration: 'none',
                      color: 'black',
                  }
        this.children = [
            node.decoration?.icon,
            {
                tag: 'div',
                class: {
                    source$: router.explorerState.selectedNode$,
                    vdomMap: (selected: NavNodeBase) =>
                        selected.id == node.id
                            ? 'fv-text-focus font-weight-bold'
                            : '',
                    wrapper: (d) => `${d} flex-grow-1 fv-hover-text-focus`,
                    untilFirst: 'flex-grow-1 fv-hover-text-focus',
                },
                innerText: node.name,
            },
            {
                tag: 'div',
                children: node.decoration?.actions || [],
            },
            ...(withChildren || []),
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
    public readonly class = 'mkdocs-NavigationView h-100 w-100'
    public readonly children: ChildrenLike

    constructor(params: { router: Router }) {
        Object.assign(this, params)

        this.children = [
            new ImmutableTree.View({
                state: this.router.explorerState,
                headerView: (explorerState, node) => {
                    return new NavigationHeader({
                        node,
                        router: this.router,
                        withChildren: node.children &&
                            node.id !== '/' && [
                                new HandlerView({
                                    node: node,
                                    expandedNodes$:
                                        this.router.explorerState
                                            .expandedNodes$,
                                }),
                            ],
                    })
                },
            }),
        ]
    }
}

/**
 * The 'collapsed' navigation view (when the screen size is not large enough).
 *
 * It can be either in a state 'expanded' (the modal is displayed on the left, see {@link ExpandedNavigationView}),
 * or not (only the drop-down button to expand the modal is visible).
 */
export class ModalNavigationView implements VirtualDOM<'div'> {
    public readonly router: Router

    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = 'mkdocs-ModalNavigationView'
    /**
     * Wether the modal is expanded or not.
     */
    public readonly expanded$ = new BehaviorSubject(false)
    public readonly displayModeToc$: Observable<DisplayMode>
    constructor(params: {
        router: Router
        displayModeToc$: Observable<DisplayMode>
    }) {
        Object.assign(this, params)

        this.children = [
            {
                source$: this.expanded$,
                vdomMap: (expanded) => {
                    return expanded
                        ? new ExpandedNavigationView({
                              router: this.router,
                              collapse: () => this.expanded$.next(false),
                              displayModeToc$: this.displayModeToc$,
                          })
                        : {
                              tag: 'div',
                              class: 'fas fa-bars p-1 fv-pointer fv-hover-text-focus',
                              onclick: () => this.expanded$.next(true),
                          }
                },
            },
        ]
    }
}

/**
 * The modal navigation view when expanded.
 */
export class ExpandedNavigationView implements VirtualDOM<'div'> {
    static menuWidth = '250px'
    public readonly router: Router

    public readonly tag = 'div'
    public readonly class = 'mkdocs-ExpandedNavigationView h-100 w-100 border'
    public readonly children: ChildrenLike
    public readonly style = {
        top: '0px',
        left: '0px',
        position: 'absolute' as const,
        backgroundColor: 'rgba(0,0,0,0)',
        zIndex: 10,
        transition: 'background-color 0.2s ease 0s',
    }
    public readonly displayModeToc$: Observable<DisplayMode>
    public readonly onclick: (elem: MouseEvent) => void
    public readonly connectedCallback = (elem: HTMLElement) => {
        setTimeout(() => (elem.style.backgroundColor = 'rgba(0,0,0,0.4)'), 0)
    }
    constructor(params: {
        router: Router
        collapse: () => void
        displayModeToc$: Observable<DisplayMode>
    }) {
        Object.assign(this, params)
        this.children = [
            {
                tag: 'div',
                class: 'h-100 overflow-auto ',
                style: {
                    width: ExpandedNavigationView.menuWidth,
                    marginLeft: `-${ExpandedNavigationView.menuWidth}`,
                    backgroundColor: 'white',
                    transition: 'margin 0.2s ease 0s',
                },
                connectedCallback: (elem) =>
                    setTimeout(() => (elem.style.marginLeft = '0px'), 0),
                children: {
                    policy: 'replace',
                    source$: this.router.explorerState.selectedNode$,
                    vdomMap: (node: NavNodeBase) => {
                        return [
                            new ModalNavParentView({
                                router: this.router,
                                node,
                                displayModeToc$: this.displayModeToc$,
                            }),
                            new ModalNavChildrenView({
                                router: this.router,
                                node,
                            }),
                        ]
                    },
                },
            },
        ]
        this.onclick = (ev) => {
            if (ev.target['vDom'] === this) {
                const htmlElement = ev.target as HTMLElement
                htmlElement.children[0]['style'].marginLeft =
                    `-${ExpandedNavigationView.menuWidth}`
                htmlElement.style.backgroundColor = 'rgba(0,0,0,0)'
                setTimeout(() => params.collapse(), 200)
            }
        }
    }
}

/**
 * The part of {@link ExpandedNavigationView} that allows to navigate back to parent.
 */
export class ModalNavParentView implements VirtualDOM<'div'> {
    public readonly router: Router
    public readonly node: NavNodeBase
    public readonly tag = 'div'
    public readonly class =
        'mkdocs-ModalNavParentView w-100 py-3 border px-2 bg-light text-dark'
    public readonly style = {
        position: 'sticky' as const,
        top: '0px',
    }
    public readonly children: ChildrenLike
    public readonly displayModeToc$: Observable<DisplayMode>

    constructor(params: {
        router: Router
        node: NavNodeBase
        displayModeToc$: Observable<DisplayMode>
    }) {
        Object.assign(this, params)

        this.children = [
            {
                tag: 'i',
                class:
                    this.node.id === '/'
                        ? 'fas fa-arrow-left fv-text-disabled'
                        : 'fas fa-arrow-left fv-hover-text-focus fv-pointer',
                onclick: () => {
                    this.router.navigateToParent()
                },
            },
            new NavigationHeader(params),
            {
                source$: this.displayModeToc$.pipe(distinctUntilChanged()),
                vdomMap: (mode: DisplayMode) => {
                    return mode !== 'Minimized'
                        ? { tag: 'div' }
                        : new ModalTocView({ router: this.router })
                },
            },
        ]
    }
}

/**
 * The part of {@link ExpandedNavigationView} that allows to navigate forward to children.
 */
export class ModalNavChildrenView implements VirtualDOM<'div'> {
    public readonly router: Router
    public readonly node: NavNodeBase
    public readonly tag = 'div'
    public readonly class = 'mkdocs-ModalNavChildrenView'
    public readonly children: ChildrenLike
    constructor(params: { router: Router; node: NavNodeBase }) {
        Object.assign(this, params)
        const node = this.node.children
            ? this.node
            : this.router.explorerState.getParent(this.node.id)

        const source$ = this.router.explorerState.getChildren$(node)
        // Following call trigger children resolution if needed
        try {
            this.router.explorerState.getChildren(node)
        } catch (e) {
            this.children = []
            return
        }

        this.children = {
            policy: 'replace',
            source$: source$,
            vdomMap: (children: NavNodeBase[]) => {
                return children.map((child) => {
                    return {
                        tag: 'div',
                        class: 'border-bottom px-3 py-2',
                        children: [
                            new NavigationHeader({
                                node: child,
                                router: this.router,
                                withChildren: child.children && [
                                    {
                                        tag: 'div',
                                        class: 'fas fa-chevron-right',
                                    },
                                ],
                            }),
                        ],
                    }
                })
            },
        }
    }
}

/**
 * The TOC with the {@link ExpandedNavigationView} if it can not be displayed as standalone entity on screen.
 */
export class ModalTocView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly router: Router
    public readonly class = 'mkdocs-ModalTocView'
    public readonly expanded$ = new BehaviorSubject(false)
    constructor(params: { router: Router }) {
        Object.assign(this, params)
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center fv-hover-text-focus fv-pointer',
                onclick: () => this.expanded$.next(!this.expanded$.value),
                children: [
                    {
                        tag: 'div',
                        class: 'fas fa-list-ul',
                    },
                    {
                        tag: 'div',
                        class: 'pb-2 pt-1 mx-2',
                        innerText: 'Table of Content',
                    },
                    {
                        tag: 'div',
                        class: {
                            source$: this.expanded$,
                            vdomMap: (expanded) =>
                                expanded ? 'fa-chevron-up' : 'fa-chevron-down',
                            wrapper: (d) => `fas ${d} flex-grow-1 text-right`,
                        },
                    },
                ],
            },
            {
                tag: 'div',
                style: {
                    maxHeight: '25vh',
                    overflowY: 'auto' as const,
                    overflowX: 'hidden' as const,
                },
                class: {
                    source$: this.expanded$,
                    vdomMap: (expanded) => (expanded ? 'd-block' : 'd-none'),
                },
                children: [new TocWrapperView({ router: this.router })],
            },
        ]
    }
}
