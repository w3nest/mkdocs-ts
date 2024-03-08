import { from, map, mergeMap, Observable, ReplaySubject, Subject } from 'rxjs'
import { AnyVirtualDOM } from '@youwol/rx-vdom'
import { createRootNode, Node } from './navigation.node'
import { ImmutableTree } from '@youwol/rx-tree-views'

export class NavigationNode {
    name: string
    html: ({
        router,
    }: {
        router: Router
    }) => Promise<HTMLElement | AnyVirtualDOM>
    tableOfContent?: (p: {
        html: HTMLElement
        router: Router
    }) => Promise<AnyVirtualDOM>
}

export type Destination = {
    tableOfContent?: HTMLElement | AnyVirtualDOM
    html: HTMLElement | AnyVirtualDOM
    sectionId?: string
}

export type Update<T> = {
    from$: Observable<T>
    then: (p: {
        treeState: ImmutableTree.State<Node>
        data: T
        router: Router
    }) => void
}

export class Router {
    public readonly basePath: string
    public readonly navigation

    public readonly currentHtml$: Subject<HTMLElement> =
        new ReplaySubject<HTMLElement>(1)
    public readonly currentPage$: Subject<Destination> =
        new ReplaySubject<Destination>(1)
    public readonly currentNode$: Subject<NavigationNode> =
        new ReplaySubject<NavigationNode>(1)

    public readonly explorerState: ImmutableTree.State<Node>

    public scrollableElement: HTMLElement

    public readonly htmlUpdated$ = new Subject<unknown>()

    public readonly status: Record<
        'Warning' | 'Error',
        { [k: string]: unknown[] }
    > = { Warning: {}, Error: {} }

    private navigationResolved = false

    constructor(params: {
        navigation
        basePath: string
        updates?: Update<unknown>[]
    }) {
        Object.assign(this, params)

        this.explorerState = new ImmutableTree.State({
            rootNode: createRootNode(this.navigation, this),
            expandedNodes: ['root'],
        })
        params.updates?.forEach((update) => {
            update.from$.subscribe((d) => {
                update.then({
                    treeState: this.explorerState,
                    data: d,
                    router: this,
                })
                if (!this.navigationResolved) {
                    this.expand(this.getCurrentPath())
                }
            })
        })

        this.navigateTo({ path: this.getCurrentPath() })

        window.onpopstate = (event: PopStateEvent) => {
            const state = event.state
            if (state) {
                this.navigateTo(state)
            } else {
                this.navigateTo({ path: '/' })
            }
        }
        this.currentHtml$.subscribe(() => {
            console.log('Status', this.status)
        })
    }

    getCurrentPath() {
        const urlParams = new URLSearchParams(window.location.search)
        return urlParams.get('nav') || '/'
    }
    navigateTo({ path }: { path: string }) {
        const pagePath = path.split('.')[0]
        const sectionId = path.split('.').slice(1).join('.')
        const node = this.getNode({ path: pagePath })
        if (node instanceof Promise) {
            node.then((resolved: NavigationNode) => {
                this.currentNode$.next(resolved)
                return resolved.html({ router: this })
            })
                .then((html) => ({
                    html,
                    sectionId: sectionId == '' ? undefined : sectionId,
                }))
                .then((d) => this.currentPage$.next(d))
        }
        if (node instanceof Observable) {
            node.pipe(
                mergeMap((resolved: NavigationNode) => {
                    this.currentNode$.next(resolved)
                    return from(resolved.html({ router: this }))
                }),
                map((html) => ({
                    html,
                    sectionId: sectionId == '' ? undefined : sectionId,
                })),
            ).subscribe((d) => this.currentPage$.next(d))
        }
        this.expand(pagePath)
        history.pushState({ path }, undefined, `${this.basePath}?nav=${path}`)
    }

    navigateToParent() {
        const path = this.getCurrentPath()
        const parentPath = path.split('/').slice(0, -1).join('/')
        this.navigateTo({ path: parentPath })
    }

