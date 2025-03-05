import './style.css'
export {}
import * as webpmClient from '@w3nest/webpm-client'

import { setup } from '../auto-generated'
import { DebugMode } from './config.debug'

//eslint-disable-next-line @typescript-eslint/dot-notation
window['mkdocsConfig'] = { enableContextual: DebugMode }

await setup.installMainModule({
    cdnClient: webpmClient,
    installParameters: {
        css: [
            'bootstrap#5.3.3~bootstrap.min.css',
            'fontawesome#5.12.1~css/all.min.css',
            `mkdocs-ts#${setup.runTimeDependencies.externals['mkdocs-ts']}~assets/mkdocs-light.css`,
            `mkdocs-ts#${setup.runTimeDependencies.externals['mkdocs-ts']}~assets/notebook.css`,
            `mkdocs-ts#${setup.runTimeDependencies.externals['mkdocs-ts']}~assets/ts-typedoc.css`,
        ],
        displayLoadingScreen: true,
    },
})

await import('./on-load')
