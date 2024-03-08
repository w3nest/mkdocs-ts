import {
    ChildrenLike,
    VirtualDOM,
    CSSAttribute,
    AnyVirtualDOM,
    AttributeLike,
} from '@youwol/rx-vdom'
import { Router } from '../router'
import { Node } from '../navigation.node'
import { ImmutableTree } from '@youwol/rx-tree-views'
import { BehaviorSubject, distinctUntilChanged, Observable, of } from 'rxjs'
import {
    DefaultLayoutView,
    DisplayMode,
    TocWrapperView,
} from './default-layout.view'

export class HandlerView implements VirtualDOM<'div'> {
    public readonly node: Node
    public readonly expandedNodes$: BehaviorSubject<string[]>

    public readonly tag = 'div'
    public readonly class =
        'd-flex flex-column justify-content-center rounded-circle mkdocs-ts-expand-nav-node  fv-hover-bg-background-alt fv-hover-text-focus fv-hover-xx-lighter'
    public readonly style = {
        width: '1.1rem',
        height: '1.1rem',
        fontSize: '0.8rem',
    }

    public readonly onclick: (ev: MouseEvent) => void
    public readonly children: ChildrenLike

    constructor(params: {
        node: Node
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
        node: Node
        router: Router
        withChildren?: AnyVirtualDOM[]
    }) {
        let withClass$: Observable<string>
        if (!node.wrapperClass) {
            withClass$ = of('w-100 d-flex align-items-center fv-pointer pr-2')
        }
        if (node.wrapperClass && typeof node.wrapperClass == 'string') {
            withClass$ = of(node.wrapperClass)
        }
        if (node.wrapperClass instanceof Observable) {
            withClass$ = node.wrapperClass
        }

        this.class = {
            source$: withClass$,
            vdomMap: (c: string) =>
                c || 'w-100 d-flex align-items-center fv-pointer pr-2',
        }
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
        const defaultChildren: AnyVirtualDOM[] = [
            node.icon,
            {
                tag: 'div',
                class: {
                    source$: router.explorerState.selectedNode$,
                    vdomMap: (selected: Node) =>
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
                children: node.actions || [],
            },
            ...(withChildren || []),
        ]
        this.children = node.customView ? [node.customView] : defaultChildren
        this.href = `${router.basePath}?nav=` + node.href
        this.onclick = (e) => {
            e.preventDefault()
            router.navigateTo({ path: node.href })
        }
    }
}

export class NavigationView implements VirtualDOM<'div'> {
    public readonly router: Router

    public readonly tag = 'div'
    public readonly class = 'h-100 w-100 overflow-auto'
    public readonly children: ChildrenLike
    public readonly style = {
        fontSize: '0.9rem',
    }
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

export class ModalNavigationView implements VirtualDOM<'div'> {
    public readonly router: Router

    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly expanded$ = new BehaviorSubject(false)
    constructor(params: { router: Router }) {
        Object.assign(this, params)

        this.children = [
            {
                source$: this.expanded$,
                vdomMap: (expanded) => {
                    return expanded
                        ? new ExpandedNavigationView({
                              router: this.router,
                              collapse: () => this.expanded$.next(false),
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

export class ExpandedNavigationView implements VirtualDOM<'div'> {
    static menuWidth = '250px'
    public readonly router: Router

    public readonly tag = 'div'
    public readonly class = ''
    public readonly children: ChildrenLike
    public readonly style = {
        top: '0px',
        left: '0px',
        position: 'absolute' as const,
        height: '100vh',
        width: '100vw',
        backgroundColor: 'rgba(0,0,0,0)',
        zIndex: 1,
        transition: 'background-color 0.2s ease 0s',
    }
    public readonly onclick: (elem: MouseEvent) => void
    public readonly connectedCallback = (elem: HTMLElement) => {
        setTimeout(() => (elem.style.backgroundColor = 'rgba(0,0,0,0.4)'), 0)
    }
    constructor(params: { router: Router; collapse: () => void }) {
        Object.assign(this, params)
        this.children = [
            {
                tag: 'div',
                class: 'h-100 overflow-auto ',
                style: {
                    position: 'relative',
                    width: ExpandedNavigationView.menuWidth,
                    marginLeft: `-${ExpandedNavigationView.menuWidth}`,
                    backgroundColor: 'white',
                    transition: 'margin 0.2s ease 0s',
                },
                onclick: (ev) => {
                    ev.stopPropagation()
                },
                connectedCallback: (elem) =>
                    setTimeout(() => (elem.style.marginLeft = '0px'), 0),
                children: {
                    policy: 'replace',
                    source$: this.router.explorerState.selectedNode$,
                    vdomMap: (node: Node) => {
                        return [
                            new ModalNavParentView({
                                router: this.router,
                                node,
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
        this.onclick = (elem) => {
            const htmlElement = elem.target as HTMLElement
            htmlElement.children[0]['style'].marginLeft =
                `-${ExpandedNavigationView.menuWidth}`
            htmlElement.style.backgroundColor = 'rgba(0,0,0,0)'
            setTimeout(() => params.collapse(), 200)
        }
    }
}
export class ModalNavParentView implements VirtualDOM<'div'> {
    public readonly router: Router
    public readonly node: Node
    public readonly tag = 'div'
    public readonly class = 'w-100 py-3 border px-2 bg-light text-dark'
    public readonly style = {
        position: 'sticky' as const,
        top: '0px',
    }
    public readonly children: ChildrenLike
    constructor(params: { router: Router; node: Node }) {
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
            {
                tag: 'div',
                class: 'pb-2 pt-3',
                style: {
                    fontWeight: 'bolder',
                },
                innerText: this.node.name,
            },
            {
                source$: DefaultLayoutView.displayModeToc.pipe(
                    distinctUntilChanged(),
                ),
                vdomMap: (mode: DisplayMode) => {
                    return mode !== 'Minimized'
                        ? { tag: 'div' }
                        : new ModalTocView({ router: this.router })
                },
            },
        ]
    }
}

export class ModalNavChildrenView implements VirtualDOM<'div'> {
    public readonly router: Router
    public readonly node: Node
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor(params: { router: Router; node: Node }) {
        Object.assign(this, params)
        const node = this.node.children
            ? this.node
            : this.router.explorerState.getParent(this.node.id)

        const source$ = this.router.explorerState.getChildren$(node)
        // Following call trigger children resolution if needed
        this.router.explorerState.getChildren(node)

        this.children = {
            policy: 'replace',
            source$: source$,
            vdomMap: (children: Node[]) => {
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

export class ModalTocView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly router: Router
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
                    height: '10000px',
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
