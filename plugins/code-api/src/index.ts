/**
 * The Code API Plugin integrates API documentation into your application.
 *
 * API documentation is structured based on the module hierarchy, where each page corresponds to a specific **module**.
 *
 * <note level="hint" title="API schema" expandable="true">
 *
 * To ensure broad compatibility across different programming languages, the schema to model API is designed
 * with minimal constraints. The goal is to support a wide range of source languages while maintaining a
 * structured and lightweight representation.
 *
 * - Each **module** can contain various {@link Entity}, categorized as:
 *
 *   - {@link Type} (data structures, classes, interfaces, *etc.*).
 *   - {@link Callable} (functions, methods, constructors, *etc.*).
 *   - {@link Attribute} (properties, fields, *etc.*).
 *
 * - For each entity, a corresponding {@link Code} attribute should be generated, capturing:
 *
 *   - Extracted **documentation** from the source code.
 *   - Extracted **declaration** and, if available, **implementation** details.
 *   - A list of **referenced types** inferred from the declaration (if applicable).
 *
 * - {@link Type} should also include {@link Attribute} list (properties, fields, etc.) and {@link Callable} list
 *   (methods, functions, etc.).
 *
 * - All {@link Entity}:
 *
 *   -  include a {@link Semantic} property, providing language-specific metadata and context.
 *   -  is associated with a {@link Documentation} object.
 *
 * </note>
 *
 * The root {@link Navigation} node of the API documentation is generated using {@link codeApiEntryNode}.
 * By default, it utilizes a {@link HttpClient} to fetch module data from `.json` files,
 * with each file representing a {@link Module}. The module is then displayed on the page using
 * {@link ModuleView}.
 *
 * <note level="warning">
 * This module does **not** handle the generation of `.json` files. For details on generating these files,
 * refer to {@link MkApiBackends}.
 * </note>
 *
 *
 * @module CodeApi
 */
export * from './lib'

// noinspection ES6UnusedImports Include for documentation
export type * as MkApiBackendsModule from './mkapi-backends'
