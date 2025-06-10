/**
 * This file gathers configuration related implementations.
 * In particular, it defines the {@link Configuration} interface and provide a default configuration for ts-typedoc
 * project.
 */

import { Project } from './models'

import { NavNodeData } from 'mkdocs-ts'
import type {
    AnyView,
    DefaultLayout,
    MdParsingOptions,
    Router,
    ViewGenerator,
} from 'mkdocs-ts'

/**
 * The navigation layout data-structure produced by the module.
 *
 */
export interface NavLayout {
    /**
     * Defines the view for the table of contents (TOC) within the page.
     */
    toc?: DefaultLayout.ClientTocView

    /**
     * Defines the main content view of the page.
     */
    content: (params: {
        router: Router<NavLayout>
    }) => DefaultLayout.NavLayoutView
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
     * If provided, documentation sections are generated using this function.
     * It enables for instance to use the **Notebook** plugin to include coding cells in the API documentation.
     */
    sectionView?: (p: {
        router: Router
        src: string
        mdViews: Record<string, ViewGenerator>
    }) => AnyView

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
        return `https://github.com/${project.entryModule}/tree/main/src/${path}#L${String(startLine)}`
    },
    externalTypes: {},
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
