# Installation

## From npm

You can install {{mkdocs-ts}} using npm:

```shell
npm install mkdocs-ts
```

Or using yarn:

```shell
yarn add mkdocs-ts
```

## From CDN

If you prefer using a CDN, note that the library doesn't come bundled with its dependencies. 
However, you can easily include it in your webpage using `@w3nest/webpm-client` that take care of retrieving 
indirect dependencies and dynamic linking.
A simple standalone example can be found <a href="{{URL-example1}}" target="_blank">here</a>.

--- 

# Setup

It is recommended to use **TypeScript** to build your application. Here’s how to get started:

*  Include `mkdocs-ts` in your project dependencies.
*  Link the necessary stylesheets (referenced in the above cell) in your project.
*  If you plan to use notebook features along with dynamic import using `@w3nest/webpm-client`, 
   add `<script src="https://w3nest.org/webpm-client.js"></script>` script to your `index.html`'s header.


A typical project has the following structure:

*  TypeScript Files:
    *  Define the navigation, router, and application objects (`nav`, `router`, and `app` in the above example).
    *  Use the `html` attribute of navigation nodes to reference URLs of Markdown files.
*  Markdown Files:
    *  Create a folder to include the Markdown files, where you write the notebook contents. The files within
       the folder need to be accessible with known URL.

To streamline your development workflow, use a dev-server that automatically reloads the application whenever
TypeScript or Markdown sources are updated. This ensures that changes are immediately reflected in your project.

The <a href="https://w3nest.com/w/mkdocs-ts/blob/main/doc/" target="_blank">source code</a>
of this very application can provide insights in using the library in a typescript environment.