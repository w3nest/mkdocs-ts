import {
    fromMarkdown,
    Router,
    Views,
    installCodeApiModule,
} from '@youwol/mkdocs-ts'
import { setup } from '../auto-generated'

const tableOfContent = Views.tocView

const project = {
    name: 'mkdocs-ts',
    docBasePath: `/api/assets-gateway/raw/package/${setup.assetId}/${setup.version}/assets/api`,
}

function fromMd(file: string) {
    return fromMarkdown({
        url: `/api/assets-gateway/raw/package/${setup.assetId}/${setup.version}/assets/${file}`,
        placeholders: {
            '{{project}}': project.name,
        },
    })
}
const CodeApiModule = await installCodeApiModule()
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
                configuration: CodeApiModule.configurationTsTypedoc,
            }),
    },
}
