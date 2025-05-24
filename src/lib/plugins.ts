import { headingId, parseMd, DefaultLayout, MdWidgets } from '../lib'
import pkgJson from '../../package.json'
import type * as WebPM from '@w3nest/webpm-client'
import type * as CodeApiModule from './code-api'
import * as NotebookModule from './notebook'
export type * as CodeApiTypes from './code-api'
export type * as NotebookTypes from './notebook'

/**
 * Install and returns the {@link CodeApiModule} module.
 */
export async function installCodeApiModule(
    webpmClient: typeof WebPM,
    Notebook?: typeof NotebookModule,
) {
    const { module } = await webpmClient.install<{
        module: typeof CodeApiModule
    }>({
        esm: [`${pkgJson.name}/CodeApi#${pkgJson.version} as module`],
    })
    module.Dependencies.parseMd = parseMd
    module.Dependencies.DefaultLayout = DefaultLayout
    module.Dependencies.Notebook = Notebook
    module.Dependencies.headingId = headingId
    return module
}

/**
 * Install and returns the {@link NotebookModule} module.
 */
export async function installNotebookModule() {
    const { module } = await webpmClient.install<{
        module: typeof NotebookModule
    }>({
        esm: [`${pkgJson.name}/Notebook#${pkgJson.version} as module`],
    })
    module.Dependencies.parseMd = parseMd
    module.Dependencies.MdWidgets = MdWidgets
    return module
}
