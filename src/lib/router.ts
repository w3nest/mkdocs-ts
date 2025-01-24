import {
    debounceTime,
    filter,
    firstValueFrom,
    map,
    mergeMap,
    Observable,
    of,
    ReplaySubject,
    Subject,
    switchMap,
    take,
    tap,
    timer,
    withLatestFrom,
} from 'rxjs'
import {
    Navigation,
    AnyNavNode,
    LazyRoutesCb,
    sanitizeNavPath,
    LazyRoutesCb$,
    resolve,
    pathIds,
    NavParser,
} from './navigation.node'
import { ImmutableTree } from '@w3nest/rx-tree-views'
import { BrowserInterface, parseUrl, WebBrowser } from './browser.interface'
import { Contextual, ContextTrait, NoContext } from './context'

/**
 * Navigation URL model.
 *
 * See {@link parseUrl} for construction from a `string`.
 */
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

    /**
     * Issuer of the URL target.
     *
     * *  `browser` : when using `next` or `prev` in browser's navigation bar.
     * *  `navigation` : when using the navigation panel.
     * *  `link` : when clicking on a link.
     */
    issuer?: 'browser' | 'navigation' | 'link' | 'scroll'
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
    let sanitizedId = id.replace(/[^a-zA-Z0-9\-_.$]/g, '')

    if (!/^[a-zA-Z_]/.test(sanitizedId.charAt(0))) {
        sanitizedId = `_${sanitizedId}`
    }

    return sanitizedId
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
 * Represents a redirection function as used in {@link Router.redirects}.
 *
 */
