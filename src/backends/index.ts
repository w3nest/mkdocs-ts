/**
 * Backends available to parse code API.
 *
 * Backend API generators are in charge to convert project's sources files into a set of 'API' files,
 * each file representing one module of the project.
 *
 * **Conditions for Generation**:
 *
 *    - The language is organized hierarchically into modules.
 *
 *    - Modules can contain entities grouped as {@link CodeApi.Type}, {@link CodeApi.Callable},
 *      or {@link CodeApi.Attribute}.
 *
 *    - For each entity, it should be possible to construct a {@link CodeApi.Code} attribute, which includes:
 *      - Extracting documentation from the source code.
 *
 *      - Extracting declaration and optionally implementation from the source code.
 *
 *      - Extracting the list of known types involved from a declaration (if applicable).
 *
 *    - For {@link CodeApi.Type}, it should be possible to extract associated lists of {@link CodeApi.Attribute} and
 *    {@link CodeApi.Callable}.
 *
 *    - All entities have a {@link CodeApi.Semantic} property providing language-specific semantic information.
 *
 *    - All entities are associated with {@link CodeApi.Documentation}.
 *
 * @module Backends
 */
export * as TsTypedoc from './ts-typedoc'
