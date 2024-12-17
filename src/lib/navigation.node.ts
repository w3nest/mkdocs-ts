import { ImmutableTree } from '@w3nest/rx-tree-views'
import { Router } from './router'
import { from, map, Observable } from 'rxjs'

/**
 * Fully resolved navigation node when using {@link CatchAllNav}.
 * In practical usage, consumers of the library only needs to provide {@link NavNodeInput}.
 */
export interface NavNodeParams {
    /**
     * ID of the node.
     */
    id: string
    /**
     * Name of the node.
     */
    name: string
    /**
     * Hyperlink reference.
     */
    href: string
    /**
     * Optional data associated to the node.
     */
    data?: unknown
    /**
     * Optional children.
     */
    children?: NavNodeBase[] | Observable<NavNodeBase[]>
    /**
     * Optional decoration.
     */
    layout?: LayoutSpec
}

export class NavNodeBase extends ImmutableTree.Node {
    public readonly name: string
    public readonly href: string
    public readonly data: unknown
    public readonly layout?: LayoutSpec

    constructor(parameters: NavNodeParams) {
        super({ id: parameters.id, children: parameters.children })
        this.name = parameters.name
        this.href = parameters.href
        this.data = parameters.data
        this.layout = parameters.layout
    }
}

export class NavNode extends NavNodeBase {}

export class NavNodePromise extends NavNodeBase {
    constructor({ href }: { href: string }) {
        super({
            id: href,
            name: '',
            href,
            layout: {
                kind: 'NavNodePending',
            },
        })
    }
}

/**
 * Arguments defining the children part of a navigation node when using dynamic {@link CatchAllNav}.
 */
export type NavNodeInput = Omit<NavNodeParams, 'href' | 'children'> & {
    /**
     * Whether the node is a leaf (no children expected).
     */
    leaf?: boolean
}

export function createNavNode({
    hrefBase,
    path,
    node,
    asyncChildren,
    router,
}: {
    hrefBase: string
    path: string
    node: NavNodeInput
    asyncChildren: LazyNavResolver
    router: Router
}): NavNode {
    const href =
        path === ''
            ? `${hrefBase}/${node.id}`
            : `${hrefBase}/${path}/${node.id}`

    const sanitizedPath = path === '' ? node.id : `${path}/${node.id}`
    return new NavNode({
        id: href,
        href,
        name: node.name,
        children: node.leaf
            ? undefined
            : createImplicitChildren$({
                  resolver: asyncChildren,
                  hrefBase,
                  path: sanitizedPath,
                  withExplicit: [],
                  router,
              }),
        data: node.data,
        layout: node.layout,
    })
}

export function createImplicitChildren$({
    resolver,
    hrefBase,
    withExplicit,
    router,
    path,
}: {
    resolver: LazyNavResolver
    path: string
    hrefBase: string
    withExplicit: NavNode[]
    router: Router
}): NavNode[] | Observable<NavNode[]> {
    path = sanitizeNavPath(path)
    const resolved = resolver({ path: path, router })

    const toChildren = (from: NavNodeInput[]) => [
        ...from.map((n) => {
            return createNavNode({
                hrefBase: hrefBase,
                path,
                node: n,
                asyncChildren: resolver,
                router,
            })
        }),
        ...withExplicit,
    ]
    if (resolved instanceof Observable) {
        return resolved.pipe(
            map(({ children }) => {
                return toChildren(children)
            }),
        )
    }
    if (resolved instanceof Promise) {
        return from(resolved).pipe(
            map(({ children }) => {
                return toChildren(children)
            }),
        )
    }
    return toChildren(resolved.children)
}

