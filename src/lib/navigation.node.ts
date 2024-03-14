import { ImmutableTree } from '@youwol/rx-tree-views'
import { Router } from './router'
import { from, map, Observable } from 'rxjs'
import {
    AnyVirtualDOM,
    AttributeLike,
    ChildrenLike,
    ChildLike,
} from '@youwol/rx-vdom'

export type Decoration = {
    wrapperClass?: AttributeLike<string>
    icon?: ChildLike
    actions?: ChildrenLike
}

export type NavNodeParams = {
    id: string
    name: string
    href: string
    data?: unknown
    children?: NavNodeBase[] | Observable<NavNodeBase[]>
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

export type NavNodeInput = Omit<NavNodeParams, 'href' | 'children'> & {
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

export type Resolvable<T> = T | Promise<T> | Observable<T>

export type NavigationCommon = {
    html: ({ router }) => AnyVirtualDOM
    tableOfContent?: (p: {
        html: HTMLElement
        router: Router
    }) => Promise<AnyVirtualDOM>
}

export type CatchAllNav = Resolvable<
    NavigationCommon & { children: NavNodeInput[] }
>

export type LazyNavResolver = (p: {
    path: string
    router: Router
}) => CatchAllNav
export type ReactiveLazyNavResolver = Observable<LazyNavResolver>

export const CatchAllKey = '...'
export type Navigation = NavigationCommon & {
    name: string
    decoration?: Decoration
    [CatchAllKey]?: LazyNavResolver | ReactiveLazyNavResolver
    [key: `/${string}`]: Navigation
}
