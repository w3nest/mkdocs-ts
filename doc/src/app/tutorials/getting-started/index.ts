import { AppNav } from '../../navigation'
import { notebookPage } from '../../config.notebook'
import { headerEmoji } from '../../common'

export const navigation: AppNav = {
    name: 'Getting started',
    header: headerEmoji('🚀'),
    layout: {
        content: ({ router }) => notebookPage('tutorials.basics.md', router),
    },
    routes: {
        '/dynamic-nav': {
            name: 'Dynamic Navigation',
            layout: {
                content: ({ router }) =>
                    notebookPage('tutorials.basics.dynamic-nav.md', router),
            },
            routes: {
                '/mutable-nav': {
                    name: 'Mutable Navigation',
                    layout: {
                        content: ({ router }) =>
                            notebookPage(
                                'tutorials.basics.dynamic-nav.mutable-nav.md',
                                router,
                            ),
                    },
                },
            },
        },
        '/custom-layout': {
            name: 'Custom Layout',
            layout: {
                content: ({ router }) =>
                    notebookPage('tutorials.basics.custom-layout.md', router),
            },
            routes: {
                '/composite-layout': {
                    name: 'Composite Layout',
                    layout: {
                        content: ({ router }) =>
                            notebookPage(
                                'tutorials.basics.custom-layout.composite-layout.md',
                                router,
                            ),
                    },
                },
            },
        },
        '/typescript': {
            name: 'Typescript',
            layout: {
                content: ({ router }) =>
                    notebookPage('tutorials.basics.typescript.md', router),
            },
        },
        '/code-utils': {
            name: 'Code Utilities',
            layout: {
                content: ({ router }) =>
                    notebookPage('tutorials.basics.code-utils.md', router),
            },
        },
    },
}
