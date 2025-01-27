Welcome to the **mkdocs-ts** API documentation.

The primary entry point of the library is {@link MainModule}, which serves as the core module for managing
documentation rendering and processing.

## **Plugins**

**mkdocs-ts** includes two built-in plugins to enhance your documentation:

- {@link Notebook} – Enables the integration of notebook-style pages into your application, allowing for interactive
  and dynamic content.

- {@link CodeApi} – Provides support for generating API documentation pages, making it easy to document
  your project's codebase.

## **Backends**

The library also includes multiple {@link Backends} implementations, which serve different purposes:

- **Code API Documentation Backends** – Generate structured source data for API documentation.

- **Notebook Execution Backends** – Interpret and execute code within notebook pages, enabling interactive coding
  experiences.
