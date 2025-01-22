import {
    fromMarkdown,
    DefaultLayout,
    installCodeApiModule,
    installNotebookModule,
    Navigation,
    GlobalMarkdownViews,
    Router,
    MdWidgets,
} from 'mkdocs-ts'
import { setup } from '../auto-generated'
import { firstValueFrom } from 'rxjs'
import { logo } from './logo'
import { companionNodes$ } from './on-load'
import { example1 } from './js-plaground-examples'
import { ApiLink, CrossLink, ExtLink, SplitApiButton } from './md-widgets'
import { CSS3DModule } from './css-3d-renderer'
import { createRootContext } from './context-factory'

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
    '{{mkdocs-ts}}': '**`mkdocs-ts`**',
}
GlobalMarkdownViews.factory = {
    ...GlobalMarkdownViews.factory,
    'api-link': (elem: HTMLElement) => new ApiLink(elem),
    'ext-link': (elem: HTMLElement) => new ExtLink(elem),
    'cross-link': (elem: HTMLElement) => new CrossLink(elem),
    'split-api': () => new SplitApiButton(),
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

const notebookPage = (target: string, router: Router) => {
    const context = createRootContext({
        threadName: `Notebook(${target})`,
        labels: ['Notebook'],
    })
    return new NotebookModule.NotebookPage(
        {
            url: url(target),
            router,
            options: notebookOptions,
            initialScope: {
                const: {
                    CSS3DModule,
                },
                let: {},
            },
        },
        context,
    )
}

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
                    name: 'API Documentation',
                    layout: {
                        content: fromMd('how-to.api-backend.md'),
                    },
                    routes: {
                        '/typescript': {
                            name: 'Typescript',
                            layout: {
                                content: fromMd(
                                    'how-to.api-backend.typescript.md',
                                ),
                            },
                        },
                        '/python': {
                            name: 'Python',
                            layout: {
                                content: fromMd('how-to.api-backend.python.md'),
                            },
                        },
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
                            notebookPage('tutorials.basics.md', router),
                    },
                    routes: {
                        '/dynamic-nav': {
                            name: 'Dynamic Navigation',
                            layout: {
                                content: ({ router }) =>
                                    notebookPage(
                                        'tutorials.basics.dynamic-nav.md',
                                        router,
                                    ),
                            },
                        },
                        '/mutable-nav': {
                            name: 'Mutable Navigation',
                            layout: {
                                content: ({ router }) =>
                                    notebookPage(
                                        'tutorials.basics.mutable-nav.md',
                                        router,
                                    ),
                            },
                        },
                        '/custom-layout': {
                            name: 'Custom Layout',
                            layout: {
                                content: ({ router }) =>
                                    notebookPage(
                                        'tutorials.basics.custom-layout.md',
                                        router,
                                    ),
                            },
                        },
                        '/composite-layout': {
                            name: 'Composite Layout',
                            layout: {
                                content: ({ router }) =>
                                    notebookPage(
                                        'tutorials.basics.composite-layout.md',
                                        router,
                                    ),
                            },
                        },
                        '/typescript': {
                            name: 'Typescript',
                            layout: {
                                content: ({ router }) =>
                                    notebookPage(
                                        'tutorials.basics.typescript.md',
                                        router,
                                    ),
                            },
                        },
                        '/code-utils': {
                            name: 'Code Utilities',
                            layout: {
                                content: ({ router }) =>
                                    notebookPage(
                                        'tutorials.basics.code-utils.md',
                                        router,
                                    ),
                            },
                        },
                    },
                },
                '/markdown': {
                    name: 'Markdown',
                    layout: {
                        content: ({ router }) =>
                            notebookPage('tutorials.markdown.md', router),
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
                            notebookPage('tutorials.notebook.md', router),
                    },
                    routes: {
                        '/import': {
                            name: 'Import',
                            layout: {
                                content: ({ router }) =>
                                    notebookPage(
                                        'tutorials.notebook.import.md',
                                        router,
                                    ),
                            },
                        },
                        '/scope': {
                            name: 'Scope & Mutations',
                            layout: {
                                content: ({ router }) =>
                                    notebookPage(
                                        'tutorials.notebook.scope.md',
                                        router,
                                    ),
                            },
                        },
                        '/python': {
                            name: 'Python',
                            layout: {
                                content: ({ router }) =>
                                    notebookPage(
                                        'tutorials.notebook.python.md',
                                        router,
                                    ),
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
                                    notebookPage(
                                        'tutorials.notebook.workers.md',
                                        router,
                                    ),
                            },
                        },
                        '/interpreter': {
                            name: 'Interpreter',
                            layout: {
                                content: ({ router }) =>
                                    notebookPage(
                                        'tutorials.notebook.interpreter.md',
                                        router,
                                    ),
                            },
                        },
                        '/import-utils': {
                            name: 'Import Utilities',
                            layout: {
                                content: ({ router }) =>
                                    notebookPage(
                                        'tutorials.notebook.import-utils.md',
                                        router,
                                    ),
                            },
                        },
                    },
                },
            },
        },
        '/api': apiNav(),
    },
}

async function apiNav(): Promise<AppNav> {
    const CodeApiModule = await installCodeApiModule()
    // This is to preload for javascript snippets included in the API documentation, such that the `scrollTo` is
    // working well.
    await firstValueFrom(
        MdWidgets.CodeSnippetView.fetchCmDependencies$('javascript'),
    )
    return CodeApiModule.codeApiEntryNode({
        name: 'API',
        header: {
            icon: {
                tag: 'i' as const,
                class: `fas fa-code`,
            },
            actions: [
                DefaultLayout.splitCompanionAction({
                    path: '/api',
                    companionNodes$,
                }),
            ],
        },
        entryModule: 'mkdocs-ts',
        docBasePath: '../assets/api',
        configuration: {
            ...CodeApiModule.configurationTsTypedoc,
            notebook: {
                options: {
                    runAtStart: true,
                    markdown: {
                        placeholders,
                    },
                },
            },
            mdParsingOptions: {
                placeholders,
            },
        },
    })
}
