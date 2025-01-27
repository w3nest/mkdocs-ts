Welcome to the **mkdocs-ts** API documentation.

The primary entry point of the library is {@link MainModule}, which serves as the core module for managing
documentation rendering and processing.

## **Plugins**

**mkdocs-ts** includes two built-in plugins to enhance your documentation:

- {@link Notebook} – Enables the integration of notebook-style pages into your application, allowing for interactive
  and dynamic content.

- {@link CodeApi} – Provides support for generating API documentation pages, making it easy to document
  your project's codebase.

## **MkApiBackends**

The  {@link MkApiBackends} module gathers backends to generate code API data for a project.
These data are then consumed by the {@link CodeApi} plugin.
