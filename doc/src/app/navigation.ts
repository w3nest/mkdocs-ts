import { DefaultLayout, Navigation } from 'mkdocs-ts'
import { logo } from './logo'
import { fromMd } from './config.markdown'

import * as Install from './install'
import * as Tutorials from './tutorials'
import * as Api from './api'

export type AppNav = Navigation<
    DefaultLayout.NavLayout,
    DefaultLayout.NavHeader
>

export const navigation: AppNav = {
    name: 'mkDocs-TS',
    header: {
        icon: logo,
        wrapperClass: `${DefaultLayout.NavHeaderView.DefaultWrapperClass} border-bottom p-1`,
    },
    layout: {
        content: fromMd('index.md'),
    },
    routes: {
        '/install': Install.navigation,
        '/tutorials': Tutorials.navigation,
        '/api': Api.navigation,
    },
}
