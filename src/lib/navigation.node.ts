import { ImmutableTree } from '@w3nest/rx-tree-views'
import { Router } from './router'
import { from, map, Observable, of, take, shareReplay } from 'rxjs'
import { AnyVirtualDOM } from 'rx-vdom'
import { Contextual, ContextTrait, NoContext } from './context'

/**
 * Represents a view that can be rendered within the application, supporting both VirtualDOM-based components
 * from <a target="_blank" href="/apps/@rx-vdom/doc/latest">rx-vdom</a> and standard HTML elements.
 */
export type AnyView = AnyVirtualDOM | HTMLElement

/**
 * Represents the minimal set of properties for defining a node in a {@link Navigation} object.
 *
 * It can conditionally include information about whether the node is a leaf node, depending on the value of the
 * `WithLeafInfo` type parameter (required when specifying {@link DynamicRoutes}).
 *
 * @typeParam TLayout The type defining the layout configuration for the navigation.
 * @typeParam THeader The type defining the header configuration for the navigation.
 * @typeParam WithLeafInfo A boolean flag determining whether the node includes leaf-specific information.
 *
 * @useDeclaredType
 */
export type NavNodeData<
    TLayout,
    THeader,
    WithLeafInfo extends boolean = false,
> = {
    /**
     * The name of the node.
     */
    name: string
    /**
     * Optional user-defined metadata associated with the node.
     */
    metadata?: unknown
    /**
     * The header configuration for the node.
     */
    header?: THeader
    /**
     * The layout configuration for the node.
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
    public readonly header?: THeader
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

export class NavParser {
    @Contextual({
        key: ({
            hrefBase,
            path,
            segment,
        }: {
            hrefBase: string
            path: string
            segment: string
        }) => `${hrefBase}/${path}/${segment}`,
        labels: ['Nav'],
    })
    createLazyNavNode<TLayout, THeader>(
        {
            hrefBase,
            path,
            segment,
            node,
            asyncChildren,
            router,
            depth,
        }: {
            hrefBase: string
            path: string
            segment: string
            node: NavNodeData<TLayout, THeader, true>
            asyncChildren: LazyRoutesCb<TLayout, THeader>
            router: Router
            depth: number
        },
        ctx: ContextTrait = new NoContext(),
    ): NavNodeResolved<TLayout, THeader> {
        const sanitizedPath = sanitizeNavPath(`${path}${segment}`)
        const href = sanitizeNavPath(`${hrefBase}${sanitizedPath}`)

        return new NavNodeResolved({
            id: href,
            href,
            name: node.name,
            children: node.leaf
                ? undefined
                : this.createLazyChildren$(
                      {
                          resolver: asyncChildren,
                          hrefBase,
                          path: sanitizedPath,
                          withExplicit: [],
                          router,
                          depth: depth + 1,
                      },
                      ctx,
                  ),
            metadata: node.metadata,
            header: node.header,
            layout: node.layout,
        })
    }

    @Contextual({
        key: ({ path }: { path: string }) => path,
        labels: ['Nav'],
    })
    createLazyChildren$<TLayout, THeader>(
        {
            resolver,
            hrefBase,
            withExplicit,
            router,
            path,
            depth,
        }: {
            resolver: LazyRoutesCb<TLayout, THeader>
            path: string
            hrefBase: string
            withExplicit: NavNodeResolved<TLayout, THeader>[]
            router: Router
            depth: number
        },
        ctx: ContextTrait = new NoContext(),
    ):
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
                    return this.createLazyNavNode({
                        hrefBase: hrefBase,
                        path,
                        segment,
                        node: child,
                        asyncChildren: resolver,
                        router,
                        depth: depth + 1,
                    })
                },
            ),
            ...withExplicit,
        ]
        if (resolved instanceof Observable) {
            ctx.info(`from Observable`)
            return resolved.pipe(
                map((lazyChildren) => {
                    return toChildren(lazyChildren)
                }),
            )
        }
        if (resolved instanceof Promise) {
            ctx.info(`from Promise`)
            return from(resolved).pipe(
                map((lazyChildren) => {
                    const children = toChildren(lazyChildren)

                    ctx.info(`Promise resolved`, { children })
                    return children
                }),
                shareReplay({ refCount: true, bufferSize: 1 }),
            )
        }
        const children = toChildren(resolved)
        ctx.info(`from static navigation`)
        return of(children)
    }

    @Contextual({
        key: ({ hRefBase }: { hRefBase: string }) => hRefBase,
        labels: ['Nav'],
    })
    createChildren<TLayout, THeader>(
        {
            navigation,
            hRefBase,
            router,
            reactiveNavs,
            promiseNavs,
            depth,
        }: {
            navigation: Navigation<TLayout, THeader>
            hRefBase: string
            router: Router
            reactiveNavs: Record<
                string,
                Observable<LazyRoutesCb<TLayout, THeader>>
            >
            promiseNavs: Record<string, Promise<Navigation<TLayout, THeader>>>
            depth: number
        },
        ctx: ContextTrait = new NoContext(),
    ):
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
            ctx.info(`from function`)
            return this.createLazyChildren$(
                {
                    resolver: routes,
                    hrefBase: hRefBase,
                    path: '',
                    withExplicit: [],
                    router,
                    depth: depth + 1,
                },
                ctx,
            )
        }
        return Object.entries(navigation.routes).map(
            ([k, v]: [string, Nav | Promise<Nav>]) => {
                const href = sanitizeNavPath(hRefBase + k)
                if (v instanceof Promise) {
                    promiseNavs[href] = v
                    return new NavNodePromise({ href })
                }
                return new NavNodeResolved({
                    id: href,
                    name: v.name,
                    children: this.createChildren(
                        {
                            // k is an entry of navigation & do start by `/` => safe cast
                            navigation: routes[k] as unknown as Nav,
                            hRefBase: href,
                            router,
                            reactiveNavs,
                            promiseNavs,
                            depth: depth + 1,
                        },
                        ctx,
                    ),
                    href,
                    layout: v.layout,
                    metadata: v.metadata,
                    header: v.header,
                })
            },
        )
    }

    @Contextual({
        key: ({ hrefBase }: { hrefBase?: string }) => hrefBase ?? '/',
        labels: ['Nav'],
    })
    createRootNode<TLayout, THeader>(
        {
            navigation,
            router,
            hrefBase,
        }: {
            navigation: Navigation<TLayout, THeader>
            router: Router
            hrefBase?: string
        },
        ctx: ContextTrait = new NoContext(),
    ) {
        const href = hrefBase ?? '/'
        const reactiveNavs: Record<string, LazyRoutesCb$<TLayout, THeader>> = {}
        const promiseNavs: Record<
            string,
            Promise<Navigation<TLayout, THeader>>
        > = {}
        const rootNode = new NavNodeResolved({
            id: href,
            name: navigation.name,
            layout: navigation.layout,
            children: this.createChildren(
                {
                    navigation,
                    hRefBase: href,
                    router,
                    reactiveNavs,
                    promiseNavs,
                    depth: 0,
                },
                ctx,
            ),
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
}

/**
 * Represents a value that can be resolved to a specific type.
 *
 * A `Resolvable` can take the form of:
 * - A direct value of type `T`.
 * - A `Promise` resolving to a value of type `T`.
 * - An `Observable` emitting values of type `T`.
 *
 * <note level="warning">
 * When an `Observable` is provided, only its **first emission** is considered.
 * Subsequent emissions are ignored.
 * </note>
 *
 * @typeParam T The type of the value that can be resolved.
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

/**
 * This is commonly used to associate specific data or configurations with individual
 * path segments.
 *
 * @typeParam T The type of the value associated with each path segment.
 */
// Using `PathSegment` instead `string` leads to subtle compile time error (included in static tests).
export type SegmentsRecord<T> = Record<string, T>

/**
 * Represents the specification of dynamic routes in the application.
 *
 * Dynamic routes are defined as a mapping where each `segmentId` (representing a segment's contribution to the URL)
 * is associated with a {@link NavNodeData} object.
 *
 * It is used in the specification of {@link DynamicRoutes}.
 *
 * @typeParam TLayout The type defining the layout configuration for the navigation.
 * @typeParam THeader The type defining the header configuration for the navigation.
 */
export type LazyRoutes<TLayout, THeader> = SegmentsRecord<
    NavNodeData<TLayout, THeader, true>
>

/**
 * Return type when defining dynamic routing (see {@link LazyRoutesCb}).
 */
export type LazyRoutesReturn<TLayout, THeader> =
    | Resolvable<LazyRoutes<TLayout, THeader>>
    | undefined
/**
 * Represents a lazy navigation resolver, used when the navigation is only known at runtime.
 *
 * It is a function that takes the target path and router's instance as parameters, and returns
 * the instance of a (wrapped) {@link LazyRoutes} that explicits node attributes for the given path.
 */
export type LazyRoutesCb<TLayout, THeader> = (p: {
    // The targeted path in the navigation
    path: string
    // Router instance
    router: Router
}) => LazyRoutesReturn<TLayout, THeader>

/**
 * Represents the definition of static routes in the application.
 *
 * Static routes are defined as a mapping where each `segmentId` (representing a segment's contribution to the URL)
 * is associated with a {@link Resolvable} {@link Navigation} object.
 *
 * The {@link PathSegment} type define the valid string for a `segmentId` definition (in a nutshell: starts with `/`,
 * and not using spaces or special characters not allowed in URLs).
 *
 * <note level="hint">
 * The {@link segment} function performs both static and dynamic checks to validate the segment ID.
 * </note>
 *
 *
 * <note level="hint" title="Promise">
 * Promises can be used, for instance, when requests need to be triggered to fetch attributes or metadata
 * for a navigation node. In such cases, the navigation tree will wait for the promise to resolve before updating its
 * state.
 *
 * In the common scenario where only the layout's content requires an asynchronous task to resolve,
 * it is often possible to specify this dependency within the layout itself. This approach allows the
 * navigation tree to avoid waiting for the task's resolution, as the asynchronous handling is confined
 * to the layout specification.
 * </note>
 *
 *
 * @typeParam TLayout The type defining the layout configuration for the navigation.
 * @typeParam THeader The type defining the header configuration for the navigation.
 */
export type StaticRoutes<TLayout, THeader> = Record<
    string,
    Resolvable<Navigation<TLayout, THeader>>
>

/**
 * Represents a reactive lazy navigation resolver, used when the routing schema is expected to change dynamically
 * based on some signal.
 */
export type LazyRoutesCb$<TLayout, THeader> = Observable<
    LazyRoutesCb<TLayout, THeader>
>

/** Represents dynamic routes that are evaluated at runtime.
 *
 * - Use {@link LazyRoutesCb} for cases where the routing structure remains constant after its first evaluation.
 * - Use {@link LazyRoutesCb$} when the routing schema is expected to change dynamically based on signals.
 *
 * @typeParam TLayout The type representing the layout of the application.
 * @typeParam THeader The type representing the header configuration.
 */
export type DynamicRoutes<TLayout, THeader> =
    | LazyRoutesCb<TLayout, THeader>
    | LazyRoutesCb$<TLayout, THeader>

/** Represents a node within the navigation hierarchy.
 *
 * Each navigation node is defined by a set of core properties from {@link NavNodeData}, which specify details
 * such as the node's name, layout, and header configuration. The hierarchical structure of the navigation is
 * established through the `routes` property, which may include either:
 * - {@link StaticRoutes}: A predefined, fixed set of child routes.
 * - {@link DynamicRoutes}: Dynamically generated child routes, evaluated at runtime.
 *
 * @typeParam TLayout The type representing the layout of the application.
 * @typeParam THeader The type representing the header configuration.
 */
export type Navigation<TLayout, THeader> = NavNodeData<TLayout, THeader> & {
    /**
     * Children routes of the node.
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
        '/' +
        path
            .replace(/^\/+/, '') // Remove leading slashes
            .replace(/\/+/g, '/') // Collapse multiple slashes
            .replace('/.', '.') // Fix misplaced dot
            .replace(/\/+$/, '') // Remove trailing slashes
    )
}

/**
 * Performs static checks on a path segment.
 *
 * The type {@link PathSegment} ensures that the given string adheres to specific rules:
 * - The segment must be a single static path segment (e.g., `/foo`).
 * - Segments containing backslashes (`\\`), query parameters (`?`), dot (`.`), or fragments (`#`) are not allowed.
 * - Nested paths (e.g., `/foo/bar`) are disallowed.
 *
 * To use it as validator of your segments:
 *
 * <code-snippet language='javascript'>
 * import segment from 'mkdocs-ts'
 *
 * const routes = {
 *     [segment('/foo')]: { ... },
 *     // Compilation errors:
 *     [segment('bar')]: { ... },
 *     [segment('/bar/baz')]: { ... },
 * }
 * </code-snippet>
 *
 * @typeParam T The type of the string segment to validate.
 */
export type PathSegment<T extends string> = T extends `/${string}/${string}`
    ? never
    : T extends `/${string}`
      ? T extends
            | `${string}\\${string}`
            | `${string}?${string}`
            | `${string}#${string}`
            | `${string}.${string}`
          ? never
          : T
      : never

/**
 * Validates a static path segment at compile time.
 *
 * This function uses the {@link PathSegment} type to perform static validation
 * of the provided segment ID. It ensures that the segment complies with the
 * required format and restrictions.
 *
 * @param p - The segment ID to validate (e.g., `/foo`).
 * @returns The validated segment if it passes all static checks.
 */
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
