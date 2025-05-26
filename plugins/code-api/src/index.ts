/**
 * The Code API Plugin integrates API documentation into your application.
 *
 * API documentation is structured based on the module hierarchy, where each page corresponds to a specific module.
 *
 * The root node of the API documentation is generated using {@link CodeApi.codeApiEntryNode}.
 * By default, it utilizes a {@link CodeApi.HttpClient} to fetch module data from .json files,
 * with each file representing a {@link CodeApi.Module}. The module is then displayed on the page using
 * {@link CodeApi.ModuleView}.
 *
 * <note level="warning">
 * This module does **not** handle the generation of `.json` files. For details on generating these files,
 * refer to {@link MkApiBackends}.
 *</note>
 *
 * @module CodeApi
 */
export * from './lib'

// noinspection ES6UnusedImports Include for documentation
export type * as MkApiBackendsModule from './mkapi-backends'
