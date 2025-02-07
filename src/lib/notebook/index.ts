/**
 * This module offers functionalities akin to a notebook page.
 *
 * The primary entry point is {@link NotebookPage}, which serves as a wrapper for parsing markdown content.
 *
 * The markdown source can contain a series of executable cells, including:
 *
 * *  {@link JsCellView}: Run JavaScript snippets.
 *
 * *  {@link MdCellView}: Run Markdown snippets, eventually including references to JavScript variables.
 *
 * *  {@link PyCellView}: Run python snippets in the browser using
 *    <a target="_blank" href="https://pyodide.org/en/stable/">pyodide</a>.
 *
 * *  {@link InterpreterCellView}: Run code snippets using a given backend interpreter for a given language.
 *
 * *  {@link WorkerCellView}: Run code snippets in
 *    <a target="_blank" href="https://developer.mozilla.org/fr/docs/Web/API/Web_Workers_API">Web Workers</a>.
 *
 * Cells are identified within the Markdown source using specific DOM elements, respectively `js-cell`, `md-cell`,
 * `py-cell`, `interpreter-cell` and `worker-cell` for the above list.
 *
 * Cells feature attributes provided with the DOM element,
 * refer to the associated {@link JsCellAttributes}, {@link MdCellAttributes}, {@link PyCellAttributes},
 * {@link InterpreterCellAttributes} and {@link WorkerCellAttributes}.
 *
 * The entry point of the module is the {@link NotebookPage}; most of the implementation logic regarding synchronization
 * is included in the {@link State} class.
 *
 * **Example**
 *
 * <js-cell cell-id="example">
 * const version = "{{mkdocs-version}}"
 *
 * const { MkDocs } = await webpm.install({
 *     esm:[ `mkdocs-ts#${version} as MkDocs`],
 *     css: [
 *         'bootstrap#5.3.3~bootstrap.min.css',
 *         `mkdocs-ts#${version}~assets/mkdocs-light.css`,
 *         'fontawesome#5.12.1~css/all.min.css',
 *     ]
 * })
 * const NotebookModule = await MkDocs.installNotebookModule()
 * const src =  `
 * ### Hello world
 *
 * <js-cell>
 * display('Hello World')
 * </js-cell>
 * `
 * const navigation = {
 *     name: 'Notebook',
 *     layout: ({router}) => new NotebookModule.NotebookPage({
 *         src,
 *         router,
 *     }),
 * }
 * const router = new MkDocs.Router({
 *     navigation,
 *     browserClient: (p) => new MkDocs.MockBrowser(p)
 * })
 *
 * const app = new MkDocs.DefaultLayout.Layout({
 *     router,
 *     name: 'Demo App',
 * })
 *
 * display(app)
 * </js-cell>
 *
 * <cell-output cell-id="example" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;">
 * </cell-output>
 *
 * @module Notebook
 */

export * from './notebook-page'
export * from './state'
export * from './cell-views'
export * from './execution-common'
export * from './deported-outputs-view'
export * from './js-cell-view'
export * from './md-cell-view'
export * from './py-cell-view'
export * from './interpreter-cell-view'
export * from './js-execution'
export * from './interpreter-execution'
export * from './worker-cell-view'
export * from './worker-execution'
export * as Views from './views'
export * from './display-utils'
import type { parseMd } from '../markdown'
import type { MdWidgets } from '..'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Dependencies {
    public static parseMd: typeof parseMd
    public static MdWidgets: typeof MdWidgets
}