    scrollTo(target: string | HTMLElement) {
        if (!this.scrollableElement) {
            return
        }
        const br = this.scrollableElement.getBoundingClientRect()
        if (!target) {
            this.scrollableElement.scrollTo({
                top: br.top,
                left: 0,
            })
            return
        }
        const div: HTMLElement =
            target instanceof HTMLElement
                ? target
                : findElementById(this.scrollableElement, target)

        if (!div) {
            console.warn(`Can not scroll to element #${target}`)
            return
        }
        const tinyMarginPx = 5
        this.scrollableElement.scrollTo({
            top: div.offsetTop + br.top - tinyMarginPx,
            left: 0,
            behavior: 'smooth',
        })
        const currentPath = this.getCurrentPath().split('.')[0]
        const path = `${currentPath}.${div.id}`
        history.pushState({ path }, undefined, `${this.basePath}?nav=${path}`)
    }

    private getNode({
        path,
    }: {
        path: string
    }): Promise<NavigationNode> | Observable<NavigationNode> {
        const parts = path
            .split('/')
            .slice(1)
            .filter((d) => d !== '')
        if (parts.length === 0) {
            return Promise.resolve(this.navigation)
        }
        const node = parts.reduce(
            ({ tree, path, keepGoing }, part) => {
                if (!keepGoing) {
                    return { tree, path, keepGoing }
                }
                const treePart = tree[`/${part}`]
                if (!treePart && !tree['/**']) {
                    console.error({ path, tree })
                    throw Error(`Can not find target navigation ${path}`)
                }
                if (!treePart) {
                    return {
                        tree: tree['/**'],
                        path: `${path}`,
                        keepGoing: false,
                    }
                }
                return {
                    tree: treePart,
                    path: `${path}/${part}`,
                    keepGoing: true,
                }
            },
            { tree: this.navigation, path: ``, keepGoing: true },
        )
        if (!node.keepGoing) {
            const relative = path.split(node.path)[1]
            return node.tree({ path: relative, router: this })
        }
        return node.tree instanceof Promise
            ? node.tree
            : Promise.resolve(node.tree)
    }

    private expand(path: string) {
        const parts = path.split('/')
        const ids = parts
            .map((p, i) => parts.slice(0, i + 1).join('/'))
            .slice(1)
        const getLastResolved = (ids: string[]) => {
            if (ids.length == 0) {
                return this.explorerState.getNode('/')
            }
            const id = ids.slice(-1)[0]
            const childNode = this.explorerState.getNode(id)
            return childNode || getLastResolved(ids.slice(0, -1))
        }
        const node = getLastResolved(ids)
        if (node.id == ids.slice(-1)[0]) {
            this.explorerState.selectNodeAndExpand(node)
            return
        }

        const idsRemaining = ids.slice(ids.indexOf(node.id))
        if (idsRemaining.length == 0) {
            this.explorerState.selectNodeAndExpand(node)
            return
        }
        const expandRec = (ids: string[], node: Node) => {
            if (ids.length == 0) {
                return this.explorerState.selectNodeAndExpand(node)
            }
            const maybeChildResolved = this.explorerState.getNode(ids[0])
            return maybeChildResolved
                ? expandRec(ids.slice(1), maybeChildResolved)
                : this.explorerState.getChildren(node, () => {
                      const nodeNew = this.explorerState.getNode(ids[0])
                      if (!nodeNew) {
                          console.warn(`Can not find node ${ids[0]} (yet?)`)
                          this.navigationResolved = false
                      }
                      if (nodeNew) {
                          this.explorerState.selectNodeAndExpand(nodeNew)
                          expandRec(ids.slice(1), nodeNew)
                          this.navigationResolved = true
                      }
                  })
        }
        expandRec(idsRemaining, node)
    }

    setDisplayedPage({ page }: { page: HTMLElement }) {
        this.currentHtml$.next(page)
    }

    log({
        severity,
        category,
        message,
    }: {
        severity: 'Warning' | 'Error'
        category: string
        message: unknown
    }) {
        if (!this.status[severity][category]) {
            this.status[severity][category] = []
        }
        this.status[severity][category].push(message)
    }

    emitHtmlUpdated() {
        this.htmlUpdated$.next(true)
    }
}

function findElementById(parent: HTMLElement, targetId: string): HTMLElement {
    const divByCssQuery = parent.querySelector(
        `#${targetId.replace('.', '\\.')}`,
    )
    if (divByCssQuery) {
        return divByCssQuery as HTMLElement
    }
    const headings = [...parent.querySelectorAll('h1, h2, h3, h4, h5')]
    const divByScan = headings.find((e) => e.id === targetId) as HTMLElement
    if (divByScan) {
        return divByScan
    }
}
