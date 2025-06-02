import { DefaultLayout, Router, ViewGenerator } from 'mkdocs-ts'

import pkgJsonCodeApi from '../../../../plugins/code-api/package.json'
import { fromMd, placeholders } from '../config.markdown'
import { installNotebookModule } from '../config.notebook'
import { AppNav } from '../navigation'
import type * as CodeApiModule from '@mkdocs-ts/code-api'
import * as webpm from '@w3nest/webpm-client'
import { createRootContext } from '../config.context'
import { companionNodes$ } from '../common'

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
        '/mkdocs-ts': apiNav('mkdocs-ts'),
        '/notebook': apiNav('notebook'),
        '/code-api': apiNav('code-api'),
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

async function apiNav(
    module: 'mkdocs-ts' | 'notebook' | 'code-api',
): Promise<AppNav> {
    const CodeApiModule = await installCodeApiModule()

    const NotebookModule = await installNotebookModule()

    const context = createRootContext({
        threadName: `CodeAPI`,
        labels: ['CodeApi'],
    })

    return CodeApiModule.codeApiEntryNode(
        {
            name: module === 'mkdocs-ts' ? module : `Plugin ${module}`,
            header: {
                icon: {
                    tag: 'i' as const,
                    class:
                        module === 'mkdocs-ts'
                            ? 'fas fa-code'
                            : `fas fa-puzzle-piece`,
                },
            },
            entryModule: module,
            docBasePath: `../assets/api/${module}`,
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
