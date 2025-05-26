/**
 * This module defines various layout components designed for structuring content within a notebook page.
 *
 *
 * ## Quick Overview
 *
 * ### {@link SideNavLayout}
 *
 * The `SideNavLayout` component creates a **navigation sidebar** alongside the main content area.
 * Below is an example with three navigation options: **Home**, **About**, and **Contact**.
 *
 * <js-cell>
 * const sideNavClass = 'h-100 bg-dark text-light p-2 px-5'
 * const sideNavHome = {
 *     icon: 'fas fa-home',
 *     content: { tag: 'div', innerText: 'Home', class: sideNavClass },
 * }
 * const sideNavAbout = {
 *     icon: 'fas fa-info',
 *     content: { tag: 'div', innerText: 'About', class: sideNavClass },
 * }
 * const sideNavContact = {
 *     icon: 'fas fa-envelope',
 *     content: { tag: 'div', innerText: 'Contact', class: sideNavClass },
 * }
 * const sideNav = {
 *     home: sideNavHome,
 *     about: sideNavAbout,
 *     contact: sideNavContact,
 * }
 * const sideNavLayout = Views.Layouts.sideNav({
 *     sideNavElements: sideNav,
 *     content: { tag: 'div', innerText: 'Main content', class:'p-2 w-100 h-100 bg-light rounded border' },
 * })
 * display(sideNavLayout)
 * </js-cell>
 *
 * ### {@link SingleLayout}
 *
 * The `SingleLayout` provides a simple **full-width container** for displaying content.
 *
 * <js-cell>
 * const content = {
 *     tag:'div',
 *     class: 'p-2 w-100 h-100 bg-light border rounded',
 *     innerText: 'Main Content'
 * }
 * const singleLayout = Views.Layouts.single({
 *    content:{
 *         tag:'div',
 *         class: 'p-2 w-100 h-100 bg-light border rounded',
 *         innerText: 'Main Content'
 *     }
 * })
 * display(singleLayout)
 * </js-cell>
 *
 * ### {@link SuperposedLayout}
 *
 * The `SuperposedLayout` allows **layered positioning** of content at the corners of the viewport.
 * This can be useful for **notifications**, **floating toolbars**, or **overlays**.
 *
 * <js-cell>
 * const classCorners = 'p-2 w-100 h-100 bg-dark text-light border rounded'
 * const topLeft = { tag:'div', class: classCorners, innerText: 'Top-Left' }
 * const topRight = { tag:'div', class: classCorners, innerText: 'Top-Right' }
 * const bottomLeft = { tag:'div', class: classCorners, innerText: 'Bottom-Left' }
 * const bottomRight = { tag:'div', class: classCorners, innerText: 'Bottom-Right' }
 *
 * const superposedLayout = Views.Layouts.superposed({
 *     content:{ tag:'div', class: 'p-2 w-100 h-100 bg-light border rounded'},
 *     topLeft, topRight, bottomLeft, bottomRight
 * })
 * display(superposedLayout)
 * </js-cell>
 *
 * ### {@link ViewPortOnlyLayout}
 *
 * The `ViewPortOnlyLayout` renders content **only when visible in the viewport**, making it ideal for dynamic loading.
 * This example **displays an alert when the layout is added or removed** to/from the viewport.
 *
 * <js-cell>
 * const viewPortOnlyLayout = Views.Layouts.viewPortOnly({
 *     content:{
 *         tag:'div',
 *         class: 'p-2 w-100 h-100 bg-light border rounded',
 *         innerText: 'Main Content',
 *         connectedCallback: () => alert("viewPortOnly layout added"),
 *         disconnectedCallback: () => alert("viewPortOnly layout removed"),
 *     }
 * })
 * display(viewPortOnlyLayout)
 * </js-cell>
 *
 * @module Layouts
 */

export * from './side-nav.layout'
export * from './superposed.layout'
export * from './view-port-only.layout'
export * from './single.layout'
