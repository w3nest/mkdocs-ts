/**
 * This file gathers configuration related implementations.
 * In particular, it defines the {@link Configuration} interface and provide a default configuration for ts-typedoc
 * project.
 */

import { Project } from './models'
import { setup } from '../../auto-generated'

/**
 * Specification of the configuration interface.
 */
export interface Configuration {
    /**
     * Defines the stylesheet to install.
     *
     * @param project
     * @returns Stylesheet full URL.
     */
    css: (project: Project) => string
    /**
     * External types to link in the documentation, where keys are symbol path and values associated URL.
     */
    externalTypes: { [k: string]: string }
    /**
     * Define the code url from repo for a file in the project (located at `path`) and a starting line (`startLine`).
     */
    codeUrl: ({
        project,
        path,
        startLine,
    }: {
        project: Project
        path: string
        startLine: number
    }) => string
}

/**
 * Configuration for the `TsTypedoc` backend.
 */
export const configurationTsTypedoc: Configuration = {
    codeUrl: ({
        project,
        path,
        startLine,
    }: {
        project: Project
        path: string
        startLine: number
    }) => {
        return `https://github.com/${project.name}/tree/main/src/${path}#L${startLine}`
    },
    externalTypes: {},
    css: () => `${setup.name}#${setup.version}~assets/ts-typedoc.css`,
}
