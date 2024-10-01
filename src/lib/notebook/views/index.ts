/**
 * This module gathers the definition of simple views to use within a notebook page,
 * it also re-exports the {@link MainModule.MdWidgets.CodeSnippetView}.
 *
 * Some layout elements are included in the {@link Layouts} submodule.
 *
 * @module Views
 */
export * from './constants'
export * from './range'
export * from './text'
export * from './dropdown'
export { CodeSnippetView as CodeSnippet } from '../../md-widgets/code-snippet.view'
export * as Layouts from './layouts'
