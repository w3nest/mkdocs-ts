/**
 * This module defines a collection of widgets that can be instantiated directly from Markdown
 * source when using the {@link parseMd} function. Widgets are referenced within {@link GlobalMarkdownViews},
 * which maps `tag-name -> implementation` to enable seamless integration into Markdown content.
 *
 * Each widget provides a static `fromHTMLElement` method that specifies the attributes required for its instantiation.
 *
 * ## Overview
 *
 * Below are examples of the available widgets. For detailed documentation on their attributes and behavior,
 * refer to their respective sections. Additionally, you can create custom widgets and register them globally
 * for your application. See the section **New Widgets** for guidance.
 *
 *
 * ---
 *
 * ### {@link NoteView}
 *
 * <md-cell>
 *
 * <note level="info">
 * Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna
 * aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
 * </note>
 * </md-cell>
 *
 * ---
 *
 * ### {@link CodeSnippetView}
 *
 * <md-cell>
 * <code-snippet language="javascript" highlightedLines="8">
 *
 * function compute({improbabilityFactor, babelFishCount, vogonPoetryExposure, towelAbsorbency }){
 *     console.log("Computation complete! The result is 42");
 *     const result =
 *         Math.log(improbabilityFactor + 42) +
 *         babelFishCount === 1 ? 1 : Math.sqrt(babelFishCount) +
 *         vogonPoetryExposure > 1000 ? -42 : vogonPoetryExposure / 100 +
 *         towelAbsorbency * (Math.random() + 0.42)
 *     return 42;
 * }
 * </code-snippet>
 * </md-cell>
 *
 * ---
 *
 * ### {@link CodeBadgesView}
 *
 * <md-cell>
 * <code-badges version="{{mkdocs-version}}" npm="mkdocs-ts" github="w3nest/mkdocs-ts" license="mit">
 * </code-badges>
 * </md-cell>
 *
 * ---
 *
 * ## New Widgets
 * To extend the functionality of {@link parseMd}, you can define and register custom widgets globally.
 *
 * ---
 *
 * ### Step 1: Define Implementation
 *
 * <js-cell>
 * const { MkDocs, TP } = await webpm.install({
 *     esm:[
 *         'mkdocs-ts#{{mkdocs-version}} as MkDocs',
 *         'tweakpane#^4.0.1 as TP',
 *     ]
 * })
 *
 * const customViewExample = (element) => {
 *     const pane = new TP.Pane()
 *     const getAttr = (name, defaultVal) => parseFloat(element.getAttribute(name) ?? defaultVal )
 *     const params = {
 *         improbabilityFactor: getAttr('improbabilityFactor', 3),
 *         babelFishCount: getAttr('babelFishCount', 1),
 *         vogonPoetryExposure: getAttr('vogonPoetryExposure', 250),
 *         towelAbsorbency: getAttr('towelAbsorbency', 2),
 *     };
 *     Object.keys(params).forEach((k) => pane.addBinding(params, k))
 *     pane.addButton({ title: 'Compute', label: ''}).on('click', () => computeCb(params));
 *     return pane.element
 * }
 * </js-cell>
 *
 * ---
 *
 * ### Step 2: Register Element
 *
 * <js-cell>
 * MkDocs.GlobalMarkdownViews.factory = {
 *     ...MkDocs.GlobalMarkdownViews.factory,
 *     'custom-view-example' : (element) => customViewExample(element)
 * }
 * </js-cell>
 *
 * See {@link GlobalMarkdownViews} for details.
 *
 * ---
 *
 * ### Step 3: Enjoy
 *
 * <md-cell>
 * Below is the custom view `custom-view-example` instantiated with `improbabilityFactor=5`:
 *
 * <custom-view-example improbabilityFactor="5.00">
 * </custom-view-example>
 * </md-cell>
 *
 * @module MdWidgets
 */
export * from './code-snippet.view'
export * from './note.view'
export * from './code-badges'
