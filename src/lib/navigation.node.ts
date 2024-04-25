import { ImmutableTree } from '@youwol/rx-tree-views'
import { Router } from './router'
import { from, map, Observable } from 'rxjs'
import {
    AnyVirtualDOM,
    AttributeLike,
    ChildrenLike,
    ChildLike,
} from '@youwol/rx-vdom'

/**
 * Defines attributes regarding the visual rendering of the node if the navigation view.
 */
export type Decoration = {
    /**
     * Optional class added as wrapper to the HTML element representing the node.
     */
    wrapperClass?: AttributeLike<string>
    /**
     * Optional icon, inserted before the node's name.
     */
    icon?: ChildLike
    /**
     * Optional actions, inserted after the node's name.
     */
    actions?: ChildrenLike
}

/**
 * Fully resolved navigation node when using {@link CatchAllNav}.
 * In practical usage, consumers of the library only needs to provide {@link NavNodeInput}.
 */
export type NavNodeParams = {
    /**
     * Id of the node.
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
    decoration?: Decoration
}

export class NavNodeBase extends ImmutableTree.Node {
    public readonly name: string
    public readonly href: string
    public readonly data: unknown
    public readonly decoration?: Decoration

    protected constructor(parameters: NavNodeParams) {
        super({ id: parameters.id, children: parameters.children })
        this.name = parameters.name
        this.href = parameters.href
        this.data = parameters.data
        this.decoration = parameters.decoration
    }
}

export class NavNode extends NavNodeBase {
    constructor(parameters: NavNodeParams) {
        super(parameters)
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
}) {
    const href =
        path !== ''
            ? `${hrefBase}/${path}/${node.id}`
            : `${hrefBase}/${node.id}`

    return new NavNode({
        id: href,
        href,
        name: node.name,
        children: node.leaf
            ? undefined
            : createImplicitChildren$({
                  resolver: asyncChildren,
                  hrefBase,
                  path: path !== '' ? `${path}/${node.id}` : node.id,
                  withExplicit: [],
                  router,
              }),
        data: node.data,
        decoration: node.decoration,
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
}) {
    // remove starting '/' (multiple too)
    path = path.replace(/^\/+/, '')
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
}: {
    navigation: Navigation
    hRefBase: string
    router: Router
    reactiveNavs: { [_href: string]: Observable<LazyNavResolver> }
}) {
    const explicitChildren = Object.entries(navigation)
        .filter(([k]) => k.startsWith('/') && k !== CatchAllKey)
        .map(([k, v]: [string, Navigation]) => {
            const href = hRefBase + k
            return new NavNode({
                id: href,
                name: v['name'],
                children: createChildren({
                    navigation: navigation[k],
                    hRefBase: hRefBase + k,
                    router,
                    reactiveNavs,
                }),
                href,
                decoration: v['decoration'],
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
    return explicitChildren.length == 0 ? undefined : explicitChildren
}
export function createRootNode({
    navigation,
    router,
}: {
    navigation: Navigation
    router: Router
}) {
    const href = ''
    const reactiveNavs: { [k: string]: ReactiveLazyNavResolver } = {}
    const rootNode = new NavNode({
        id: '/',
        name: navigation.name,
        children: createChildren({
            navigation,
            hRefBase: href,
            router,
            reactiveNavs,
        }),
        href,
    })
    return {
        rootNode,
        reactiveNavs,
    }
}

/**
 * Represents something resolvable.
 *
 * Important:
 *     When an observable is provided, only its **first emission** is accounted.
 */
export type Resolvable<T> = T | Promise<T> | Observable<T>

/**
 * The common part of a navigation node, whether it is static or dynamic.
 */
export type NavigationCommon = {
    /**
     * This function represents the view of the main content.
     *
     * @param router Router instance.
     * @returns A resolvable view
     */
    html: ({ router }) => Resolvable<AnyVirtualDOM>
    /**
     * This function represents the view of the table of content in the page.
     *
     * @param p arguments of the view generator:
     *   *  html : Content of the HTML page
     *   *  router : Router instance.
     * @returns A promise on the view
     */
    tableOfContent?: (p: {
        html: HTMLElement
        router: Router
    }) => Promise<AnyVirtualDOM>
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
     * Decoration configuration for the node.
     */
    decoration?: Decoration

    /**
     * Dynamic 'catch-all' sub-navigation resolver, used when the navigation is only known at runtime.
     *
     * The sub-paths defined in it can also be made reaction (using {@link ReactiveLazyNavResolver})
     * if changes in organisation over time are expected.
     */
    [CatchAllKey]?: LazyNavResolver | ReactiveLazyNavResolver

    /**
     * Static sub-navigation resolver.
     */
    [key: `/${string}`]: Navigation
}
