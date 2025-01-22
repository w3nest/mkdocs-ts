import {
    DefaultLayout,
    isResolvedTarget,
    LayoutUnion,
    Navigation,
    Router,
} from '../../lib'
import { mockMissingUIComponents } from './utils'
import {
    replace$,
    render,
    VirtualDOM,
    ChildrenLike,
    CSSAttribute,
    attr$,
} from 'rx-vdom'
import { CompositeLayout } from '../../lib'
import { filter } from 'rxjs'

type CustomLayoutOptions = {
    headerMessage: string
    footerMessage: string
}

type LayoutMap = {
    default: DefaultLayout.NavLayout
    custom: CustomLayoutOptions
}

const navigation: Navigation<
    LayoutUnion<LayoutMap>,
    DefaultLayout.NavHeader
> = {
    name: 'Home',
    layout: {
        kind: 'custom',
        headerMessage: 'Header of /home.',
        footerMessage: 'Footer of /home.',
    },
    routes: {
        '/foo': {
            name: 'Foo',
            layout: {
                kind: 'default',
                content: ({ router }) => {
                    return {
                        tag: 'div' as const,
                        innerText: attr$({
                            source$: router.target$.pipe(
                                filter((t) => isResolvedTarget(t)),
                            ),
                            vdomMap: (target) => {
                                //expect target.node type
                                return target.path
                            },
                        }),
                    }
                },
            },
        },
        '/ts-error': {
            name: 'TS Error',
            layout: {
                // This is to test wrong layout kind (e.g. when using JavaScript to define navigation)
                // @ts-expect-error
                kind: 'unregistered',
            },
        },
    },
}

class CustomLayout implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = 'CustomLayout'
    public readonly style: CSSAttribute

    public readonly router: Router<CustomLayoutOptions, DefaultLayout.NavHeader>

    constructor(params: {
        router: Router<CustomLayoutOptions, DefaultLayout.NavHeader>
        style: CSSAttribute
    }) {
        Object.assign(this, params)
        const source$ = this.router.target$.pipe(
            filter((t) => isResolvedTarget(t)),
        )

        this.children = replace$({
            policy: 'replace',
            source$: source$,
            vdomMap: (d) => {
                return [
                    {
                        tag: 'div',
                        class: 'CustomLayout-header',
                        innerText: d.node.layout.headerMessage,
                    },
                    {
                        tag: 'div',
                        class: 'CustomLayout-footer',
                        innerText: d.node.layout.footerMessage,
                    },
                ]
            },
        })
    }
}

test('generic layout', async () => {
    mockMissingUIComponents()

    let router = new Router({
        navigation,
    })
    const view = new CompositeLayout<LayoutMap, DefaultLayout.NavHeader>({
        router,
        layoutsFactory: {
            default: ({ router }) => {
                return new DefaultLayout.Layout({ router })
            },
            custom: ({ router }) =>
                new CustomLayout({
                    router,
                    style: { backgroundColor: 'blue' },
                }),
        },
        onNotFound: 'default',
        onPending: 'default',
    })
    document.body.append(render(view))

    await router.navigateTo({ path: '/' })
    const customLayout = document.querySelector<HTMLElement>('.CustomLayout')
    expect(customLayout?.style.backgroundColor).toBe('blue')
    const header = document.querySelector<HTMLElement>('.CustomLayout-header')
    expect(header?.innerText).toBe('Header of /home.')
    const footer = document.querySelector<HTMLElement>('.CustomLayout-footer')
    expect(footer?.innerText).toBe('Footer of /home.')

    await router.navigateTo({ path: '/foo' })
    const maybeHeader = document.querySelector<HTMLElement>('.CustomLayout')
    expect(maybeHeader).toBeFalsy()

    await router.navigateTo({ path: '/bar' })
    const defaultLayout = document.querySelector<HTMLElement>(
        '.mkdocs-DefaultLayoutView',
    )
    expect(defaultLayout).toBeTruthy()

    await router.navigateTo({ path: '/ts-error' })
    const notFound = document.querySelector<HTMLElement>(
        '.mkdocs-LayoutNotFoundView',
    )
    expect(notFound).toBeTruthy()
})
