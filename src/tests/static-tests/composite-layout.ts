import { AssertTrue, IsExact } from 'conditional-type-checks'
import {
    CompositeLayout,
    DefaultLayout,
    LayoutUnion,
    Navigation,
    Router,
} from '../../lib'
import { PresentationLayout, Slide } from '../lib/custom-layout.test'

//------------------------------------------------------------------------------
// Scenario with a common header data-structure
//------------------------------------------------------------------------------
{
    type LayoutOptionsMap = {
        default: DefaultLayout.NavLayout
        presentation: Slide
    }
    const navigation: Navigation<
        LayoutUnion<LayoutOptionsMap>,
        DefaultLayout.NavHeader
    > = {
        name: 'Default Example',
        layout: {
            kind: 'default',
            content: ({ router }) => {
                type _ = AssertTrue<
                    IsExact<
                        typeof router,
                        Router<DefaultLayout.NavLayout, unknown>
                    >
                >
                return document.createElement('div')
            },
        },
        routes: {
            '/presentation': {
                name: 'Presentation Example',
                layout: {
                    kind: 'presentation',
                    title: '',
                    subTitle: { kind: 'text', text: 'foo' },
                    elements: [],
                },
            },
        },
    }
    const router = new Router({ navigation })
    const _ = new CompositeLayout({
        router,
        layoutsFactory: {
            default: ({ router }) => {
                type _ = AssertTrue<
                    IsExact<
                        typeof router,
                        Router<DefaultLayout.NavLayout, DefaultLayout.NavHeader>
                    >
                >
                return new DefaultLayout.Layout({ router })
            },
            presentation: ({ router }) => {
                type _0 = AssertTrue<
                    IsExact<
                        typeof router,
                        Router<Slide, DefaultLayout.NavHeader>
                    >
                >
                return new PresentationLayout({ router })
            },
        },
        onPending: 'default',
        onNotFound: 'default',
    })
}
