import { Navigation, segment, Router, isResolvedTarget } from '../../lib'
import { DefaultLayout } from '../../lib'
import { filter, firstValueFrom, map, Subject } from 'rxjs'
import { navigateAndAssert } from './utils'
import { AnyVirtualDOM } from 'rx-vdom'

const nodeBase = (name: string) => ({
    name,
    header: () => ({
        icon: { tag: 'i' as const },
    }),
    layout: {
        content: (): AnyVirtualDOM => ({
            tag: 'div',
            children: [
                {
                    tag: 'h1',
                    id: 'section1',
                    innerText: 'Section',
                },
                {
                    tag: 'h2',
                    id: 'sub-section',
                    innerText: 'Sub Section',
                },
            ],
        }),
    },
})

function dynamicResolver({ path }: { path: string }) {
    const parts = path.split('/').filter((c) => c !== '')
    if (parts.length === 0) {
        return {
            [segment('/foo')]: {
                ...nodeBase('Foo'),
                leaf: true,
            },
            [segment('/bar')]: {
                ...nodeBase('Bar'),
                leaf: false,
            },
        }
    }
    if (parts.length === 1 && parts[0] === 'bar') {
        return {
            [segment('/baz')]: {
                ...nodeBase('Baz'),
                leaf: true,
            },
        }
    }
}

type TLayout = DefaultLayout.NavLayout
type THeader = DefaultLayout.NavHeader
const dynamicRouterInput$ = new Subject<string[]>()
const navigation: Navigation<TLayout, THeader> = {
    ...nodeBase('Home'),
    routes: {
        [segment('/static')]: {
            ...nodeBase('Static'),
            routes: {
                [segment('/foo')]: nodeBase('Foo'),
                [segment('/bar')]: Promise.resolve(nodeBase('Bar')),
            },
        },
        [segment('/dynamic')]: {
            ...nodeBase('Dynamic'),
            routes: dynamicResolver,
        },
        [segment('/dynamic$')]: {
            ...nodeBase('Dynamic$'),
            routes: dynamicRouterInput$.pipe(
                map((paths) => {
                    /*'foo', 'bar', etc */
                    return ({ path }) => {
                        const parts = path.split('/').filter((c) => c !== '')
                        if (parts.length === 0) {
                            return paths.reduce((acc, p) => {
                                return {
                                    ...acc,
                                    [segment(`/${p}`)]: {
                                        ...nodeBase(p),
                                        leaf: true,
                                    },
                                }
                            }, {})
                        }
                    }
                }),
            ),
        },
    },
}

describe('Navigation static', () => {
    let router: Router
    beforeAll(() => {
        router = new Router({ navigation })
    })
    it("Should load on '/'", async () => {
        const initialLoadPath = await firstValueFrom(router.path$)
        expect(initialLoadPath).toBe('/')
    })
    it.each([
        ['/', 'Home'],
        ['/static', 'Static'],
        ['/static/foo', 'Foo'],
        ['/static/bar', 'Bar'],
    ])("Navigates to '%i'", async (path, name) => {
        await navigateAndAssert(router, path, name)
    })

    it('Navigates to not found target', async () => {
        await router.navigateTo({ path: '/static/baz' })
        const unresolvedTarget = await firstValueFrom(router.target$)
        if (isResolvedTarget(unresolvedTarget)) {
            throw new Error(`Node at path '/static/baz' should not be resolved`)
        }
        expect(unresolvedTarget.reason).toBe('NotFound')
    })
})

describe('Navigation dynamic', () => {
    let router: Router
    beforeAll(() => {
        router = new Router({ navigation })
    })
    it.each([
        ['/', 'Home'],
        ['/dynamic', 'Dynamic'],
        ['/dynamic/foo', 'Foo'],
        ['/dynamic/bar', 'Bar'],
        ['/dynamic/bar/baz', 'Baz'],
    ])("Navigates to '%i'", async (path, name) => {
        await navigateAndAssert(router, path, name)
    })

    it('Navigates to not found target', async () => {
        await router.navigateTo({ path: '/dynamic/foo/baz' })
        const unresolvedTarget = await firstValueFrom(router.target$)
        if (isResolvedTarget(unresolvedTarget)) {
            throw new Error(
                `Node at path '/dynamic/foo/baz' should not be resolved`,
            )
        }
        expect(unresolvedTarget.reason).toBe('NotFound')
    })
})

describe('Navigation dynamic$', () => {
    let router: Router
    beforeAll(() => {
        router = new Router({ navigation })
    })

    it('Navigates from unresolved to resolved', async () => {
        router.fireNavigateTo({ path: '/dynamic$/foo' })
        const unresolvedTarget = await firstValueFrom(
            router.target$.pipe(filter((t) => t.path.startsWith('/dynamic$'))),
        )
        if (isResolvedTarget(unresolvedTarget)) {
            throw new Error(
                `Node at path '/dynamic$/foo' should not be resolved`,
            )
        }
        expect(unresolvedTarget.reason).toBe('Pending')
        dynamicRouterInput$.next(['foo'])
        const resolvedTarget = await firstValueFrom(
            router.target$.pipe(
                filter(
                    (t) =>
                        t.path.startsWith('/dynamic$') && isResolvedTarget(t),
                ),
            ),
        )
        if (!isResolvedTarget(resolvedTarget)) {
            throw new Error(`Node at path '/dynamic$/foo' should be resolved`)
        }
        expect(resolvedTarget.node.name).toBe('foo')
    })
})

describe('Navigation history', () => {
    let router: Router
    beforeAll(() => {
        router = new Router({ navigation })
    })
    it('Navigates forward & backward with popstate', async () => {
        await navigateAndAssert(router, '/static', 'Static')
        const event = new PopStateEvent('popstate', {
            state: { target: { path: '/' } },
        })
        window.dispatchEvent(event)
        const target = await firstValueFrom(
            router.target$.pipe(
                filter((t) => isResolvedTarget(t) && t.path === '/'),
            ),
        )
        if (!isResolvedTarget(target)) {
            throw new Error(`Node after 'popState' should be resolved`)
        }
        expect(target.node.name).toBe('Home')
    })
})
