import { from, map, Observable, of, ReplaySubject, Subject } from 'rxjs'
import { AnyVirtualDOM } from '@youwol/rx-vdom'
import {
    createRootNode,
    Navigation,
    NavigationCommon,
    NavNodeBase,
    createImplicitChildren$,
    CatchAllKey,
    LazyNavResolver,
} from './navigation.node'
import { ImmutableTree } from '@youwol/rx-tree-views'

export type Destination = {
    tableOfContent?: HTMLElement | AnyVirtualDOM
    html: HTMLElement | AnyVirtualDOM
    sectionId?: string
}

export class Router {
    public readonly basePath: string
    public readonly retryNavPeriod: number = 1000
    public readonly navigation: Navigation

    public readonly currentHtml$: Subject<HTMLElement> =
        new ReplaySubject<HTMLElement>(1)
    public readonly currentPage$: Subject<Destination> =
        new ReplaySubject<Destination>(1)
    public readonly currentNode$: Subject<NavigationCommon> =
        new ReplaySubject<NavigationCommon>(1)

    public readonly explorerState: ImmutableTree.State<NavNodeBase>

    public scrollableElement: HTMLElement

    public readonly htmlUpdated$ = new Subject<unknown>()

    public readonly status: Record<
        'Warning' | 'Error',
        { [k: string]: unknown[] }
    > = { Warning: {}, Error: {} }

    private navUpdates: { [href: string]: LazyNavResolver } = {}

    constructor(params: {
        navigation: Navigation
        basePath: string
        retryNavPeriod?: number
    }) {
        Object.assign(this, params)
        const { rootNode, reactiveNavs } = createRootNode({
            navigation: this.navigation,
            router: this,
        })
        this.explorerState = new ImmutableTree.State({
            rootNode,
            expandedNodes: ['/'],
        })
        Object.entries(reactiveNavs).forEach(([href, v]) => {
            v.subscribe((resolver) => {
                this.navUpdates[href] = resolver
                const oldNode = this.explorerState.getNode(href)
                const children = createImplicitChildren$({
                    resolver: resolver,
                    hrefBase: href,
                    path: '',
                    withExplicit: [],
                    router: this,
                })
                const newNode = new oldNode.factory({
                    ...oldNode,
                    children,
                })
                this.explorerState.replaceNode(oldNode, newNode)
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

        const nav = this.getNav({ path: pagePath })
        if (!nav) {
            console.log('Try to wait...')
            setTimeout(() => this.navigateTo({ path }), this.retryNavPeriod)
            return
        }
        // This part is to resolve the html content of the selected page.
        nav.pipe(
            map((resolved: NavigationCommon) => {
                this.currentNode$.next(resolved)
                return resolved.html({ router: this })
            }),
            map((html) => ({
                html,
                sectionId: sectionId == '' ? undefined : sectionId,
            })),
        ).subscribe((d) => {
            this.currentPage$.next(d)
        })
        // This part is to select the appropriate node in the navigation.
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

    private getNav({
        path,
    }: {
        path: string
    }): Observable<NavigationCommon> | undefined {
        const parts = path
            .split('/')
            .slice(1)
            .filter((d) => d !== '')

        if (parts.length === 0) {
            return of(this.navigation)
        }

        const node = parts.reduce(
            ({ tree, path, keepGoing }, part) => {
                if (!keepGoing) {
                    return { tree, path, keepGoing }
                }
                const treePart = tree[`/${part}`]
                if (!treePart && !tree[CatchAllKey]) {
                    console.error({ path, tree })
                    throw Error(`Can not find target navigation ${path}`)
                }
                if (!treePart) {
                    return {
                        tree: this.navUpdates[path] || tree[CatchAllKey],
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
        // node.tree: Navigation | LazyNavResolver | ReactiveLazyNavResolver
        if (node.tree instanceof Observable) {
            // case: ReactiveLazyNavResolver -> a retry in some period of time will be executed
            return undefined
        }
        // node.tree: Navigation | LazyNavResolver
        if (typeof node.tree === 'function') {
            // case: LazyNavResolver
            const relative = path.split(node.path)[1]
            const nav = node.tree({ path: relative, router: this })
            return nav instanceof Observable
                ? nav
                : nav instanceof Promise
                  ? from(nav)
                  : of(nav)
        }
        // node.tree: Navigation
        return of(node.tree)
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

        const idsRemaining = ids.slice(ids.indexOf(node.id) + 1)
        if (idsRemaining.length == 0) {
            this.explorerState.selectNodeAndExpand(node)
            return
        }
        const expandRec = (ids: string[], node: NavNodeBase) => {
            if (ids.length == 0) {
                return this.explorerState.selectNodeAndExpand(node)
            }
            const maybeChildResolved = this.explorerState.getNode(ids[0])
            return maybeChildResolved
                ? expandRec(ids.slice(1), maybeChildResolved)
                : this.explorerState.getChildren(node, (_, children) => {
                      const nodeNew = children.find(
                          (child) => child.id === ids[0],
                      )
                      if (!nodeNew) {
                          console.warn(`Can not find node ${ids[0]} (yet?)`)
                      }
                      if (nodeNew) {
                          expandRec(ids.slice(1), nodeNew)
                      }
                  })
        }
        expandRec(idsRemaining, node)
    }

    setDisplayedPage({ page }: { page: HTMLElement }) {
        this.currentHtml$.next(page)
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
