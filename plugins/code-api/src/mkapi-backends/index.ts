/**
 * Backends for parsing and generating API documentation from source code.
 *
 * These backends are responsible for converting a project's source files into structured API `.json` files.
 * Each generated file represents a **module** in the project, following the schema defined in {@link Module}.
 *
 * ## Available Backends:
 *
 * - {@link MkApiTypescript}: A TypeScript module, using [TypeDoc](https://typedoc.org/) as
 * primary AST parser, to extract API models for **TypeScript Projects**.
 *
 * - {@link mkapi_python}: Python module, using [griffe](https://mkdocstrings.github.io/griffe/guide/users/) as
 * primary AST parser, to extract API models for **Python Projects**.
 *
 * @module MkApiBackends
 */
export * as MkApiTypescript from './mkapi-typescript'
export * as mkapi_python from './mkapi_python'
// noinspection ES6UnusedImports Include for documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Module } from '../lib'
