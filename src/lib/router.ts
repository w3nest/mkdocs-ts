import {
    filter,
    firstValueFrom,
    mergeMap,
    Observable,
    of,
    ReplaySubject,
    Subject,
    switchMap,
    take,
    tap,
    timer,
} from 'rxjs'
import {
    createRootNode,
    Navigation,
    AnyNavNode,
    createLazyChildren$,
    LazyRoutesCb,
    sanitizeNavPath,
    LazyRoutesCb$,
    resolve,
    pathIds,
} from './navigation.node'
import { ImmutableTree } from '@w3nest/rx-tree-views'
import { BrowserInterface, parseUrl, WebBrowser } from './browser.interface'

export interface UrlTarget {
    /**
     * Target destination path.
     */
    path: string
    /**
     * Section Id.
     */
    sectionId?: string
    /**
     * Additional URL parameters
     */
    parameters?: Record<string, string>
}

/**
 * A target destination specification when the path is not resolved, either because it does not exist or because
 * it is not resolved yet.
 */
export interface UnresolvedTarget {
    /**
     * Target destination path.
     */
    path: string

    /**
     * Reason for the target destination to be unresolved.
     */
    reason: 'Pending' | 'NotFound'
}

/**
 * Target destination specification when navigating to a (resolved) specific path.
 */
export type Target<TLayout = unknown, THeader = unknown> = UrlTarget & {
    /**
     * Associated navigation's node.
     */
    node: Navigation<TLayout, THeader>
}

export function isResolvedTarget<TLayout, THeader>(
    target: unknown,
): target is Target<TLayout, THeader> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return (target as Target<TLayout, THeader>)?.node !== undefined
}

export const headingPrefixId = 'mk-head-'

function sanitizedCssId(id: string): string {
    return id.replace(/[^a-zA-Z0-9\-_.]/g, '')
}

export function headingId(id: string): string {
    return `${headingPrefixId}${sanitizedCssId(id)}`
}

function fireAndForget(
    promise: Promise<unknown>,
    onError?: (err: unknown) => void,
) {
    promise.then(
        () => {
            /*No OP*/
        },
        (err: unknown) => {
            if (onError) {
                onError(err)
            } else {
                console.error('Promise resolution error:', err)
            }
        },
    )
}
/**
 * Represents the router of the application.
 */
export class Router<TLayout = unknown, THeader = unknown> {
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
    public readonly navigation: Navigation<TLayout, THeader>

    /**
     * Handles navigation redirections.
     *
     * This function is invoked whenever a specific path is requested for navigation.
     * It allows modifying the target path before the navigation occurs.
     *
     * @param target - The requested path that the user intends to navigate to.
     * @returns The modified path to navigate to, or the original path if no changes are needed.
     *          If `undefined` is returned, the navigation will be canceled.
     */
    public readonly redirects: (target: string) => Promise<string | undefined> =
        (target) => Promise.resolve(target)

    /**
     * Observable that emit the current page.
     */
    public readonly target$: Subject<
        Target<TLayout, THeader> | UnresolvedTarget
    > = new ReplaySubject<Target<TLayout, THeader> | UnresolvedTarget>(1)

    /**
     * Observable that emit the current navigation path.
     */
    public readonly path$: Subject<string> = new ReplaySubject<string>(1)

    /**
     * Encapsulates the state of the navigation view (node selected, expanded, *etc.*)
     */
    public readonly explorerState: ImmutableTree.State<
        AnyNavNode<TLayout, THeader>
    >

    public scrollableElement: HTMLElement | undefined

    public readonly htmlUpdated$ = new Subject<unknown>()

    public readonly status: Record<
        'Warning' | 'Error',
        Record<string, unknown[]>
    > = { Warning: {}, Error: {} }

    private navUpdates: Record<string, LazyRoutesCb<TLayout, THeader>> = {}
    private navResolved: Record<string, Navigation<TLayout, THeader>> = {}

    /**
     * Browser client, see {@link WebBrowser} for regular scenario (library running within a tab of a web browser).
     */
    public readonly browserClient: BrowserInterface

    /**
     * Initialize a router instance.
     *
     * @param params See corresponding documentation in the class's attributes.
     * @param params.navigation See {@link Router.navigation}.
     * @param params.basePath Deprecated should not be used.
     * @param params.retryNavPeriod See {@link Router.retryNavPeriod}.
     * @param params.redirects See {@link Router.redirects}.
     * @param params.browserClient See {@link BrowserInterface}.
     */
    constructor(params: {
        navigation: Navigation<TLayout, THeader>
        basePath?: string
        retryNavPeriod?: number
        redirects?: (target: string) => Promise<string | undefined>
        browserClient?: (p: {
            router: Router
            basePath: string
        }) => BrowserInterface
    }) {
        Object.assign(this, params)
        this.basePath = this.basePath || document.location.pathname
        this.browserClient = params.browserClient
            ? params.browserClient({ router: this, basePath: this.basePath })
            : new WebBrowser({ router: this, basePath: this.basePath })

        const { rootNode, reactiveNavs, promiseNavs } = createRootNode({
            navigation: this.navigation,
            router: this,
        })
        this.explorerState = new ImmutableTree.State({
            rootNode,
            expandedNodes: ['/'],
        })
        this.bindReactiveNavs(reactiveNavs)
        this.bindPromiseNavs(promiseNavs)

        this.target$
            .pipe(
                filter((page) => {
                    return isResolvedTarget(page)
                }),
            )
            .subscribe((page) => {
                if (page.sectionId === undefined) {
                    this.scrollTo()
                }
            })
        fireAndForget(this.navigateTo(this.parseUrl()))
    }

