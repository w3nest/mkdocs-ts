import {
    from,
    map,
    Observable,
    of,
    ReplaySubject,
    Subject,
    switchMap,
    take,
} from 'rxjs'
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

/**
 * Gathers the resolved elements when navigating to a specific path.
 */
export type Destination = {
    /**
     * The table of content view.
     */
    tableOfContent?: HTMLElement | AnyVirtualDOM
    /**
     * The main page view.
     */
    html: HTMLElement | AnyVirtualDOM
    /**
     * The typedocNodes's ID if provided in the URL.
     */
    sectionId?: string
}

/**
 * A simple proxy for mocking browser navigation to new URL.
 * Can be useful in testing or documenting contexts where actual re-location is not desirable.
 */
export interface MockBrowserLocation {
    /**
     * Initial path.
     */
    initialPath: string
    /**
     * History of navigation.
     */
    history?: { url: string; data: unknown }[]
}

/**
 * Represents the router of the application.
 */
export class Router {
    /**
     * The base path on which the router is defined.
     *
     * If the application is served from `https://my-domain/my-app/version` it is `/my-app/version`.
     */
    public readonly basePath: string

    /**
     * When using a dynamic definition of the routes (see {@link Navigation}),
     * it may be the case that the routes are not yet available when navigating to a page.
     * Attempt to re-navigate to the page is executed every `retryNavPeriod` second.
     */
    public readonly retryNavPeriod: number = 1000

    /**
     * Definition of the navigation.
     */
    public readonly navigation: Navigation

    /**
     * Observable that emit the current main HTML page.
     */
    public readonly currentHtml$: Subject<HTMLElement> =
        new ReplaySubject<HTMLElement>(1)
    /**
     * Observable that emit the current page.
     */
    public readonly currentPage$: Subject<Destination> =
        new ReplaySubject<Destination>(1)
    /**
     * Observable that emit the current navigation node.
     */
    public readonly currentNode$: Subject<NavigationCommon> =
        new ReplaySubject<NavigationCommon>(1)

    /**
     * Encapsulates the state of the navigation view (node selected, expanded, *etc.*)
     */
    public readonly explorerState: ImmutableTree.State<NavNodeBase>

    public scrollableElement: HTMLElement

    public readonly htmlUpdated$ = new Subject<unknown>()

    public readonly status: Record<
        'Warning' | 'Error',
        { [k: string]: unknown[] }
    > = { Warning: {}, Error: {} }

    private navUpdates: { [href: string]: LazyNavResolver } = {}

    /**
     * If this attribute is set, navigation to nodes do not trigger browser re-location.
     *
     * See {@link MockBrowserLocation}.
     */
    public readonly mockBrowserLocation?: MockBrowserLocation

    /**
     * Initialize a router instance.
     *
     * @param params See corresponding documentation in the class's attributes.
     * @param params.navigation See {@link Router.navigation}.
     * @param params.basePath Deprecated should not be used.
     * @param params.retryNavPeriod See {@link Router.retryNavPeriod}.
     * @param params.mockBrowserLocation See {@link Router.mockBrowserLocation}.
     */
    constructor(params: {
        navigation: Navigation
        basePath?: string
        retryNavPeriod?: number
        mockBrowserLocation?: { initialPath: string }
    }) {
        Object.assign(this, params)
        this.basePath = this.basePath || document.location.pathname
        this.mockBrowserLocation && (this.mockBrowserLocation.history = [])
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

        if (this.mockBrowserLocation === undefined) {
            window.onpopstate = (event: PopStateEvent) => {
                const state = event.state
                if (state) {
                    this.navigateTo(state)
                } else {
                    this.navigateTo({ path: '/' })
                }
            }
        }
        this.currentHtml$.subscribe(() => {
            console.log('Status', this.status)
        })
    }

    /**
     * Returns the current navigation path.
     */
    getCurrentPath(): string {
        const urlParams = new URLSearchParams(
            this.mockBrowserLocation?.initialPath || window.location.search,
        )
        return urlParams.get('nav') || '/'
    }

    /**
     * Returns the parent path of the current navigation path.
     */
    getParentPath(): string {
        const currentPath = this.getCurrentPath()
        return currentPath.split('/').slice(0, -1).join('/')
    }

    /**
     * Navigate to a specific path.
     *
     * @param path The path to navigate to.
     */
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
            switchMap((resolved: NavigationCommon) => {
                this.currentNode$.next(resolved)
                const html = resolved.html({ router: this })
                if (html instanceof Promise) {
                    return from(html)
                }
                if (html instanceof Observable) {
                    return html.pipe(take(1))
                }
                return of(html)
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
        const url = `${this.basePath}?nav=${path}`
        this.mockBrowserLocation
            ? this.mockBrowserLocation.history.push({ url, data: { path } })
            : history.pushState({ path }, undefined, url)
    }

    /**
     * Navigate to the parent node.
     */
    navigateToParent() {
        const path = this.getCurrentPath()
        const parentPath = path.split('/').slice(0, -1).join('/')
        this.navigateTo({ path: parentPath })
    }

    /**
     * Scroll the main HTML content to focus on an HTML element.
     *
     * @param target The target HTML element, or its id.
     */
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
        setTimeout(() => {
            this.scrollableElement.scrollTo({
                top: div.offsetTop - br.top,
                left: 0,
                behavior: 'smooth',
            })
        }, 0)

        const currentPath = this.getCurrentPath().split('.')[0]
        const path = `${currentPath}.${div.id}`
        history.pushState({ path }, undefined, `${this.basePath}?nav=${path}`)
    }

    refresh({
        resolverPath,
        path,
        redirectTo,
    }: {
        resolverPath: string
        path?: string
        redirectTo?: string
    }) {
        const currentPath = this.getCurrentPath()
        path = path || this.getCurrentPath()
        const resolver =
            this.navUpdates[resolverPath] ||
            this.navigation[resolverPath][CatchAllKey]
        const oldNode = this.explorerState.getNode(path)
        const relative = path.split(resolverPath)[1].replace(/^\/+/, '')
        const children = createImplicitChildren$({
            resolver: resolver,
            hrefBase: resolverPath,
            path: relative,
            withExplicit: [],
            router: this,
        })
        const newNode = new oldNode.factory({
            ...oldNode,
            children,
        }) as NavNodeBase
        this.explorerState.replaceNode(oldNode, newNode)
        //this.explorerState.selectNodeAndExpand(newNode)
        if (redirectTo) {
            this.navigateTo({ path })
            return
        }
        this.navigateTo({ path: currentPath })
    }

    /**
     * Retrieves the navigation node corresponding to a given path, or `undefined` if it does not exist.
     *
     * @param path The target path.
     */
    public getNav({
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
            // case: LazyNavResolver, remove starting '/'
            const relative = path.split(node.path)[1].replace(/^\/+/, '')
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

    /**
     * Clients need to invoke this function when dynamic change on the current main HTML page have occurred after the
     * initial rendering. Other views dependening on it (*e.g.* the table of content) will refresh as well.
     */
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
