/**
 * # Overview
 *
 * This is the **main module** of the library.
 *
 * ## Core
 *
 * The module defines the {@link Router} class, responsible for handling navigation between {@link Navigation} nodes.
 *
 * ## Views
 *
 * In terms of views, this module provides a {@link CompositeLayout}, which can wrap multiple layout types.
 * The library also includes a default layout, defined in the {@link DefaultLayout} module.
 *
 * ## Markdown
 *
 * The module includes Markdown processing utilities through the {@link parseMd} and {@link parseMdFromUrl} functions.
 *
 * Various options are available, including support for defining custom views.
 *
 * ## Logging
 *
 * The module provides utilities for {@link Context} management, offering structured logging across the package.
 * It includes two built-in reporters, both implementing {@link ReporterTrait}:
 *
 * - {@link ConsoleReporter} (logs to the console).
 *
 * - {@link InMemoryReporter} (stores logs in memory).
 *
 * @module MainModule
 */
// noinspection ES6UnusedImports Include for documentation
import type * as DefaultLayout from './lib/default-layout' // eslint-disable-line  @typescript-eslint/no-unused-vars
export * from './lib'