    /**
     * Returns the current navigation path.
     */
    parseUrl(): UrlTarget {
        return this.browserClient.parseUrl()
    }

    /**
     * Fire navigation to given path with no `await`.
     *
     * @param target  The path to navigate to.
     * @param onError Callback called if errors happen.
     */
    fireNavigateTo(
        target: UrlTarget | string,
        onError?: (err: unknown) => void,
    ) {
        fireAndForget(this.navigateTo(target), onError)
    }

    /**
     * Navigate to a specific target.
     *
     * @param target The URL target.
     */
    async navigateTo(target: UrlTarget | string) {
        target = typeof target === 'string' ? parseUrl(target) : target

        const path = await this.redirects(sanitizeNavPath(target.path))
        if (!path) {
            return
        }
        const sectionId = target.sectionId

        const nav = timer(0, this.retryNavPeriod).pipe(
            switchMap(() => {
                const nav = this.getNav({ path })
                if (nav instanceof Observable) {
                    return nav
                }
                return of(nav)
            }),
            tap((nav) => {
                if (nav === 'unresolved') {
                    console.log('Try to wait...')
                    this.target$.next({
                        path,
                        reason: 'Pending',
                    })
                }
            }),
            filter((nav) => nav !== 'unresolved'),
            take(1),
        )
        const resolved = await firstValueFrom(nav)
        if (resolved === 'not-found') {
            this.target$.next({
                path,
                reason: 'NotFound',
            })
            return
        }
        this.browserClient.pushState({ target })
        this.path$.next(path)

        this.target$.next({
            node: resolved,
            path,
            sectionId: sectionId === '' ? undefined : sectionId,
        })
        await this.expandNavigationTree(path)
    }

