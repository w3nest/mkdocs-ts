import { ImmutableTree } from '@youwol/rx-tree-views'
import { Router } from './router'
import { from, map } from 'rxjs'

export class Node extends ImmutableTree.Node {
    public readonly name: string
    public readonly href: string

    protected constructor({ id, name, children, href }) {
        super({ id, children })
        this.name = name
        this.href = href
    }
}

export class ExplicitNode extends Node {
    constructor({ id, name, children, href }) {
        super({ id, name, children, href })
    }
}

export function createImplicitChildren(
    generator: (p: {
        path: string
        router: Router
    }) => Promise<{
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
                    (n: string | { name: string; leaf: boolean }) => {
                        const href = hRefBase + '/' + n['name']
                        return new ExplicitNode({
                            id: href,
                            name: typeof n == 'string' ? n : n.name,
                            children:
                                typeof n != 'string' && n.leaf
                                    ? undefined
                                    : createImplicitChildren(
                                          generator,
                                          href,
                                          path + '/' + n['name'],
                                          [],
                                          router,
                                      ),
                            href,
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
    })
}
