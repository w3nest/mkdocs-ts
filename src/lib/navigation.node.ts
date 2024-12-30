import { ImmutableTree } from '@w3nest/rx-tree-views'
import { Router } from './router'
import { from, map, Observable, of, take } from 'rxjs'

export type NavNodeData<
    TLayout,
    THeader,
    WithLeafInfo extends boolean = false,
> = {
    /**
     * Name of the node.
     */
    name: string
    /**
     * Some user-defined metadata.
     */
    metadata?: unknown
    /**
     * Node's header view
     */
    header?: THeader | (({ router }: { router: Router }) => THeader)
    /**
     * Node's layout
     */
    layout: TLayout
} & (WithLeafInfo extends true ? { leaf?: boolean } : Record<never, unknown>)

export class NavNodeResolved<TLayout, THeader>
    extends ImmutableTree.Node
    implements NavNodeData<TLayout, THeader>
{
    public readonly href: string
    public readonly name: string
    public readonly layout: TLayout
    public readonly header?:
        | THeader
        | (({ router }: { router: Router }) => THeader)
    public readonly metadata?: unknown

    constructor(
        parameters: {
            id: string
            href: string
            children?:
                | AnyNavNode<TLayout, THeader>[]
                | Observable<AnyNavNode<TLayout, THeader>[]>
        } & NavNodeData<TLayout, THeader>,
    ) {
        super(parameters)
        this.href = parameters.href
        this.layout = parameters.layout
        this.metadata = parameters.metadata
        this.header = parameters.header
        this.name = parameters.name
    }
}

export class NavNodePromise extends ImmutableTree.Node {
    public readonly href: string

    constructor({ href }: { href: string }) {
        super({
            id: href,
            children: undefined,
        })
        this.href = href
    }
}

export type AnyNavNode<TLayout, THeader> =
    | NavNodePromise
    | NavNodeResolved<TLayout, THeader>

export function createLazyNavNode<TLayout, THeader>({
    hrefBase,
    path,
    segment,
    node,
    asyncChildren,
    router,
}: {
    hrefBase: string
    path: string
    segment: string
    node: NavNodeData<TLayout, THeader, true>
    asyncChildren: LazyRoutesCb<TLayout, THeader>
    router: Router
}): NavNodeResolved<TLayout, THeader> {
    const sanitizedPath = sanitizeNavPath(`${path}${segment}`)
    const href = `${hrefBase}${sanitizedPath}`

    return new NavNodeResolved({
        id: href,
        href,
        name: node.name,
        children: node.leaf
            ? undefined
            : createLazyChildren$({
                  resolver: asyncChildren,
                  hrefBase,
                  path: sanitizedPath,
                  withExplicit: [],
                  router,
              }),
        metadata: node.metadata,
        header: node.header,
        layout: node.layout,
    })
}

export function createLazyChildren$<TLayout, THeader>({
    resolver,
    hrefBase,
    withExplicit,
    router,
    path,
}: {
    resolver: LazyRoutesCb<TLayout, THeader>
    path: string
    hrefBase: string
    withExplicit: NavNodeResolved<TLayout, THeader>[]
    router: Router
}):
    | NavNodeResolved<TLayout, THeader>[]
    | Observable<NavNodeResolved<TLayout, THeader>[]> {
    path = sanitizeNavPath(path)
    const resolved = resolver({ path: path, router })
    if (!resolved) {
        return []
    }
    const toChildren = (lazyChildren: LazyRoutes<TLayout, THeader>) => [
        ...Object.entries(lazyChildren).map(
            ([segment, child]: [
                PathSegment<string>,
                NavNodeData<TLayout, THeader, true>,
            ]) => {
                return createLazyNavNode({
                    hrefBase: hrefBase,
                    path,
                    segment,
                    node: child,
                    asyncChildren: resolver,
                    router,
                })
            },
        ),
        ...withExplicit,
    ]
    if (resolved instanceof Observable) {
        return resolved.pipe(
            map((lazyChildren) => {
                return toChildren(lazyChildren)
            }),
        )
    }
    if (resolved instanceof Promise) {
        return from(resolved).pipe(
            map((lazyChildren) => {
                return toChildren(lazyChildren)
            }),
        )
    }
    return of(toChildren(resolved))
}

