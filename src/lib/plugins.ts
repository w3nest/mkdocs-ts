import { headingId, parseMd, DefaultLayout, MdWidgets } from '../lib'
import { setup } from '../auto-generated'
import * as webpmClient from '@w3nest/webpm-client'
import type * as CodeApiModule from './code-api'
import type * as NotebookModule from './notebook'
export type * as CodeApiTypes from './code-api'
export type * as NotebookTypes from './notebook'

/**
 * Install and returns the {@link CodeApiModule} module.
 */
export async function installCodeApiModule() {
    const module = (await setup.installAuxiliaryModule({
        name: 'CodeApi',
        cdnClient: webpmClient,
    })) as typeof CodeApiModule
    module.Dependencies.parseMd = parseMd
    module.Dependencies.DefaultLayout = DefaultLayout
    module.Dependencies.installNotebookModule = installNotebookModule
    module.Dependencies.headingId = headingId
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
    module.Dependencies.MdWidgets = MdWidgets
    return module
}
