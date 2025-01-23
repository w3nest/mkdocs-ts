import {
    AnyView,
    DefaultLayout,
    LazyRoutes,
    LazyRoutesReturn,
    Navigation,
    NavNodeData,
    Router,
    SegmentsRecord,
} from '../../lib'
import { map, of } from 'rxjs'

type NavLayout = DefaultLayout.NavLayout
type NavHeader = DefaultLayout.NavHeader
//------------------------------------------------------------------------------
// An example that correctly infer navigation structure with not type hint
//------------------------------------------------------------------------------
{
    const navigation = {
        name: 'home',
        layout: () => document.createElement('div'),
    }
    const _ = new DefaultLayout.Layout({
        router: new Router({ navigation }),
    })
}
//------------------------------------------------------------------------------
// When using VirtualDOM to define views
//------------------------------------------------------------------------------
{
    // An example that correctly infer navigation structure
    const navigation = {
        name: 'home',
        layout: () => ({ tag: 'div' }),
    }
    const _ = new DefaultLayout.Layout({
        // @ts-expect-error content is inferred with `tag: string` and not `tag:'div'`
        router: new Router({ navigation }),
    })
    // Solution 1
    {
        const navigation: Navigation<NavLayout, NavHeader> = {
            name: 'home',
            layout: () => ({ tag: 'div' }),
        }
        const _ = new DefaultLayout.Layout({
            router: new Router({ navigation }),
        })
    }
    // Solution 2
    {
        const navigation = {
            name: 'home',
            layout: () => ({ tag: 'div' as const }),
        }
        const _ = new DefaultLayout.Layout({
            router: new Router({ navigation }),
        })
    }
    // Solution 3
    {
        const navigation = {
            name: 'home',
            // Or AnyVirtualDOM, or VirtualDOM<'div'>
            layout: (): AnyView => ({ tag: 'div' }),
        }
        const _ = new DefaultLayout.Layout({
            router: new Router({ navigation }),
        })
    }
}
//------------------------------------------------------------------------------
// With static children
//------------------------------------------------------------------------------
{
    const navigation = {
        name: 'home',
        layout: () => ({ tag: 'div' as const }),
        routes: {
            '/foo': {
                name: 'Foo',
                layout: () => ({ tag: 'div' as const }),
            },
        },
    }
    const _ = new DefaultLayout.Layout({
        router: new Router({ navigation }),
    })
}

//------------------------------------------------------------------------------
// With LazyChildren
//------------------------------------------------------------------------------
{
    const navigation = {
        name: 'home',
        layout: () => ({ tag: 'div' as const }),
        routes: () => {
            return {
                '/bar-1': {
                    name: 'Bar/Bar1',
                    layout: () => ({ tag: 'div' }),
                },
            }
        },
    }
    const _ = new DefaultLayout.Layout({
        // @ts-expect-error content is inferred with `tag: string` and not `tag:'div'`
        router: new Router({ navigation }),
    })
    // Solution 1
    {
        const navigation: Navigation<NavLayout, NavHeader> = {
            name: 'home',
            layout: () => ({ tag: 'div' }),
            routes: () => {
                return {
                    '/foo': {
                        name: 'Foo',
                        layout: () => ({ tag: 'div' }),
                    },
                }
            },
        }
        const _ = new DefaultLayout.Layout({
            router: new Router({ navigation }),
        })
    }
}
//------------------------------------------------------------------------------
// With LazyChildren$
//------------------------------------------------------------------------------
{
    const navigation = {
        name: 'home',
        layout: () => ({ tag: 'div' as const }),
        routes: of({ tag: 'div' }).pipe(
            map(({ tag }) => () => {
                return {
                    '/foo': {
                        name: 'Foo',
                        layout: () => ({ tag }),
                    },
                }
            }),
        ),
    }
    const _ = new DefaultLayout.Layout({
        // @ts-expect-error content is inferred with `tag: string` and not `tag:'div'`
        router: new Router({ navigation }),
    })
    // Solution 1
    {
        const navigation: Navigation<NavLayout, NavHeader> = {
            name: 'home',
            layout: () => ({ tag: 'div' }),
            routes: of({ tag: 'div' }).pipe(
                map(({ tag }) => () => {
                    return {
                        '/foo': {
                            name: 'Foo',
                            layout: () => ({ tag }),
                        },
                    } as LazyRoutes<NavLayout, NavHeader>
                }),
            ),
        }
        const _ = new DefaultLayout.Layout({
            router: new Router({ navigation }),
        })
    }
    // Solution 2
    {
        const navigation = {
            name: 'home',
            layout: () => ({ tag: 'div' as const }),
            routes: of({ tag: 'div' as const }).pipe(
                map(({ tag }) => () => {
                    return {
                        '/foo': {
                            name: 'Foo',
                            layout: () => ({ tag }),
                        },
                    }
                }),
            ),
        }
        const _ = new DefaultLayout.Layout({
            router: new Router({ navigation }),
        })
    }
}
//------------------------------------------------------------------------------
// With LazyChildren subtle error
//------------------------------------------------------------------------------
{
    const navigation: Navigation<NavLayout, NavHeader> = {
        name: 'home',
        layout: () => ({ tag: 'div' }),
        // @ts-expect-error I wish this does not happen.
        // The return is `{ foo?: ...} | { bar?: ...}` instead `Record<string, ...>`
        routes: ({ path }) => {
            if (path) {
                return {
                    '/foo': {
                        name: 'Foo',
                        layout: () => ({ tag: 'div' }),
                    },
                }
            }
            if (!path) {
                return {
                    '/bar': {
                        name: 'Bar',
                        layout: () => ({ tag: 'div' }),
                    },
                }
            }
        },
    }
    const _ = new DefaultLayout.Layout({
        router: new Router({ navigation }),
    })
    // Solution 1
    {
        const navigation: Navigation<NavLayout, NavHeader> = {
            name: 'home',
            layout: () => ({ tag: 'div' }),
            routes: ({ path }): LazyRoutesReturn<NavLayout, NavHeader> => {
                if (path) {
                    return {
                        '/foo': {
                            name: 'Foo',
                            layout: () => ({ tag: 'div' }),
                        },
                    }
                }
                if (!path) {
                    return {
                        '/bar': {
                            name: 'Bar',
                            layout: () => ({ tag: 'div' }),
                        },
                    }
                }
            },
        }
        const _ = new DefaultLayout.Layout({
            router: new Router({ navigation }),
        })
    }
}
