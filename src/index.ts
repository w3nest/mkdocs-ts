/**
 * Main module of the library.
 *
 * @module MainModule
 */
export * from './lib'
export { setup } from './auto-generated'

import { setup } from './auto-generated'
import * as webpmClient from '@youwol/webpm-client'
import type * as CodeApiModule from './lib/code-api'
import type * as NotebookModule from './lib/notebook'

export type * as CodeApiTypes from './lib/code-api'
export type * as NotebookTypes from './lib/notebook'
/**
 * Install and returns the {@link CodeApiModule} module.
 */
export async function installCodeApiModule() {
    const module: typeof CodeApiModule = await setup.installAuxiliaryModule({
        name: 'CodeApi',
        cdnClient: webpmClient,
    })
    return module
}

/**
 * Install and returns the {@link NotebookModule} module.
 */
export async function installNotebookModule() {
    const module: typeof NotebookModule = await setup.installAuxiliaryModule({
        name: 'Notebook',
        cdnClient: webpmClient,
    })
    return module
}
