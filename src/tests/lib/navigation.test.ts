import {
    Navigation,
    segment,
    Router,
    isResolvedTarget,
    LazyRoutesReturn,
    MockBrowser,
} from '../../lib'
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

function dynamicResolver({
    path,
}: {
    path: string
}): LazyRoutesReturn<TLayout, THeader> {
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
    beforeEach(async () => {
        router = new Router({
            navigation,
            browserClient: ({ router }) => new MockBrowser({ router }),
        })
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

    it('Navigates back and forth', async () => {
        const browser = router.browserClient as MockBrowser
        const initialLoadPath = await firstValueFrom(router.path$)
        expect(initialLoadPath).toBe('/')
        expect(browser.history).toHaveLength(1)
        expect(browser.history[0].path).toBe('/')
        expect(browser.hasPrev$.value).toBeFalsy()
        expect(browser.hasNext$.value).toBeFalsy()
        await router.navigateTo({ path: '/dynamic' })
        await router.navigateTo({ path: '/dynamic/foo', sectionId: 'section1' })
        await router.navigateTo({ path: '/dynamic/bar' })
        await router.navigateTo({
            path: '/dynamic/bar/baz',
            sectionId: 'section2',
        })
        expect(browser.history).toHaveLength(5)
        expect(browser.history.map((t) => t.path)).toEqual([
            '/',
            '/dynamic',
            '/dynamic/foo',
            '/dynamic/bar',
            '/dynamic/bar/baz',
        ])
        expect(browser.history.map((t) => t.sectionId)).toEqual([
            undefined,
            undefined,
            'section1',
            undefined,
            'section2',
        ])
        expect(browser.hasPrev$.value).toBeTruthy()
        expect(browser.hasNext$.value).toBeFalsy()
        const histo0 = browser.history
        expect(browser.currentIndex).toBe(4)
        await browser.prev()
        await browser.prev()
        await browser.prev()
        let path = await firstValueFrom(router.path$)

        expect(path).toBe('/dynamic')
        expect(browser.history).toBe(histo0)
        expect(browser.currentIndex).toBe(1)
        expect(browser.hasPrev$.value).toBeTruthy()
        expect(browser.hasNext$.value).toBeTruthy()

        await browser.next()
        const target = await firstValueFrom(router.target$)
        if (!isResolvedTarget(target)) {
            throw Error('Target is not resolved')
        }
        expect(target.path).toBe('/dynamic/foo')
        expect(target.sectionId).toBe('section1')
        expect(browser.history).toBe(histo0)
        expect(browser.currentIndex).toBe(2)
        expect(browser.hasPrev$.value).toBeTruthy()
        expect(browser.hasNext$.value).toBeTruthy()

        await router.navigateTo({ path: '/dynamic/bar/baz' })
        expect(browser.history.map((t) => t.path)).toEqual([
            '/',
            '/dynamic',
            '/dynamic/foo',
            '/dynamic/bar/baz',
        ])
        expect(browser.currentIndex).toBe(3)
        expect(browser.hasPrev$.value).toBeTruthy()
        expect(browser.hasNext$.value).toBeFalsy()
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
