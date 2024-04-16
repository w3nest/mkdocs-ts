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

export type * as CodeApiTypes from './lib/code-api'
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
