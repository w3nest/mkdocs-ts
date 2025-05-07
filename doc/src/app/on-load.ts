import { render, VirtualDOM, ChildrenLike, CSSAttribute } from 'rx-vdom'
import { navigation } from './navigation'
import { Router, DefaultLayout, MdWidgets } from 'mkdocs-ts'
import { BehaviorSubject } from 'rxjs'
import { createRootContext, inMemReporter } from './config.context'
import { AuthBadge } from '@w3nest/ui-tk/Badges'
import { Footer } from '@w3nest/ui-tk/Mkdocs'

export const companionNodes$ = new BehaviorSubject<string[]>([])

const ctx = createRootContext({
    threadName: 'App',
    labels: [],
})

console.log('In memory logs reporter', inMemReporter)

const footer = new Footer({
    license: 'MIT',
    copyrights: [
        { year: '2021', holder: 'YouWol' },
        { year: '2025', holder: 'Guillaume Reinisch' },
    ],
    github: 'https://github.com/w3nest/py-w3nest',
    pypi: 'https://pypi.org/project/w3nest/',
    docGithub: 'https://github.com/w3nest/py-w3nest/tree/main/doc/front-app',
})

export const router = new Router(
    {
        navigation,
    },
    ctx,
)

const bookmarks$ = new BehaviorSubject(['/', '/how-to', '/tutorials', '/api'])
export const topStickyPaddingMax = '3rem'

export class NavHeaderView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex align-items-center justify-content-center'
    public readonly children: ChildrenLike
    public readonly style: CSSAttribute

    constructor(params: { topStickyPaddingMax: string }) {
        this.style = {
            height: params.topStickyPaddingMax,
        }
        this.children = [
            {
                tag: 'a',
                class: 'mx-2',
                href: 'https://github.com/w3nest/mkdocs-ts',
                children: [
                    {
                        ...MdWidgets.githubIcon,
                        style: {
                            filter: 'invert(1)',
                        },
                    },
                ],
            },
            {
                tag: 'a',
                class: 'mx-2',
                href: 'https://www.npmjs.com/package/mkdocs-ts',
                children: [MdWidgets.npmIcon],
            },
            {
                tag: 'a',
                class: 'mx-2',
                href: 'https://github.com/w3nest/mkdocs-ts/blob/main/doc/LICENSE',
                children: [MdWidgets.mitIcon],
            },
        ]
    }
}

const routerView = new DefaultLayout.LayoutWithCompanion(
    {
        router,
        bookmarks$,
        topBanner: {
            logoUrl: '../assets/favicon.svg',
            title: 'MkDocs-TS',
            expandedContent: new DefaultLayout.BookmarksView({
                bookmarks$,
                router,
            }),
            badge: new AuthBadge(),
        },
        footer,
        displayOptions: {
            pageVertPadding: '3rem',
        },
        /*sideNavHeader: () => new NavHeaderView({ topStickyPaddingMax }),
        sideNavFooter: () =>
            new DefaultLayout.FooterView({
                sourceName: '@mkdocs-ts/doc',
                sourceUrl: 'https://github.com/w3nest/mkdocs-ts/tree/main/doc',
            }),*/
        companionNodes$
    },
    ctx,
)

document.body.appendChild(render(routerView))
