import {
    fromMarkdown,
    DefaultLayout,
    installCodeApiModule,
    installNotebookModule,
    Navigation,
    Router,
} from 'mkdocs-ts'
import { setup } from '../auto-generated'
import { firstValueFrom } from 'rxjs'
import { logo } from './logo'
import { example1 } from './js-plaground-examples'

const project = {
    name: 'mkdocs-ts',
    docBasePath: `../assets/api`,
}

const url = (restOfPath: string) => `../assets/${restOfPath}`

const placeholders = {
    '{{project}}': project.name,
    '{{mkdocs-version}}': setup.version,
    '{{URL-example1}}': `/apps/@w3nest/js-playground/latest?content=${encodeURIComponent(example1)}`,
    '{{assetsBasePath}}': `../assets`,
}
function fromMd(file: string) {
    return fromMarkdown({
        url: url(file),
        placeholders,
    })
}
const NotebookModule = await installNotebookModule()
const notebookOptions = {
    runAtStart: true,
    defaultCellAttributes: {
        lineNumbers: false,
    },
    markdown: {
        latex: true,
        placeholders,
    },
}
await Promise.all([
    firstValueFrom(
        NotebookModule.SnippetEditorView.fetchCmDependencies$('javascript'),
    ),
    firstValueFrom(
        NotebookModule.SnippetEditorView.fetchCmDependencies$('python'),
    ),
])

type AppNav = Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader>

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
        '/how-to': {
            name: 'How to',
            header: {
                icon: {
                    tag: 'i',
                    class: 'fas fa-question-circle me-1',
                },
            },
            layout: {
                content: fromMd('how-to.md'),
            },
            routes: {
                '/install': {
                    name: 'Install',
                    layout: {
                        content: fromMd('how-to.install.md'),
                    },
                },
                '/api-backend': {
                    name: 'Code API backends',
                    layout: {
                        content: fromMd('how-to.api-backend.md'),
                    },
                },
            },
        },
        '/tutorials': {
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
                '/basics': {
                    name: 'Getting started',
                    layout: {
                        content: ({ router }) =>
                            new NotebookModule.NotebookPage({
                                url: url('tutorials.basics.md'),
                                router,
                                options: notebookOptions,
                            }),
                    },
                },
                '/markdown': {
                    name: 'Markdown',
                    layout: {
                        content: ({ router }) =>
                            new NotebookModule.NotebookPage({
                                url: url('tutorials.markdown.md'),
                                router,
                                options: notebookOptions,
                            }),
                    },
                },
                '/code-api': {
                    name: 'Code API',
                    layout: {
                        content: fromMd('tutorials.code-api.md'),
                    },
                },
                '/notebook': {
                    name: 'Notebook',
                    layout: {
                        content: ({ router }) =>
                            new NotebookModule.NotebookPage({
                                url: url('tutorials.notebook.md'),
                                router,
                                options: notebookOptions,
                            }),
                    },
                    routes: {
                        '/import': {
                            name: 'Import',
                            layout: {
                                content: ({ router }) =>
                                    new NotebookModule.NotebookPage({
                                        url: url(
                                            'tutorials.notebook.import.md',
                                        ),
                                        router,
                                        options: notebookOptions,
                                    }),
                            },
                        },
                        '/scope': {
                            name: 'Scope & Mutations',
                            layout: {
                                content: ({ router }) =>
                                    new NotebookModule.NotebookPage({
                                        url: url('tutorials.notebook.scope.md'),
                                        router,
                                        options: notebookOptions,
                                    }),
                            },
                        },
                        '/python': {
                            name: 'Python',
                            layout: {
                                content: ({ router }) =>
                                    new NotebookModule.NotebookPage({
                                        url: url(
                                            'tutorials.notebook.python.md',
                                        ),
                                        router,
                                        options: notebookOptions,
                                    }),
                            },
                            routes: {
                                '/matplotlib': {
                                    name: 'Matplotlib',
                                    layout: {
                                        content: ({ router }) =>
                                            new NotebookModule.NotebookPage({
                                                url: url(
                                                    'tutorials.notebook.python.matplotlib.md',
                                                ),
                                                router,
                                                options: notebookOptions,
                                            }),
                                    },
                                },
                            },
                        },
                        '/workers': {
                            name: "Workers' Pool",
                            layout: {
                                content: ({ router }) =>
                                    new NotebookModule.NotebookPage({
                                        url: url(
                                            'tutorials.notebook.workers.md',
                                        ),
                                        router,
                                        options: notebookOptions,
                                    }),
                            },
                        },
                        '/interpreter': {
                            name: 'Interpreter',
                            layout: {
                                content: ({ router }) =>
                                    new NotebookModule.NotebookPage({
                                        url: url(
                                            'tutorials.notebook.interpreter.md',
                                        ),
                                        router,
                                        options: notebookOptions,
                                    }),
                            },
                        },
                        '/import-utils': {
                            name: 'Import Utilities',
                            layout: {
                                content: ({ router }) =>
                                    new NotebookModule.NotebookPage({
                                        url: url(
                                            'tutorials.notebook.import-utils.md',
                                        ),
                                        router,
                                        options: notebookOptions,
                                    }),
                            },
                        },
                    },
                },
            },
        },
        '/api': apiNav(),
        //
        // '/api': {
        //     name: 'API',
        //     header: {
        //         icon: {
        //             tag: 'i',
        //             class: 'fas fa-code me-1',
        //         },
        //     },
        //     layout: {
        //         content: fromMd('api.md'),
        //     },
        //     routes: ({ path, router }: { path: string; router: Router }) =>
        //         CodeApiModule.docNavigation({
        //             modulePath: path,
        //             router,
        //             project,
        //             configuration: {
        //                 ...CodeApiModule.configurationTsTypedoc,
        //                 notebook: true,
        //             },
        //         }),
        // },
    },
}

async function apiNav(): Promise<AppNav> {
    const CodeApiModule = await installCodeApiModule()

    return CodeApiModule.codeApiEntryNode({
        name: 'API',
        icon: {
            tag: 'i' as const,
            class: `fas fa-code`,
        },
        entryModule: 'mkdocs-ts',
        docBasePath: '../assets/api',
        configuration: CodeApiModule.configurationTsTypedoc,
    })
}
