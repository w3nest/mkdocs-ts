/**
 * This module provides a collection of lightweight UI components designed for use within a notebook page.
 * Additionally, it re-exports the {@link CodeSnippet} component for easy integration.
 *
 * For layout-specific elements, refer to the {@link Layouts} submodule.
 *
 * ## Quick Overview
 *
 * ### {@link CodeSnippet}
 *
 * The `CodeSnippet` component offers a simple **code editor** with syntax highlighting.
 *
 * <js-cell>
 * let codeEditor = new Views.CodeSnippet({
 *     language: 'javascript',
 *     content: 'const foo = 42',
 *     cmConfig: { readOnly: false }
 * })
 * display(codeEditor)
 * display(codeEditor.content$)
 * </js-cell>
 *
 * ### {@link DropDown}
 *
 * The `DropDown` component provides a **selectable list** with customizable display names.
 *
 * <js-cell>
 * let dropdown = new Views.DropDown({
 *     items: {foo:42, bar:84},
 *     selected: 'foo',
 *     displayedNames: { 'foo': 'Foo', 'bar': 'Bar'}
 * })
 * display(dropdown)
 * display(dropdown.value$)
 * </js-cell>
 *
 * ### {@link Range}
 *
 * The `Range` component creates an **interactive slider** for numeric input.
 *
 * <js-cell>
 * let range = new Views.Range()
 * display(range)
 * display(range.value$)
 * </js-cell>
 *
 * ### {@link Text}
 *
 * The `Text` component supports **Markdown formatting** and **LaTeX expressions** for mathematical notation.
 *
 * <js-cell>
 * display(new Views.Text('**a simple example**'))
 * display(new Views.Text(String.raw`**including latex inlined**: \(ax^2 + bx + c = 0\)`))
 * display(new Views.Text(String.raw`**including latex block**: $$x = {-b \pm \sqrt{b^2-4ac} \over 2a}$$`))
 * </js-cell>
 *
 * ### {@link notify | Notification}
 *
 * The `notify` function enables notification:
 *
 * <js-cell>
 * const notification = {
 *     tag: 'div',
 *     class: 'p-3',
 *     innerText: 'A notification...'
 * }
 * display({
 *     tag: 'button',
 *     class: 'btn btn-sm btn-primary',
 *     innerText: 'Notify',
 *     onclick: ()=> {
 *         Views.notify({content:notification, level:'info', duration:3000})
 *     }
 * })
 * </js-cell>
 *
 *
 * @module Views
 */
export * from './constants'
export * from './range'
export * from './text'
export * from './dropdown'
export { CodeSnippetView as CodeSnippet } from '../../md-widgets/code-snippet.view'
export * as Layouts from './layouts'
export * from './notification.view'
