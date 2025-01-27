import { AppNav } from '../navigation'
import { fromMd } from '../config.markdown'
import { notebookPage } from '../config.notebook'

import * as GettingStarted from './getting-started'
import * as Notebook from './notebook'

export const navigation: AppNav = {
    name: 'Tutorials',
    header: {
        icon: {
            tag: 'i',
            class: 'fas fa-graduation-cap me-1',
        },
    },
    layout: {
        content: fromMd('tutorials.md'),
    },
    routes: {
        '/basics': GettingStarted.navigation,
        '/markdown': {
            name: 'Markdown',
            layout: ({ router }) =>
                notebookPage('tutorials.markdown.md', router),
        },
        '/code-api': {
            name: 'Code API',
            layout: ({ router }) =>
                notebookPage('tutorials.code-api.md', router),
        },
        '/notebook': Notebook.navigation,
    },
}
