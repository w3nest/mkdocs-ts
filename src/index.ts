/**
 * Main module of the library.
 *
 * @module MainModule
 */
import { headingPrefixId, parseMd, Views } from './lib'

export * from './lib'
export { setup } from './auto-generated'

import { setup } from './auto-generated'
import * as webpmClient from '@w3nest/webpm-client'
import type * as CodeApiModule from './lib/code-api'
import type * as NotebookModule from './lib/notebook'

export type * as CodeApiTypes from './lib/code-api'
export type * as NotebookTypes from './lib/notebook'
/**
 * Install and returns the {@link CodeApiModule} module.
 */
export async function installCodeApiModule() {
    const module = (await setup.installAuxiliaryModule({
        name: 'CodeApi',
        cdnClient: webpmClient,
    })) as typeof CodeApiModule
    module.Dependencies.parseMd = parseMd
    module.Dependencies.Views = Views
    module.Dependencies.installNotebookModule = installNotebookModule
    module.Dependencies.headingPrefixId = headingPrefixId
    return module
}

/**
 * Install and returns the {@link NotebookModule} module.
 */
export async function installNotebookModule() {
    const module = (await setup.installAuxiliaryModule({
        name: 'Notebook',
        cdnClient: webpmClient,
    })) as typeof NotebookModule
    module.Dependencies.parseMd = parseMd
    return module
}
