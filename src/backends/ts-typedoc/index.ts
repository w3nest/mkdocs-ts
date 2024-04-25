/**
 * Backend for generating API data for TypeScript projects using TypeDoc as the primary documentation generator.
 *
 * This parser supports a subset of the tags available in TypeDoc. Many tags are omitted because their meaning is
 * implied by the entity declaration. For example, tags like `@interface`, `@public`, `@private`, `@property`,
 * `@readonly`, and `@virtual` are unnecessary as their semantics are inherent in the code structure.
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
 * **Comparison**:
 *
 * Overall the documentation displayed by `@youwol/mkdocs-ts` is lighter than its typedoc counterpart,
 * but some resolution are (rarely) failing.
 *
 * See for instance the `parseCallable` function:
 * *  <a target="_blank" href="/api/assets-gateway/cdn-backend/resources/QHlvdXdvbC9ta2RvY3MtdHM=/0.3.3/dist/docs/functions/Backends.TsTypedoc.parseCallable.html">
 *     Within typedoc</a>
 * *  And here: {@link parseCallable}
 *
 * The missing type `SignaturesTrait` is an artifact due to loss of type information when using typedoc,
 * going further will likely imply to manage our-self the entire process of code parsing using typescript AST API.
 *
 * **Important Notes**:
 * - The parser does not handle namespaces. This functionality needs to be implemented separately
 * (namespaces can be treated as modules in all practical terms concerning documentation purposes).
 * - Only documented and exported symbols are included in the API documentation.
 *
 * **Hints**:
 * When documenting a function with named parameters, you can document them as follows:
 *
 * ```javascript
 * /* Foo documentation
 * @params _args0 Not relevant: parameters starting with `_` are not displayed
 * @params _args0.bar A bar property
 * @params _args1 Not relevant: parameters starting with `_` are not displayed
 * @params _args1.baz A baz property
 * *\/
 * export function foo({bar}: { bar: number }, {baz}: { baz: string }) {}
 *
 * ```
 *
 * The general operations of the backend involve:
 * - Gathering TypeScript information using {@link generateTsInputs}.
 * - Gathering TypeDoc information using {@link generateTypedocInputs}.
 * - Creating the output files using {@link generateApiFiles}.
 *
 * For consumers that want to generate API data, a binary is available in the node module of `@youwol/mkdocs-ts`,
 * it is a simple script that call the {@link generateApiFiles} function.
 * @module TsTypedoc
 */
export * from './generate-ts-inputs'
export * from './generate-typedoc-inputs'
export * from './typedoc-models'
export * from './typedoc-parser'