export function createChildren({
    navigation,
    hRefBase,
    router,
    reactiveNavs,
    promiseNavs,
}: {
    navigation: Navigation
    hRefBase: string
    router: Router
    reactiveNavs: Record<string, Observable<LazyNavResolver>>
    promiseNavs: Record<string, Promise<Navigation>>
}) {
    const explicitChildren: NavNodeBase[] = Object.entries(navigation)
        .filter(([k]) => k.startsWith('/') && k !== CatchAllKey)
        .map(([k, v]: [string, Navigation | Promise<Navigation>]) => {
            const href = hRefBase + k
            if (v instanceof Promise) {
                promiseNavs[href] = v
                return new NavNodePromise({ href })
            }
            return new NavNode({
                id: href,
                name: v.name,
                children: createChildren({
                    // k is an entry of navigation & do start by `/` => safe cast
                    navigation: navigation[k] as unknown as Navigation,
                    hRefBase: hRefBase + k,
                    router,
                    reactiveNavs,
                    promiseNavs,
                }),
                href,
                layout: v.layout,
            })
        })
    if (
        navigation[CatchAllKey] &&
        !(navigation[CatchAllKey] instanceof Observable)
    ) {
        return createImplicitChildren$({
            resolver: navigation[CatchAllKey],
            hrefBase: hRefBase,
            path: '',
            withExplicit: explicitChildren,
            router,
        })
    }
    if (
        navigation[CatchAllKey] &&
        navigation[CatchAllKey] instanceof Observable
    ) {
        reactiveNavs[hRefBase] = navigation[CatchAllKey]
    }
    return explicitChildren.length === 0 ? undefined : explicitChildren
}
export function createRootNode({
    navigation,
    router,
    hrefBase,
}: {
    navigation: Navigation
    router: Router
    hrefBase?: string
}) {
    const href = hrefBase ?? ''
    const reactiveNavs: Record<string, ReactiveLazyNavResolver> = {}
    const promiseNavs: Record<string, Promise<Navigation>> = {}
    const rootNode = new NavNode({
        id: href === '' ? '/' : href,
        name: navigation.name,
        layout: navigation.layout,
        children: createChildren({
            navigation,
            hRefBase: href,
            router,
            reactiveNavs,
            promiseNavs,
        }),
        href,
    })
    return {
        rootNode,
        reactiveNavs,
        promiseNavs,
    }
}

/**
 * Represents something resolvable.
 *
 * Important:
 *     When an observable is provided, only its **first emission** is accounted.
 */
export type Resolvable<T> = T | Promise<T> | Observable<T>

export interface LayoutSpec {
    kind: string

    [k: string]: unknown
}
/**
 * The common part of a navigation node, whether it is static or dynamic.
 */
export interface NavigationCommon {
    layout: LayoutSpec
}

/**
 * Node definition when using implicit 'catch-all' sub-navigation resolver,
 * see {@link Navigation}.
 */
export type CatchAllNav = Resolvable<
    NavigationCommon & { children: NavNodeInput[] }
>

/**
 * Represents a lazy navigation resolver, used when the navigation is only known at runtime.
 *
 * It is a function that takes the target path and router's instance as parameters, and returns
 * the instance of {@link CatchAllNav} that explicits node attributes (`name`, `id`, `children`, *etc.*).
 */
export type LazyNavResolver = (p: {
    // The targeted path in the navigation
    path: string
    // Router instance
    router: Router
}) => CatchAllNav

/**
 * Represents a reactive lazy navigation resolver, used when changes in a navigation node children are expected
 * (within {@link Navigation}).
 */
export type ReactiveLazyNavResolver = Observable<LazyNavResolver>

/**
 * Key representing an implicit 'catch-all' navigation referenced in {@link Navigation}.
 *
 */
export const CatchAllKey = '...'

/**
 * Represents a node in the navigation.
 */
export type Navigation = NavigationCommon & {
    /**
     * Name of the node.
     */
    name: string

    /**
     * Dynamic 'catch-all' sub-navigation resolver, used when the navigation is only known at runtime.
     *
     * The sub-paths defined in it can also be made reactive (using {@link ReactiveLazyNavResolver})
     * if changes in organisation over time are expected.
     */
    [CatchAllKey]?: LazyNavResolver | ReactiveLazyNavResolver

    /**
     * Static sub-navigation resolver.
     */
    [key: `/${string}`]: Navigation | Promise<Navigation>
}

/**
 * Sanitize an input navigation path:
 * *  Remove starting '/' (multiple too)
 * *  Correct for empty path sequence, *e.g.* `foo//bar/.baz` -> `foo/bar.baz`
 *
 * @param path The input path.
 * @returns The sanitized path.
 */
export function sanitizeNavPath(path: string) {
    return path.replace(/^\/+/, '').replace(/\/+/g, '/').replace('/.', '.')
}
