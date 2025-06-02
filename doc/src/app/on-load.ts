import { render } from 'rx-vdom'
import { navigation } from './navigation'
import { Router, DefaultLayout } from 'mkdocs-ts'
import { BehaviorSubject } from 'rxjs'
import { createRootContext, inMemReporter } from './config.context'
import { AuthBadge } from '@w3nest/ui-tk/Badges'
import { Footer } from '@w3nest/ui-tk/Mkdocs'

import { companionNodes$ } from './common'

const ctx = createRootContext({
    threadName: 'App',
    labels: [],
})

console.log('In memory logs reporter', inMemReporter)

const footer = new Footer({
    license: 'MIT',
    copyrights: [
        { year: '2021-2024', holder: 'YouWol' },
        { year: '2025', holder: 'Guillaume Reinisch' },
    ],
    github: 'https://github.com/w3nest/mkdocs-ts',
    npm: 'https://www.npmjs.com/package/mkdocs-ts',
    docGithub: 'https://github.com/w3nest/mkdocs-ts/tree/main/doc',
})

export const router = new Router(
    {
        navigation,
    },
    ctx,
)

const bookmarks$ = new BehaviorSubject(['/install', '/tutorials', '/api'])

const routerView = new DefaultLayout.LayoutWithCompanion(
    {
        router,
        bookmarks$,
        topBanner: {
            logo: {
                icon: '../assets/favicon.svg',
                title: 'MkDocs-TS',
            },
            expandedContent: new DefaultLayout.BookmarksView({
                bookmarks$,
                router,
            }),
            badge: new AuthBadge(),
            // This is to place the app top banner above those from the tutorials.
            zIndex: 101,
        },
        footer,
        navFooter: true,
        displayOptions: {
            pageVertPadding: '3rem',
        },
        companionNodes$,
    },
    ctx,
)

document.body.appendChild(render(routerView))
