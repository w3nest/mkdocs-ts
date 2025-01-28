
# API Documentation

This section explains how to include API documentation for one or more projects in your application.

Integrating API documentation involves two key steps:

1. **Generate API data models** (`.json` files) for the project you want to document.

2. **Integrate the generated data models** into your application's navigation.

## Generating API Data Models

{{mkdocs-ts}} provides two built-in backends for generating API data models:

- **<api-link target="MkApiTypescript"></api-link>** – Parses **TypeScript** projects.

- **<api-link target="mkapi_python"></api-link>** – Parses **Python** projects.

Refer to their respective documentation for details on usage and configuration.

Once the backend has successfully processed the project, it generates a set of `.json` files in the specified output folder.

<note level="hint" title="New Backends">  
If you'd like to develop a backend for another programming language, feel free to open an issue and collaborate with us.  

Once implemented, new backends will be referenced here.  
</note>

## Integrating into Navigation

To display API documentation in your application, use the **<api-link target="CodeApi"></api-link>** module to integrate
the data models into your **<api-link target="Navigation"></api-link>**.

For a step-by-step guide, check out the interactive tutorial <cross-link target="code-api">here</cross-link>.