export function createChildren<TLayout, THeader>({
    navigation,
    hRefBase,
    router,
    reactiveNavs,
    promiseNavs,
}: {
    navigation: Navigation<TLayout, THeader>
    hRefBase: string
    router: Router
    reactiveNavs: Record<string, Observable<LazyRoutesCb<TLayout, THeader>>>
    promiseNavs: Record<string, Promise<Navigation<TLayout, THeader>>>
}):
    | undefined
    | AnyNavNode<TLayout, THeader>[]
    | Observable<AnyNavNode<TLayout, THeader>[]> {
    type Nav = Navigation<TLayout, THeader>
    if (!navigation.routes) {
        return undefined
    }
    const routes = navigation.routes
    if (routes instanceof Observable) {
        reactiveNavs[hRefBase] = routes
        return undefined
    }
    if (typeof routes === 'function') {
        return createLazyChildren$({
            resolver: routes,
            hrefBase: hRefBase,
            path: '',
            withExplicit: [],
            router,
        })
    }
    return Object.entries(navigation.routes).map(
        ([k, v]: [string, Nav | Promise<Nav>]) => {
            const href = hRefBase + k
            if (v instanceof Promise) {
                promiseNavs[href] = v
                return new NavNodePromise({ href })
            }
            return new NavNodeResolved({
                id: href,
                name: v.name,
                children: createChildren({
                    // k is an entry of navigation & do start by `/` => safe cast
                    navigation: routes[k] as unknown as Nav,
                    hRefBase: hRefBase + k,
                    router,
                    reactiveNavs,
                    promiseNavs,
                }),
                href,
                layout: v.layout,
                metadata: v.metadata,
                header: v.header,
            })
        },
    )
}
export function createRootNode<TLayout, THeader>({
    navigation,
    router,
    hrefBase,
}: {
    navigation: Navigation<TLayout, THeader>
    router: Router
    hrefBase?: string
}) {
    const href = hrefBase ?? ''
    const reactiveNavs: Record<string, LazyRoutesCb$<TLayout, THeader>> = {}
    const promiseNavs: Record<
        string,
        Promise<Navigation<TLayout, THeader>>
    > = {}
    const rootNode = new NavNodeResolved({
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
        metadata: navigation.metadata,
        header: navigation.header,
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
 * <note level="warning">
 *     When an observable is provided, only its **first emission** is accounted.
 * </note>
 */
export type Resolvable<T> = T | Promise<T> | Observable<T>

export function resolve<T>(resolvable: Resolvable<T>): Observable<T> {
    if (resolvable instanceof Promise) {
        return from(resolvable).pipe(take(1))
    }
    if (resolvable instanceof Observable) {
        return resolvable.pipe(take(1))
    }
    return of(resolvable)
}

export type SegmentsRecord<T> = Record<PathSegment<string>, T>

/**
 * A mapping between segments and node attributes.
 */
export type LazyRoutes<TLayout, THeader> = SegmentsRecord<
    NavNodeData<TLayout, THeader, true>
>

/**
 * Represents a lazy navigation resolver, used when the navigation is only known at runtime.
 *
 * It is a function that takes the target path and router's instance as parameters, and returns
 * the instance of {@link LazyRoutes} that explicits node attributes.
 */
export type LazyRoutesCb<TLayout, THeader> = (p: {
    // The targeted path in the navigation
    path: string
    // Router instance
    router: Router
}) => Resolvable<LazyRoutes<TLayout, THeader>> | undefined

export type StaticRoutes<TLayout, THeader> = Record<
    string,
    Navigation<TLayout, THeader> | Promise<Navigation<TLayout, THeader>>
>

/**
 * Represents a reactive lazy navigation resolver, used when changes in a navigation node children are expected
 * (within {@link Navigation}).
 */
export type LazyRoutesCb$<TLayout, THeader> = Observable<
    LazyRoutesCb<TLayout, THeader>
>

type DynamicRoutes<TLayout, THeader> =
    | LazyRoutesCb<TLayout, THeader>
    | LazyRoutesCb$<TLayout, THeader>

/**
 * Represents a node in the navigation.
 */
export type Navigation<TLayout, THeader> = NavNodeData<TLayout, THeader> & {
    /**
     * Dynamic 'catch-all' sub-navigation resolver, used when the navigation is only known at runtime.
     *
     * The sub-paths defined in it can also be made reactive (using {@link LazyRoutesCb$})
     * if changes in organisation over time are expected.
     */
    routes?: StaticRoutes<TLayout, THeader> | DynamicRoutes<TLayout, THeader>
}

/**
 * Sanitize an input navigation path:
 * *  Ensures single starting '/'.
 * *  Corrects for empty path sequence, *e.g.* `foo//bar/.baz` -> `/foo/bar.baz`
 *
 * @param path The input path.
 * @returns The sanitized path.
 */
export function sanitizeNavPath(path: string) {
    return (
        '/' + path.replace(/^\/+/, '').replace(/\/+/g, '/').replace('/.', '.')
    )
}

export type PathSegment<T extends string> = T extends `/${string}/${string}`
    ? never
    : T extends `/${string}`
      ? T extends
            | `${string}\\${string}`
            | `${string}?${string}`
            | `${string}#${string}`
          ? never
          : T
      : never

export function segment<T extends string>(p: PathSegment<T>) {
    return p
}

export function pathIds(path: string) {
    const parts = path.split('/')
    return [
        '/',
        ...parts
            .map((_p, i) => parts.slice(0, i + 1).join('/'))
            .slice(1)
            .filter((s) => s !== '/'),
    ]
}
