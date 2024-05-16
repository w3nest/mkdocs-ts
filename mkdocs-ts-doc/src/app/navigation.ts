import {
    fromMarkdown,
    Router,
    Views,
    installCodeApiModule,
    installNotebookModule,
} from '@youwol/mkdocs-ts'
import { setup } from '../auto-generated'
import { firstValueFrom } from 'rxjs'

const tableOfContent = Views.tocView

const project = {
    name: 'mkdocs-ts',
    docBasePath: `/api/assets-gateway/raw/package/${setup.assetId}/${setup.version}/assets/api`,
}

const url = (restOfPath: string) =>
    `/api/assets-gateway/raw/package/${setup.assetId}/${setup.version}/assets/${restOfPath}`

const placeholders = {
    '{{project}}': project.name,
    '{{mkdocs-version}}': setup.version,
}
function fromMd(file: string) {
    return fromMarkdown({
        url: url(file),
        placeholders,
    })
}
const CodeApiModule = await installCodeApiModule()
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

export const navigation = {
    name: project.name,
    tableOfContent,
    html: fromMd('index.md'),
    '/how-to': {
        name: 'How to',
        tableOfContent,
        html: fromMd('how-to.md'),
        '/install': {
            name: 'Install',
            tableOfContent,
            html: fromMd('how-to.install.md'),
        },
        '/api-backend': {
            name: 'Code API backends',
            tableOfContent,
            html: fromMd('how-to.api-backend.md'),
        },
    },
    '/tutorials': {
        name: 'Tutorials',
        tableOfContent,
        html: fromMd('tutorials.md'),
        '/basics': {
            name: 'Getting started',
            tableOfContent,
            html: fromMd('tutorials.basics.md'),
        },
        '/markdown': {
            name: 'Markdown',
            tableOfContent,
            html: fromMd('tutorials.markdown.md'),
        },
        '/code-api': {
            name: 'Code API',
            tableOfContent,
            html: fromMd('tutorials.code-api.md'),
        },
        '/notebook': {
            name: 'Notebook',
            tableOfContent,
            html: ({ router }) =>
                new NotebookModule.NotebookPage({
                    url: url('tutorials.notebook.md'),
                    router,
                    options: notebookOptions,
                }),
            '/import': {
                name: 'Import',
                tableOfContent,
                html: ({ router }) =>
                    new NotebookModule.NotebookPage({
                        url: url('tutorials.notebook.import.md'),
                        router,
                        options: notebookOptions,
                    }),
                '/from-page': {
                    name: 'From a page',
                    tableOfContent,
                    html: ({ router }) =>
                        new NotebookModule.NotebookPage({
                            url: url('tutorials.notebook.import.from-page.md'),
                            router,
                            options: notebookOptions,
                        }),
                },
            },
            '/python': {
                name: 'Python',
                tableOfContent,
                html: ({ router }) =>
                    new NotebookModule.NotebookPage({
                        url: url('tutorials.notebook.python.md'),
                        router,
                        options: notebookOptions,
                    }),
                '/utils': {
                    name: 'Utils',
                    tableOfContent,
                    html: ({ router }) =>
                        new NotebookModule.NotebookPage({
                            url: url('tutorials.notebook.python.utils.md'),
                            router,
                            options: { ...notebookOptions, runAtStart: false },
                        }),
                },
            },
        },
    },
    '/api': {
        name: 'API',
        html: fromMd('api.md'),
        tableOfContent,
        '...': ({ path, router }: { path: string; router: Router }) =>
            CodeApiModule.docNavigation({
                modulePath: path,
                router,
                project,
                configuration: {
                    ...CodeApiModule.configurationTsTypedoc,
                    notebook: true,
                },
            }),
    },
}
