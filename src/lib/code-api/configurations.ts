/**
 * This file gathers configuration related implementations.
 * In particular, it defines the {@link Configuration} interface and provide a default configuration for ts-typedoc
 * project.
 */

import { Project } from './models'
import { setup } from '../../auto-generated'
import type {
    DisplayFactory,
    NotebookOptions,
    Scope,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used for documentation
    NotebookPage,
} from '../notebook'
import { NavNodeData } from '../navigation.node'
import type { DefaultLayout, MdParsingOptions, Router } from '../index'
import type { ClientTocView, NavLayoutView } from '../default-layout'

/**
 * The navigation layout data-structure produced by the module.
 *
 */
export interface NavLayout {
    /**
     * Defines the view for the table of contents (TOC) within the page.
     */
    toc?: ClientTocView

    /**
     * Defines the main content view of the page.
     */
    content: (params: { router: Router<NavLayout> }) => NavLayoutView
}

/**
 * Specification of the configuration interface.
 */
export interface Configuration<
    TLayout = DefaultLayout.NavLayout,
    THeader = DefaultLayout.NavHeader,
> {
    /**
     * Parsing options for Markdown.
     */
    mdParsingOptions?: MdParsingOptions

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
    externalTypes: Record<string, string>
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

    /**
     * If `true` or an object, use the {@link Notebook} module to parse the code documentation included in the API
     * files, eventually forwarding the parameters provided to the {@link NotebookPage} constructor.
     */
    notebook?:
        | boolean
        | {
              initialScope?: Partial<Scope>
              displayFactory?: DisplayFactory
              options?: NotebookOptions
          }

    navNode: ({
        name,
        header,
        layout,
    }: {
        name: string
        header: DefaultLayout.NavHeader
        layout: NavLayout
    }) => NavNodeData<TLayout, THeader>
}

/**
 * Default configuration.
 */
export const configurationDefault: Configuration = {
    codeUrl: ({
        project,
        path,
        startLine,
    }: {
        project: Project
        path: string
        startLine: number
    }) => {
        return `https://github.com/${project.name}/tree/main/src/${path}#L${String(startLine)}`
    },
    externalTypes: {},
    css: () => `${setup.name}#${setup.version}~assets/ts-typedoc.css`,
    notebook: undefined,
    navNode: ({ name, header, layout }) => ({
        name,
        header,
        layout,
    }),
}

/**
 * Configuration for the `TsTypedoc` backend.
 */
export const configurationTsTypedoc: Configuration = configurationDefault

/**
 * Configuration for the `Python` backend.
 */
export const configurationPython: Configuration = configurationDefault
