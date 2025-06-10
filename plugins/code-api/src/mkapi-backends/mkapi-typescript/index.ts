/**
 * The backend for generating API files for TypeScript projects uses the
 * <a href="https://typedoc.org/" target="_blank">TypeDoc</a> &
 * <a href="https://www.npmjs.com/package/typescript" target="_blank">TypeScript</a> package as the primary
 * AST (Abstract Syntax Tree) generators.
 *
 * The entry point is the function {@link generateApiFiles}, inputs are provided using {@link ApiInputs}.
 *
 * **Usage Example**
 *
 * <note level="warning">
 * For the backend to function correctly, the following prerequisites must be met in the project being documented:
 *
 * *  `typedoc` must be available in the node_modules folder.
 * *  A `typedoc.js` configuration file must be present.
 *
 * The backend will not proceed if TypeDoc encounters errors while generating API documentation.
 * Ensure TypeDoc runs successfully before using this backend.
 * </note>
 *
 * The following example demonstrates how to generate API files for a TypeScript project using a TypeScript script
 * (for instance named `gen-doc.ts`, assuming `@mkdocs-ts/code-api` has been installed in `node_modules`):
 *
 * <code-snippet language="javascript">
 * import { generateApiFiles } from './node_modules/@mkdocs-ts/code-api/src/mkapi-backends/mkapi-typescript'
 *
 * // appFolder is the folder of the documentation application
 * const appFolder = `${__dirname}`
 *
 * generateApiFiles({
 *     // The project to document (expected here as the parent of the application folder).
 *     projectFolder: `${appFolder}/../`,
 *     // Output's folder, where to include the generated JSON files
 *     outputFolder: `${appFolder}/assets/api`,
 *     externals: {
 *         // For instance
 *         rxjs: ({ name }: { name: string }) => {
 *             const urls = {
 *                 Subject: 'https://www.learnrxjs.io/learn-rxjs/subjects/subject',
 *                 BehaviorSubject:
 *                     'https://www.learnrxjs.io/learn-rxjs/subjects/subject',
 *                 ReplaySubject:
 *                     'https://www.learnrxjs.io/learn-rxjs/subjects/replaysubject',
 *                 Observable: 'https://rxjs.dev/guide/observable',
 *             }
 *             if (!(name in urls)) {
 *                 console.warn(`Can not find URL for rxjs ${name} symbol`)
 *             }
 *             return urls[name]
 *         },
 *     },
 * })
 * </code-snippet>
 *
 * To execute the script:
 *
 * `npx tsx gen-doc.ts`; `tsx` can be installed from <a href="https://www.npmjs.com/package/tsx" target="_blank">
 * npm</a>.
 *
 * A simple example in action can be found
 * [here](https://github.com/w3nest/mkdocs-ts/blob/main/examples/ts-npm/.w3nest/doc.ts).
 *
 * See also <a href="https://typedoc.org/" target="_blank">TypeDoc documentation</a> for available options.
 *
 * **Notes**
 *
 * This parser supports a subset of the tags available in TypeDoc. Many tags are omitted because their meaning is
 * implied by the entity's declaration, *e.g.* `@interface`, `@public`, `@private`,
 * `@property`, `@readonly`, `@virtual`.
 *
 * Some tags are related to grouping, such as `@group`, `@category`, `@categoryDescription`, and
 * `@groupDescription`. Currently, entities are grouped based on the files they belong to, with the possibility of
 * including documentation sections at the beginning of each file. Additional semantic grouping is not yet supported.
 *
 * In practical terms, the essentials tags used are:
 * [`@param`](https://typedoc.org/tags/param/), [`@returns`](https://typedoc.org/tags/returns/),
 * [`@typeParams`](https://typedoc.org/tags/typeParam/), [`@module`](https://typedoc.org/tags/module/),
 * [`@link`](https://typedoc.org/tags/link/).
 *
 * <note level="warning" title="Important">
 * - The parser does not handle namespaces. This functionality needs to be implemented separately
 * (namespaces can be treated as modules in all practical terms concerning documentation purposes).
 * - Only documented and exported symbols are included in the API documentation.
 * </note>
 *
 * **Externals links**
 *
 * URL to externals links can be provided using  {@link ApiInputs.externals} if they are part of the project's
 * `node_modules`.
 *
 * When external symbols are referenced:
 *
 * *  **In signatures**: The parser uses the  {@link ExternalsUrl} provider. The keys referenced the package name as
 * included in the `node_modules`.
 * *  **In documentation strings**: If `{@link ...}` have not been resolved by TypeDoc, the parser tries to interpret
 * them as externals using {@link ExternalsUrl}. In this case the package name is provided explicitly using
 * *e.g.* `{@link rxjs.Subject}` where `rxjs` is the package name.
 *
 * **Unnamed parameters**
 *
 * Regarding unnamed parameters:
 *
 * ```javascript
 *
 * /** Foo documentation
 * @params _args0 Not relevant: parameters starting with `_` are not displayed
 * @params _args0.bar A bar property
 * @params _args1 Not relevant: parameters starting with `_` are not displayed
 * @params _args1.baz A baz property
 * **\/
 * export function foo({bar}: { bar: number }, {baz}: { baz: string }) {}
 *
 * ```
 *
 * @module MkApiTypescript
 */
export * from './generate-ts-inputs'
export * from './generate-typedoc-inputs'
export * from './typedoc-models'
export * from './typedoc-parser'
