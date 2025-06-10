import type * as CodeApiModule from '@mkdocs-ts/code-api'
import * as webpm from '@w3nest/webpm-client'
import { Navigation, DefaultLayout } from 'mkdocs-ts'

// Keep the variable name & declaration format: its is dynamically replaced when running the `setup` step
const libraryVersion = '0.2.0-wip'

export async function installCodeApiModule() {
    const { CodeApi } = await webpm.install<{
        CodeApi: typeof CodeApiModule
    }>({
        esm: [`@mkdocs-ts/code-api#${libraryVersion} as CodeApi`],
        css: [`@mkdocs-ts/code-api#${libraryVersion}~assets/ts-typedoc.css`],
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
    const baseUrl = webpm.getUrlBase('@mkdocs-ts/code-api', libraryVersion)

    return CodeApiModule.codeApiEntryNode({
        name: 'Plugin Code-API',
        header: {
            icon: {
                tag: 'i' as const,
                class: `fas fa-puzzle-piece`,
            },
        },
        entryModule: 'code-api',
        dataFolder: `${baseUrl}/assets/api`,
        rootModulesNav: {
            'code-api': rootModulesNav.self,
            'mkdocs-ts': rootModulesNav['mkdocs-ts'],
            mkapi_python: `${rootModulesNav.self}/MkApiBackends/mkapi_python`,
        },
        configuration: CodeApiModule.configurationTsTypedoc,
    })
}