export type Redirect = (
    target: UrlTarget,
    ctx: ContextTrait,
) => Promise<UrlTarget | undefined>

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
     * Debounced time applied when scrolling to specific target is triggered.
     */
    public readonly scrollingDebounceTime: number = 100

    /**
     * Handles navigation redirections.
     *
     * These functions are invoked whenever a specific path is requested for navigation.
     * It allows modifying the target path before the navigation occurs.
     *
     * Functions are evaluated in reversed order, if one returns `undefined`, navigation is canceled.
     *
     * @param target - The requested target that the user intends to navigate to.
     * @returns The modified target to navigate to, or the original path if no changes are needed.
     *          If `undefined` is returned, the navigation will be canceled.
     */
    public readonly redirects: Redirect[] = [
        (target) => Promise.resolve(target),
    ]

    /**
     * Observable that emit the current page target.
     */
    public readonly target$: ReplaySubject<
        Target<TLayout, THeader> | UnresolvedTarget
    > = new ReplaySubject<Target<TLayout, THeader> | UnresolvedTarget>(1)

    /**
     * Observable that emit the current navigation path.
     */
    public readonly path$: ReplaySubject<string> = new ReplaySubject<string>(1)

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

    public readonly context?: ContextTrait
    private navParser = new NavParser()
    private scrollTo$ = new Subject<string | HTMLElement | undefined>()

    private navNodeCache: Record<string, Navigation<TLayout, THeader>> = {}
    /**
     * Initialize a router instance.
     *
     * @param params See corresponding documentation in the class's attributes.
     * @param params.navigation See {@link Router.navigation}.
     * @param params.basePath Deprecated should not be used.
     * @param params.retryNavPeriod See {@link Router.retryNavPeriod}.
     * @param params.redirects See {@link Router.redirects}.
     * @param params.browserClient See {@link BrowserInterface}.
     * @param params.scrollingDebounceTime See {@link Router.scrollingDebounceTime}.
     * @param ctx Execution context used for logging and tracing.
     */
    constructor(
        params: {
            navigation: Navigation<TLayout, THeader>
            basePath?: string
            retryNavPeriod?: number
            redirects?: Redirect[]
            browserClient?: (p: {
                router: Router
                basePath: string
            }) => BrowserInterface
            scrollingDebounceTime?: number
        },
        ctx?: ContextTrait,
    ) {
        Object.assign(this, params)
        this.context = ctx
        const context = this.ctx().start('new Router', ['Router'])
        this.basePath = this.basePath || document.location.pathname
        this.browserClient = params.browserClient
            ? params.browserClient({ router: this, basePath: this.basePath })
            : new WebBrowser({ router: this, basePath: this.basePath })

        const { rootNode, reactiveNavs, promiseNavs } =
            this.navParser.createRootNode(
                {
                    navigation: this.navigation,
                    router: this,
                },
                context,
            )
        this.explorerState = new ImmutableTree.State({
            rootNode,
            expandedNodes: ['/'],
        })
        this.bindReactiveNavs(reactiveNavs, context)
        this.bindPromiseNavs(promiseNavs, context)

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
        fireAndForget(this.navigateTo(this.parseUrl(), context))

        const removedNodes$ = this.explorerState.directUpdates$.pipe(
            map((updates) =>
                updates.map((update) => update.removedNodes).flat(),
            ),
            filter((nodes) => nodes.length > 0),
        )
        removedNodes$
            .pipe(
                withLatestFrom(this.target$),
                filter(([nodes, target]) => {
                    return (
                        nodes.find((node) =>
                            target.path.startsWith(node.href),
                        ) !== undefined
                    )
                }),
            )
            .subscribe(([, target]) => {
                context.info('Node parent of current path removed')
                this.fireNavigateTo(target, undefined, context)
            })
        const scroll$ =
            this.scrollingDebounceTime > 0
                ? this.scrollTo$.pipe(debounceTime(this.scrollingDebounceTime))
                : this.scrollTo$
        scroll$.subscribe((target) => {
            this._scrollTo(target)
        })

        removedNodes$.subscribe(() => {
            this.navNodeCache = {}
        })
        this.target$.pipe(filter((t) => isResolvedTarget(t))).subscribe((t) => {
            this.navNodeCache[t.path] = t.node
            this.scrollTo(t.sectionId)
        })
        context.exit()
    }

    ctx(ctx?: ContextTrait) {
        if (ctx) {
            return ctx
        }
        return this.context ?? new NoContext()
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
     * If a string is provided, a {@link UrlTarget} is constructed using {@link parseUrl}.
     * @param onError Callback called if errors happen.
     * @param ctx Execution context used for logging and tracing.
     */
    @Contextual()
    fireNavigateTo(
        target: UrlTarget | string,
        onError?: (err: unknown) => void,
        ctx?: ContextTrait,
    ) {
        fireAndForget(this.navigateTo(target, ctx), onError)
    }

    /**
     * Navigate to a specific target.
     *
     * @param target The URL target.
     * If a string is provided, a {@link UrlTarget} is constructed using {@link parseUrl}.
     * @param ctx Execution context used for logging and tracing.
     */
    @Contextual({
        async: true,
        key: (target: UrlTarget | string) =>
            typeof target === 'string' ? target : target.path,
    })
    async navigateTo(target: UrlTarget | string, ctx?: ContextTrait) {
        ctx = this.ctx(ctx)
        const originalTarget =
            typeof target === 'string' ? parseUrl(target) : target

        const redirectTarget = await this.redirects
            .reverse()
            .reduce(async (acc: Promise<UrlTarget | undefined>, redirect) => {
                const from = await acc
                return from
                    ? await redirect(from, ctx)
                    : Promise.resolve(undefined)
            }, Promise.resolve(originalTarget))

        if (!redirectTarget) {
            ctx.info('Redirect returned `undefined`: abord navigation')
            return
        }
        target = redirectTarget
        const path = target.path
        const sectionId = target.sectionId

        ctx.info('Schedule async nav node retrieval', target)
        const resolved = await this.getNav(target, ctx)
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
    public scrollTo(target?: string | HTMLElement) {
        this.scrollTo$.next(target)
    }

    private _scrollTo(target?: string | HTMLElement) {
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
            target: {
                ...this.parseUrl(),
                sectionId: div.id,
                issuer: 'scroll',
            },
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
     * Asynchronously retrieves the navigation node for a given path.
     * If the node is not immediately available, it will retry for a short period before returning a result.
     *
     * - If the node is found, it returns the corresponding `Navigation<TLayout, THeader>` object.
     * - If the node does not exist, it returns `'not-found'`.
     * - If the node is still unresolved, it waits and retries periodically.
     *
     * @param target The target.
     * @param ctx Execution context used for logging and tracing.
     * @returns A `Promise` resolving to the navigation node, or `'not-found'` if the node does not exist.
     */
    @Contextual({
        key: ({ path }: { path: string }) => path,
    })
    async getNav(
        target: UrlTarget,
        ctx?: ContextTrait,
    ): Promise<Navigation<TLayout, THeader> | 'not-found'> {
        ctx = this.ctx(ctx)
        const { path, parameters } = target
        if (
            path in this.navNodeCache &&
            Object.keys(parameters ?? {}).length === 0
        ) {
            ctx.info(
                `No query parameters & node in cache => return it`,
                this.navNodeCache[path],
            )
            return this.navNodeCache[path]
        }
        const nav = timer(0, this.retryNavPeriod).pipe(
            switchMap((i) => {
                ctx.info(`Attempt 'getNav' #${String(i)}`)
                const nav = this._getNav({ path }, ctx)
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
        return await firstValueFrom(nav)
    }
    /**
     * Retrieves the navigation node corresponding to a given path as observable (emitting 1 item and closing),
     * or `not-found` if it does not exist, or `unresolved` if the node is not resolved yet but maybe in a
     * (hopefully short) future.
     *
     * @param path The target path.
     * @param ctx Execution context used for logging and tracing.
     */
    @Contextual({
        key: ({ path }: { path: string }) => path,
    })
    private _getNav(
        {
            path,
        }: {
            path: string
        },
        ctx?: ContextTrait,
    ): Observable<Navigation<TLayout, THeader>> | 'not-found' | 'unresolved' {
        ctx = this.ctx(ctx)
        path = sanitizeNavPath(path)
        const parts = path
            .split('/')
            .slice(1)
            .filter((d) => d !== '')

        if (parts.length === 0) {
            return of(this.navigation)
        }
        const node = parts.reduce(
            ({ tree, resolvedPath, keepGoing }, part) => {
                ctx.info(`Resolve ${resolvedPath}/${part}`)
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
            ctx.info('Navigation node is not found')
            return 'not-found'
        }
        // node.tree: Navigation |  Promise<Navigation> | LazyRoutesCb | LazyRoutesCb$
        if (node.tree instanceof Observable || node.tree instanceof Promise) {
            ctx.info('Navigation node is unresolved')
            // case: Promise<Navigation> or LazyRoutesCb$ -> a retry in some period of time will be executed
            return 'unresolved'
        }
        if (typeof node.tree === 'function') {
            ctx.info('Navigation node is function for lazy definition')
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
        ctx.info('Navigation node found', node.tree)
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

    @Contextual()
    private bindReactiveNavs(
        reactiveNavs: Record<string, LazyRoutesCb$<TLayout, THeader>>,
        ctx?: ContextTrait,
    ) {
        ctx = this.ctx(ctx)
        Object.entries(reactiveNavs).forEach(([href, v]) => {
            v.subscribe((resolver) => {
                this.navUpdates[href] = resolver
                const oldNode = this.explorerState.getNodeResolved(href)
                ctx.info(`Replace Node w/ Observable '${href}'`, oldNode)
                const children = this.navParser.createLazyChildren$(
                    {
                        resolver: resolver,
                        hrefBase: href,
                        path: '',
                        withExplicit: [],
                        router: this,
                        depth: 0,
                    },
                    ctx,
                )
                const newNode = new oldNode.factory({
                    ...oldNode,
                    children,
                }) as AnyNavNode<TLayout, THeader>
                this.explorerState.replaceNode(oldNode, newNode)
            })
        })
    }
    @Contextual()
    private bindPromiseNavs(
        promiseNavs: Record<string, Promise<Navigation<TLayout, THeader>>>,
        ctx?: ContextTrait,
    ) {
        ctx = this.ctx(ctx)
        Object.entries(promiseNavs).forEach(([href, v]) => {
            v.then(
                (nav) => {
                    this.navResolved[href] = nav
                    const oldNode = this.explorerState.getNodeResolved(href)
                    ctx.info(`Replace Node w/ Promise '${href}'`, oldNode)
                    const { rootNode, reactiveNavs, promiseNavs } =
                        this.navParser.createRootNode(
                            {
                                navigation: nav,
                                router: this,
                                hrefBase: href,
                            },
                            ctx,
                        )
                    this.explorerState.replaceNode(oldNode, rootNode)
                    this.bindReactiveNavs(reactiveNavs, ctx)
                    this.bindPromiseNavs(promiseNavs, ctx)
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
    const selectorCssId = (id: string): string => {
        const sanitized = sanitizedCssId(id)
        return sanitized.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1')
    }

    const selector = selectorCssId(targetId)
    const shortSelector = `#${selector}`
    const prefixedSelector = `#${headingPrefixId}${selector}`
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
