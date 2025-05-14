import './style.css'
export {}
import { install, LoadingScreen } from '@w3nest/webpm-client'

import pkgJson from '../../package.json'
import { DebugMode } from './config.debug'

//eslint-disable-next-line @typescript-eslint/dot-notation
window['mkdocsConfig'] = { enableContextual: DebugMode }

const version = pkgJson.webpm.dependencies['mkdocs-ts']

const loadingScreen = new LoadingScreen({
    name: pkgJson.name,
    description: pkgJson.description,
    logo: '../assets/favicon.svg',
})
await install({
    esm: [`${pkgJson.name}#${pkgJson.version}`],
    css: [
        'bootstrap#5.3.3~bootstrap.min.css',
        'fontawesome#5.12.1~css/all.min.css',
        `mkdocs-ts#${version}~assets/mkdocs-light.css`,
        `mkdocs-ts#${version}~assets/notebook.css`,
        `mkdocs-ts#${version}~assets/ts-typedoc.css`,
    ],
    onEvent: (ev) => {
        loadingScreen.next(ev)
    },
})
await import('./on-load')
loadingScreen.done()
