/**
 * This module provides the implementation of the {@link install} function, which directly forwards inputs
 * to <a target="_blank" href="/apps/@webpm/doc/latest">WebPM</a> for installation.
 *
 * Its focus is to provide dedicated views to monitor and track the installation process in real time.
 * See {@link InstallView}.
 *
 * @module Installer
 */

import {
    CdnEvent,
    InstallInputs,
    install as webpmInstall,
} from '@w3nest/webpm-client'
import { ReplaySubject } from 'rxjs'
import { InstallView } from './installer'
import { EventsManager } from './events-manager'

export * from './installer'
export * from './backend.view'
export * from './common.view'
export * from './css.view'
export * from './esm.view'
export * from './logs.view'
export * from './pyodide.view'

/**
 * Installs the specified dependencies (ESM modules, backends, Pyodide, or CSS) using
 * <a target="_blank" href="/apps/@webpm/doc/latest">WebPM</a> and provides real-time tracking of the installation
 * process.
 *
 * @param inputs WebPM inputs, see dedicated documentation
 * @param display Optional callback function to render the installation progress view.
 * It is usually the `display` function exposed in JavaScript
 * cells.
 *
 *@returns A promise resolving to the symbols installed.
 */
export async function install(
    inputs: Pick<InstallInputs, 'esm' | 'backends' | 'pyodide' | 'css'>,
    display?: (view: InstallView) => void,
) {
    const event$ = new ReplaySubject<CdnEvent>()
    const state = new EventsManager({ event$ })
    const installView = new InstallView(state)
    if (display) {
        display(installView)
    }
    return await webpmInstall({
        ...inputs,
        onEvent: (event) => {
            event$.next(event)
        },
    })
}
