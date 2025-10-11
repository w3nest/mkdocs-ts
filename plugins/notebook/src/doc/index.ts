import type * as CodeApiModule from '@mkdocs-ts/code-api'
import * as webpm from '@w3nest/webpm-client'
import { Navigation, DefaultLayout, Router, ViewGenerator } from 'mkdocs-ts'
import * as NotebookModule from '..'
import pkJson from '../../package.json'

const baseUrl = webpm.getUrlBase('@mkdocs-ts/notebook', pkJson.version)

const placeholders = {
    '{{mkdocs-version}}': pkJson.webpm.dependencies['mkdocs-ts'],
    '{{notebook-version}}': pkJson.version,
}

export const notebookOptions = {
    runAtStart: true,
    defaultCellAttributes: {
        lineNumbers: false,
    },
    markdown: {
        latex: true,
        placeholders,
    },
}

export async function installNotebookModule() {
    const { Notebook } = await webpm.install<{
        Notebook: typeof NotebookModule
    }>({
        esm: [`@mkdocs-ts/notebook#${pkJson.version} as Notebook`],
        css: [`@mkdocs-ts/notebook#${pkJson.version}~assets/notebook.css`],
    })
    return Notebook
}
export const url = (restOfPath: string) => `${baseUrl}/assets/${restOfPath}`

export const notebookPage = async (target: string, router: Router) => {
    const Notebook = await installNotebookModule()

    return new Notebook.NotebookPage({
        url: url(target),
        router,
        options: notebookOptions,
        initialScope: {
            const: {
                webpm,
            },
            let: {},
        },
    })
}

export async function installCodeApiModule() {
    const codeApiVersion = pkJson.webpm.dependencies['@mkdocs-ts/code-api']
    const { CodeApi } = await webpm.install<{
        CodeApi: typeof CodeApiModule
    }>({
        esm: [`@mkdocs-ts/code-api#${codeApiVersion} as CodeApi`],
        css: [`@mkdocs-ts/code-api#${codeApiVersion}~assets/ts-typedoc.css`],
    })
    return CodeApi
}

export interface RootModulesNav {
    self: string
    'mkdocs-ts': string
}
export type LibNav = Navigation<
    DefaultLayout.NavLayout,
    DefaultLayout.NavHeader
>

export async function apiNav({
    rootModulesNav,
}: {
    rootModulesNav: RootModulesNav
}): Promise<LibNav> {
    const CodeApiModule = await installCodeApiModule()
    const NotebookModule = await installNotebookModule()

    return CodeApiModule.codeApiEntryNode({
        name: 'Plugin Notebook',
        header: {
            icon: {
                tag: 'i' as const,
                class: `fas fa-puzzle-piece`,
            },
        },
        entryModule: 'notebook',
        dataFolder: `${baseUrl}/assets/api`,
        rootModulesNav: {
            notebook: rootModulesNav.self,
            'mkdocs-ts': rootModulesNav['mkdocs-ts'],
            pyrun_backend: `${rootModulesNav.self}/Interpreters/pyrun_backend`,
            cpprun_backend: `${rootModulesNav.self}/Interpreters/cpprun_backend`,
        },
        configuration: {
            ...CodeApiModule.configurationTsTypedoc,
            sectionView: ({
                router,
                src,
                mdViews,
            }: {
                router: Router
                src: string
                mdViews: Record<string, ViewGenerator>
            }) => {
                return new NotebookModule.NotebookSection({
                    src,
                    router,
                    options: {
                        runAtStart: true,
                        markdown: { views: mdViews, placeholders },
                    },
                })
            },
        },
    })
}
