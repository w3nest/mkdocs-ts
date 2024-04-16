# API Documentation

API documentation involves generating a set of files that expose the API of an external project.
The generated data implements the structure defined in the module [CodeAPI](@nav/api/CodeApi.models.ts).

Currently, `mkdocs-ts` provides a parser that generates this data for projects based on
[TypeScript](https://www.typescriptlang.org/) and [TypeDoc](https://typedoc.org/).
A parser for Python projects is in development.

## TS-Typedoc Parser

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
