import { ImmutableTree } from '@youwol/rx-tree-views'
import { Router } from './router'
import { from, map, Observable } from 'rxjs'
import { AnyVirtualDOM } from '@youwol/rx-vdom'

export class Node extends ImmutableTree.Node {
    public readonly name: string
    public readonly href: string

    public readonly wrapperClass: string | Observable<string>
    public readonly icon: AnyVirtualDOM
    public readonly customView: AnyVirtualDOM
    public readonly actions: AnyVirtualDOM[]

    protected constructor({
        id,
        name,
        children,
        href,
        wrapperClass,
        icon,
        customView,
        actions,
    }) {
        super({ id, children })
        this.name = name
        this.href = href
        this.wrapperClass = wrapperClass
        this.icon = icon
        this.customView = customView
        this.actions = actions
    }
}

export class ExplicitNode extends Node {
    constructor({
        id,
        name,
        children,
        href,
        wrapperClass,
        icon,
        customView,
        actions,
    }: {
        id: string
        name: string
        href: string
        children?: Node[] | Observable<Node[]>
        wrapperClass?: string | Observable<string>
        icon?: AnyVirtualDOM
        customView?: AnyVirtualDOM
        actions?: AnyVirtualDOM[]
    }) {
        super({
            id,
            name,
            children,
            href,
            wrapperClass,
            icon,
            customView,
            actions,
        })
    }
}

export function createImplicitChildren(
    generator: (p: { path: string; router: Router }) => Promise<{
        name: string
        children: string[] | { name: string; leaf: boolean }[]
    }>,
    hRefBase: string,
    path: string,
    withExplicit: ExplicitNode[],
    router: Router,
) {
    const node = generator({ path, router })

    return from(node).pipe(
        map(({ children }) => {
            return [
                ...children.map(
                    (
                        n:
                            | string
                            | {
                                  name: string
                                  id?: string
                                  wrapperClass?: string
                                  icon?: AnyVirtualDOM
                                  customView?: AnyVirtualDOM
                                  actions?: AnyVirtualDOM[]
                                  leaf: boolean
                              },
                    ) => {
                        const href = hRefBase + '/' + (n['id'] || n['name'])
                        return new ExplicitNode({
                            id: href,
                            name: typeof n == 'string' ? n : n.name,
                            children:
                                typeof n != 'string' && n.leaf
                                    ? undefined
                                    : createImplicitChildren(
                                          generator,
                                          href,
                                          path + '/' + (n['id'] || n['name']),
                                          [],
                                          router,
                                      ),
                            href,
                            wrapperClass:
                                typeof n == 'string'
                                    ? undefined
                                    : n.wrapperClass,
                            icon: typeof n == 'string' ? undefined : n.icon,
                            customView:
                                typeof n == 'string' ? undefined : n.customView,
                            actions:
                                typeof n == 'string' ? undefined : n.actions,
                        })
                    },
                ),
                ...withExplicit,
            ]
        }),
    )
}

export function createChildren(navigation, hRefBase: string, router: Router) {
    const explicitChildren = Object.entries(navigation)
        .filter(([k]) => k.startsWith('/') && k !== '/**')
        .map(([k, v]) => {
            const href = hRefBase + k
            return new ExplicitNode({
                id: href,
                name: v['name'],
                children: createChildren(navigation[k], hRefBase + k, router),
                href,
                wrapperClass: v['wrapperClass'],
                icon: v['icon'],
                customView: v['customView'],
                actions: v['actions'],
            })
        })
    if (navigation['/**']) {
        const node = navigation['/**']
        return createImplicitChildren(
            node,
            hRefBase,
            '',
            explicitChildren,
            router,
        )
    }

    return explicitChildren.length == 0 ? undefined : explicitChildren
}
export function createRootNode(navigation, router: Router) {
    const href = ''
    return new ExplicitNode({
        id: '/',
        name: navigation.name,
        children: createChildren(navigation, href, router),
        href,
        wrapperClass: '',
        icon: undefined,
        customView: undefined,
    })
}
