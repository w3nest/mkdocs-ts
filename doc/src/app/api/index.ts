import { DefaultLayout, Router, ViewGenerator } from 'mkdocs-ts'

import pkgJsonCodeApi from '../../../../plugins/code-api/package.json'
import { fromMd, placeholders } from '../config.markdown'
import { installNotebookModule } from '../config.notebook'
import { AppNav } from '../navigation'
import type * as CodeApiModule from '@mkdocs-ts/code-api'
import * as webpm from '@w3nest/webpm-client'
import { createRootContext } from '../config.context'
import { companionNodes$ } from '../common'

import { apiNav as NavCodeApi } from '@mkdocs-ts/code-api/Doc'
import { apiNav as NavNotebook } from '@mkdocs-ts/notebook/Doc'

export const navigation: AppNav = {
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
    layout: {
        content: fromMd('api.md'),
    },
    routes: {
        '/mkdocs-ts': apiNav(),
        '/notebook': NavNotebook({
            rootModulesNav: {
                self: '@nav/api/notebook',
                'mkdocs-ts': '@nav/api/mkdocs-ts',
            },
        }),
        '/code-api': NavCodeApi({
            rootModulesNav: {
                self: '@nav/api/code-api',
                'mkdocs-ts': '@nav/api/mkdocs-ts',
            },
        }),
    },
}

export async function installCodeApiModule() {
    const version = pkgJsonCodeApi.version
    const { CodeApi } = await webpm.install<{
        CodeApi: typeof CodeApiModule
    }>({
        esm: [`@mkdocs-ts/code-api#${version} as CodeApi`],
        css: [`@mkdocs-ts/code-api#${version}~assets/ts-typedoc.css`],
    })
    return CodeApi
}

async function apiNav(): Promise<AppNav> {
    const CodeApiModule = await installCodeApiModule()

    const NotebookModule = await installNotebookModule()
    const module = 'mkdocs-ts'
    const context = createRootContext({
        threadName: `CodeAPI`,
        labels: ['CodeApi'],
    })

    return CodeApiModule.codeApiEntryNode(
        {
            name: module,
            header: {
                icon: {
                    tag: 'i' as const,
                    class: 'fas fa-code',
                },
            },
            entryModule: module,
            dataFolder: `../assets/api/${module}`,
            rootModulesNav: {
                'mkdocs-ts': '@nav/api/mkdocs-ts',
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
                mdParsingOptions: {
                    placeholders,
                },
            },
        },
        context,
    )
}
