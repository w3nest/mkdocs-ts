import { ChildrenLike, VirtualDOM, CSSAttribute } from '@youwol/rx-vdom'
import { Router } from '../router'
import { Node } from '../navigation.node'
import { ImmutableTree } from '@youwol/rx-tree-views'
import { BehaviorSubject } from 'rxjs'

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
    public readonly explorerState: ImmutableTree.State<Node>
    public readonly node: Node
    public readonly router: Router
    public readonly tag = 'a'
    public readonly href: string
    public readonly class = 'w-100 d-flex align-items-center fv-pointer pr-2'
    public readonly children: ChildrenLike
    public readonly style: CSSAttribute
    public readonly onclick: (e: MouseEvent) => void
    constructor(params: {
        node: Node
        router: Router
        explorerState: ImmutableTree.State<Node>
    }) {
        Object.assign(this, params)
        this.style =
            this.node.id == 'mkdocs-ts-nav-root'
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
            {
                tag: 'div',
                style: {
                    source$: this.explorerState.selectedNode$,
                    vdomMap: (selected: Node) =>
                        selected.id == this.node.id
                            ? { fontWeight: 'bolder' }
                            : { fontWeight: 'inherit' },
                },
                class: {
                    source$: this.explorerState.selectedNode$,
                    vdomMap: (selected: Node) =>
                        selected.id == this.node.id ? 'fv-text-focus' : '',
                    wrapper: (d) => `${d} flex-grow-1 fv-hover-text-focus`,
                },
                innerText: this.node.name,
            },
            !this.node.children || this.node.id == 'mkdocs-ts-nav-root'
                ? undefined
                : new HandlerView({
                      node: this.node,
                      expandedNodes$: this.explorerState.expandedNodes$,
                  }),
        ]
        this.href = `${this.router.basePath}?nav=` + this.node.href
        this.onclick = (e) => {
            e.preventDefault()
            this.router.navigateTo({ path: this.node.href })
        }
    }
}
