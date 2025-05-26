/**
 * This module provides a collection of lightweight UI components designed for use within a notebook page.
 *
 * For layout-specific elements, refer to the {@link Layouts} submodule.
 *
 * ## Quick Overview
 *
 * ### {@link Select}
 *
 * The `Select` component provides a **selectable list** with customizable display names.
 *
 * <js-cell>
 * let select = new Views.Select({
 *     items: {foo:42, bar:84},
 *     selected: 'foo',
 *     displayedNames: { 'foo': 'Foo', 'bar': 'Bar'}
 * })
 * display(select)
 * display(select.value$)
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
export * from './select'
export * as Layouts from './layouts'
export * from './notification.view'
