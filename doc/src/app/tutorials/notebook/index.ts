import { headerEmoji } from '../../common'
import { notebookPage } from '../../config.notebook'
import { AppNav } from '../../navigation'

export const navigation: AppNav = {
    name: 'Notebook',
    header: headerEmoji('📓'),
    layout: {
        content: ({ router }) => notebookPage('tutorials.notebook.md', router),
    },
    routes: {
        '/import': {
            name: 'Import',
            layout: {
                content: ({ router }) =>
                    notebookPage('tutorials.notebook.import.md', router),
            },
        },
        '/python': {
            name: 'Python',
            layout: {
                content: ({ router }) =>
                    notebookPage('tutorials.notebook.python.md', router),
            },
            routes: {
                '/matplotlib': {
                    name: 'Matplotlib',
                    layout: {
                        content: ({ router }) =>
                            notebookPage(
                                'tutorials.notebook.python.matplotlib.md',
                                router,
                            ),
                    },
                },
            },
        },
        '/workers': {
            name: "Workers' Pool",
            layout: {
                content: ({ router }) =>
                    notebookPage('tutorials.notebook.workers.md', router),
            },
        },
        '/interpreter': {
            name: 'Interpreter',
            layout: {
                content: ({ router }) =>
                    notebookPage('tutorials.notebook.interpreter.md', router),
            },
        },
        '/import-utils': {
            name: 'Import Utilities',
            layout: {
                content: ({ router }) =>
                    notebookPage('tutorials.notebook.import-utils.md', router),
            },
        },
    },
}
