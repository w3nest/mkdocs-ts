import { render } from '@youwol/rx-vdom'
import { navigation } from './navigation'
import { Router, Views } from '@youwol/mkdocs-ts'
import { setup } from '../auto-generated'

export const router = new Router({
    navigation,
})

document.getElementById('content').appendChild(
    render(
        new Views.DefaultLayoutView({
            router,
            name: 'MkDocs-TS',
            topBanner: (params) =>
                new Views.TopBannerClassicView({
                    ...params,
                    logo: {
                        tag: 'img',
                        src: '../assets/logo.svg',
                        style: {
                            height: '30px',
                        },
                    },
                    badge: new Views.SourcesLink({
                        href: 'https://github.com/youwol/mkdocs-ts/',
                        version: setup.version,
                        name: setup.name,
                    }),
                }),
        }),
    ),
)