    /**
     * Set the element in page that can be 'scrolled' to reach target destination's section ID (reference from URL).
     *
     * @param element Scrollable element.
     */
    setScrollableElement(element: HTMLElement) {
        this.scrollableElement = element
        this.target$
            .pipe(
                take(1),
                filter((target) => 'node' in target),
            )
            .subscribe((target) => {
                this.scrollTo(target.sectionId)
            })
    }
    /**
     * Scroll the main HTML content to focus on an HTML element.
     *
     * @param target The target HTML element, or its id.
     */
    scrollTo(target?: string | HTMLElement) {
        if (
            !this.scrollableElement ||
            !('scrollTo' in this.scrollableElement)
        ) {
            return
        }
        const scrollableElement = this.scrollableElement
        if (!target) {
            scrollableElement.scrollTo({
                top: 0,
                left: 0,
            })
            return
        }
        const br = scrollableElement.getBoundingClientRect()
        const div =
            target instanceof HTMLElement
                ? target
                : findElementById(scrollableElement, target)

        if (!div) {
            console.warn(`Can not scroll to element`, target)
            return
        }
        this.browserClient.pushState({
            target: { ...this.parseUrl(), sectionId: div.id },
        })
        setTimeout(() => {
            scrollableElement.scrollTo({
                top: div.offsetTop - br.top - 1,
                left: 0,
                behavior: 'smooth',
            })
        }, 0)
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
    }): Observable<Navigation<TLayout, THeader>> | 'not-found' | 'unresolved' {
        const parts = path
            .split('/')
            .slice(1)
            .filter((d) => d !== '')

        if (parts.length === 0) {
            return of(this.navigation)
        }
        const node = parts.reduce(
            ({ tree, resolvedPath, keepGoing }, part) => {
                if (!keepGoing) {
                    return { tree, resolvedPath, keepGoing }
                }
                if (tree.routes === undefined) {
                    return 'not-found'
                }
                const routes = tree.routes
                if (
                    typeof routes === 'function' ||
                    routes instanceof Observable
                ) {
                    // the navigation is a catch-all routes
                    return {
                        tree:
                            resolvedPath in this.navUpdates
                                ? this.navUpdates[resolvedPath]
                                : routes,
                        resolvedPath,
                        keepGoing: false,
                    }
                }

                if (`/${part}` in routes) {
                    const route = routes[`/${part}`]

                    if (!(route instanceof Promise)) {
                        return {
                            tree: route,
                            resolvedPath: sanitizeNavPath(
                                `${resolvedPath}/${part}`,
                            ),
                            keepGoing: true,
                        }
                    }

                    const fullPath = sanitizeNavPath(`${resolvedPath}/${part}`)
                    if (fullPath in this.navResolved) {
                        return {
                            tree: this.navResolved[fullPath],
                            resolvedPath: sanitizeNavPath(
                                `${resolvedPath}/${part}`,
                            ),
                            keepGoing: true,
                        }
                    }
                    // a retry in some period of time will be executed
                    return {
                        tree: route,
                        resolvedPath,
                        keepGoing: false,
                    }
                }
                return 'not-found'
            },
            { tree: this.navigation, resolvedPath: `/`, keepGoing: true },
        )
        if (node === 'not-found') {
            return 'not-found'
        }
        // node.tree: Navigation |  Promise<Navigation> | LazyRoutesCb | LazyRoutesCb$
        if (node.tree instanceof Observable || node.tree instanceof Promise) {
            // case: Promise<Navigation> or LazyRoutesCb$ -> a retry in some period of time will be executed
            return 'unresolved'
        }
        if (typeof node.tree === 'function') {
            // case: LazyRoutesCb, remove starting '/'
            const relative =
                node.resolvedPath === '/'
                    ? path
                    : sanitizeNavPath(path.split(node.resolvedPath)[1])
            const parent = sanitizeNavPath(
                relative.split('/').slice(0, -1).join('/'),
            )
            const parentNav = node.tree({ path: parent, router: this })
            if (!parentNav) {
                return 'not-found'
            }
            return resolve(parentNav).pipe(
                mergeMap((resolved) => {
                    const target = sanitizeNavPath(
                        relative.split('/').slice(-1)[0],
                    )
                    return resolve(resolved[target])
                }),
            )
        }
        // node.tree: Navigation
        return of(node.tree)
    }

    private async expandNavigationTree(path: string) {
        const ids = pathIds(path)
        for (const id of ids.slice(0, -1)) {
            const node = this.explorerState.getNodeResolved(id)
            this.explorerState.getChildren(node)
            await firstValueFrom(this.explorerState.getChildren$(node))
        }
        const node = this.explorerState.getNodeResolved(ids.slice(-1)[0])
        this.explorerState.selectNodeAndExpand(node)
    }

    /**
     * Clients need to invoke this function when dynamic change on the current main HTML page have occurred after the
     * initial rendering. Other views dependening on it (*e.g.* the table of content) will refresh as well.
     */
    emitHtmlUpdated() {
        this.htmlUpdated$.next(true)
    }

    private bindReactiveNavs(
        reactiveNavs: Record<string, LazyRoutesCb$<TLayout, THeader>>,
    ) {
        Object.entries(reactiveNavs).forEach(([href, v]) => {
            v.subscribe((resolver) => {
                this.navUpdates[href] = resolver
                const oldNode = this.explorerState.getNodeResolved(href)
                const children = createLazyChildren$({
                    resolver: resolver,
                    hrefBase: href,
                    path: '',
                    withExplicit: [],
                    router: this,
                })
                const newNode = new oldNode.factory({
                    ...oldNode,
                    children,
                }) as AnyNavNode<TLayout, THeader>
                this.explorerState.replaceNode(oldNode, newNode)
            })
        })
    }
    private bindPromiseNavs(
        promiseNavs: Record<string, Promise<Navigation<TLayout, THeader>>>,
    ) {
        Object.entries(promiseNavs).forEach(([href, v]) => {
            v.then(
                (nav) => {
                    this.navResolved[href] = nav
                    const oldNode = this.explorerState.getNodeResolved(href)

                    const { rootNode, reactiveNavs, promiseNavs } =
                        createRootNode({
                            navigation: nav,
                            router: this,
                            hrefBase: href,
                        })
                    this.explorerState.replaceNode(oldNode, rootNode)
                    this.bindReactiveNavs(reactiveNavs)
                    this.bindPromiseNavs(promiseNavs)
                },
                () => {
                    throw Error(
                        `Router.bindPromiseNavs: unable to bind promise navigation on ${href}`,
                    )
                },
            )
        })
    }
}

function findElementById(
    parent: HTMLElement,
    targetId: string,
): HTMLElement | undefined {
    const sanitizedId = sanitizedCssId(targetId.replace('.', '\\.'))
    const shortSelector = `#${sanitizedId}`
    const prefixedSelector = `#${headingPrefixId}${sanitizedId}`
    const divByCssQuery =
        parent.querySelector(shortSelector) ??
        parent.querySelector(prefixedSelector)
    if (divByCssQuery) {
        return divByCssQuery as HTMLElement
    }
    const headings = [...parent.querySelectorAll('h1, h2, h3, h4, h5')]
    const divByScan = headings.find(
        (e) => e.id === targetId && e instanceof HTMLElement,
    )
    if (divByScan) {
        return divByScan as HTMLElement
    }
    const divByScanPrefixed = headings.find(
        (e) =>
            e.id === `${headingPrefixId}${targetId}` &&
            e instanceof HTMLElement,
    )
    return divByScanPrefixed as HTMLElement
}
