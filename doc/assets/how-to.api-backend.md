# API Documentation

API documentation involves generating a set of files that expose the API of an external project.
The generated data implements the structure defined in the module [CodeAPI](@nav/api/CodeApi.models.ts).

Two backends are available to generate the API files:
*  **TS-Typedoc**: Backend to generate API files for TypeScript projects using
   [TypeDoc](https://typedoc.org/).
*  **mkdocs_py_griffe**: Backend to generate API files for Python projects using 
   [griffe](https://mkdocstrings.github.io/griffe/).

Once API files are generated, refer to [this document](@nav/tutorials/code-api) to include them in your 
navigation object.


## TS-Typedoc Backend

The `ts-typedoc` backend API generator is still a work in progress, and the following instructions will
simplify it in the near future.

### Requirements:

- **In the API project** (the project for which you want to generate API data):
  - `typedoc` and `typescript` must be available in the `node_modules` folder.
  - The `typedoc` configuration file is also expected in this folder.
- **In the documentation project** (the project that defines the documentation application):
  - `mkdocs-ts` must be available in the `node_modules` of the project.

### Usage:

You can use the following node script to generate API data:

```shell
(cd $docAppPath/node_modules/@youwol/mkdocs-ts/ \
&& node ./bin/index.js \
    --project $apiPath \
    --nav /api \
    --out $docAppPath/assets/api)
```

### Parameters:

- **$docAppPath**: Path of the documenting application.
- **$apiPath**: Path of the API project.
- **--project**: Specifies the API project path.
- **--nav**: Specifies the base path where the API is served in the documentation application.
- **--out**: Specifies the output directory for the generated API data.


## mkdocs_py_griffe

### Requirements

- **In the documentation project** (the project that defines the documentation application):
    -  `mkdocs-ts` must be available in the `node_modules` of the project.
    -  Navigate to `node_modules/@youwol/mkdocs/src/backends/mkdocs_py_griffe`
    -  Run `pip install .`


### Usage

To generate the API files:
*  Generate the documentation AST of your module using
   <a href="https://mkdocstrings.github.io/griffe/loading/">griffe.load</a>.
*  Call the function [generate_api](@nav/api/Backends/mkdocs_py_griffe.py_griffe.generate_api)

A typical example:

<code-snippet language="python">
import griffe
from mkdocs_py_griffe import generate_api, Configuration, std_links

config = Configuration(
    base_nav='base/path/url',
    external_links=std_links(),
    out='/output/folder'
)

doc_ast = griffe.load('mkdocs_py_griffe', submodules=True)
generate_api(global_doc, config)
</code-snippet>
