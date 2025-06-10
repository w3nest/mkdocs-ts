# Including Code API

You can integrate API documentation pages into your application.
The API documentation is represented by a <api-link target='Navigation'></api-link> object, 
which can be inserted at a desired location within your app.

<note level='warning' title="Important">
This page focuses on the **rendering** aspect of API documentation. The rendering is based on structured models that
represent your project's API.
For example, you can fetch the model for the {{mkdocs-ts}} main module
<a target="_blank" href="../assets/api/mkdocs-ts/MainModule.json">here</a>.

There are two built-in backends for generating API data models:

- **<api-link target="MkApiTypescript"></api-link>** – Parses **TypeScript** projects.

- **<api-link target="mkapi_python"></api-link>** – Parses **Python** projects.

Refer to their respective documentation for details on usage and configuration.

Once the backend has successfully processed the project, it generates a set of `.json` files in the specified 
output folder.


</note>

## Requirements

### MkDocs-TS

Start by ensuring {{mkdocs-ts}} is installed along with its required dependencies:

<js-cell>
const version = "{{mkdocs-version}}"

const { MkDocs } = await webpm.install({
    esm:[ `mkdocs-ts#${version} as MkDocs`],
    css: [
        // Required by mkdocs-ts itself:
        'bootstrap#5.3.3~bootstrap.min.css',
        `mkdocs-ts#${version}~assets/mkdocs-light.css`,
        // Required by the code of this page
        'fontawesome#5.12.1~css/all.min.css',
    ]
})
display(MkDocs)
</js-cell>

### Code API plugin

To enable Code API pages, install the <api-link target='CodeApi'></api-link> plugin:

<js-cell>
const { ApiPlugin } = await webpm.install({
    esm:[ `@mkdocs-ts/code-api#{{code-api-version}} as ApiPlugin`],
    css: [
        `@mkdocs-ts/code-api#{{code-api-version}}~assets/ts-typedoc.css`,
    ]
})
display(ApiPlugin)
</js-cell>


In a typical scenario, API documentation data is pre-generated using a backend parser and hosted at specific URLs.
However, for this tutorial, we'll mock the backend data and implement a mock HTTP client.

<note level="hint"> 
If you're working with **real** API data, you can **skip this section**.
</note>

<note level="abstract" title="Mock client" expandable="true" mode="stateful">

**Mock API Data**

<note level='abstract' title="Mock Data" expandable="true" mode="stateful">
<js-cell>
const noSem = { "role": "" }
const srcFiles = [{
    "name": "index.ts",
    "path": "src/lib/index.ts",
    "documentation": {"sections": []}
}]

const files = {
    'assets/api/Foo.json':{
        name: "Foo",
        semantic: { "role": "module" },
        documentation:{
            "sections":[{
                "content": "This is the documentation for `Foo`.",
                semantic: noSem
            }]
        },
        "path": "Foo",
        "navPath": "@nav[Foo]/Foo",
        children: [{
            "name": "Bar",
            "semantic": { "role": "module" },
            "path": "Foo.Bar",
            "navPath": "@nav[Foo]/Bar",
            "isLeaf": true
        }],
        files: srcFiles,       
        attributes: [],
        types: [],
        callables: [{
             "name": "foo",
             "documentation": {
                 "sections": [
                     {
                        "content": "Returns 42", "contentType": "markdown", "semantic": {"role": "",}
                      }
                ]
              },
             "path": "Foo.foo",
             "navPath": "@nav[Foo].foo",
             "code": {
                 "filePath": "src/lib/index.ts",
                 "declaration": "export function foo(): Result",
                 "implementation": "export function foo(): Result {\n    returns 42\n}",
                 "startLine": 1,
                 "endLine": 3,
                 "references": {
                     "foo": "@nav[Foo].foo",
                     "Result": "@nav[Foo]/Bar.Result"
                 }
             },
             "semantic": { "role": "function" }
        }]
    },
    'assets/api/Foo/Bar.json':{
            name: "Bar",
            semantic: { "role": "module" },
            documentation:{
                "sections":[{
                    "content": "This is the documentation for `Bar`.",
                    semantic: noSem
                }]
            },
            path: "Foo.Bar",
            navPath: "@nav[Foo]/Foo/Bar",
            children: [],
            files: srcFiles,
            attributes: [],
            types: [{
                 "name": "Result",
                 "documentation": {
                     "sections": [
                         {
                            "content": "An alias for result. See <mkapi-api-link nav='@nav[Foo].foo' semantic='function'>foo</mkapi-api-link>.",
                            "contentType": "markdown", 
                            "semantic": { "role": "" }
                         }
                    ]
                  },    
                 attributes: [],
                 callables: [],
                 "path": "Foo.Bar.Result",
                 "navPath": "@nav[Foo]/Bar.Result",
                 "code": {
                     "filePath": "src/lib/index.ts",
                     "declaration": "export type Result = number",
                     "implementation": "",
                     "startLine": 1,
                     "endLine": 1,
                     "references": {
                         "Result": "@nav[Foo]/Bar.Result"
                     }
                 },
                 "semantic": { "role": "type-alias" }
            }],
            callables: []
        }
}
</js-cell>
</note>

**Mock HTTP Client**

The mock client implements the <api-link target="HttpClientTrait"></api-link>:

<js-cell>
const { rxjs } = await webpm.install({
    esm:[ `rxjs#^7.5.6 as rxjs`]
})

class MockClient {
    constructor({configuration, project}){
        this.configuration = configuration
        this.project = project
    }
    fetchModule(modulePath){
        const assetPath = `${this.project.dataFolder}/${modulePath}.json`
        return rxjs.of(files[assetPath])
    }
}
</js-cell>
http://localhost:2000/apps/@mkdocs-ts/doc/0.5.1-wip/dist/@nav[
</note>

## Navigation & App

### API Node

The root node for the API documentation is created using
<api-link target="codeApiEntryNode"></api-link>:


<js-cell>
const apiNode = ApiPlugin.codeApiEntryNode({
    name: 'API',
    header: {
        icon: { tag: 'i', class: `fas fa-code` }
    },
    entryModule: 'Foo',
    dataFolder: 'assets/api',
    rootModulesNav: {
        'Foo': '@nav/api'
    },
    configuration: ApiPlugin.configurationTsTypedoc,
    // This next parameter is not required in usual setup
    httpClient: ({project, configuration}) => new MockClient({project, configuration}) 
})
</js-cell>

### Navigation


Next, we insert apiNode at the desired location within the app’s navigation structure:

<js-cell>
const navigation = {
    name: "Code API Example",
    layout: () => MkDocs.parseMd({src:`
# An example with code API documentation

Navigate to [Foo API documentation](@nav/api).
`}),
    routes: {
        '/api': apiNode
    }
}

</js-cell>

### App

We proceed as usual to create the application:

<js-cell cell-id="app">
const { withNavBar } = await load("/tutorials/basics/code-utils")
const topBanner = {
    logo: {
        icon: { tag:'div', innerText:'📜' },
        title: 'API doc.'
    },
}
const view = await withNavBar({navigation, topBanner})
display(view)
</js-cell>


<cell-output cell-id="app" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;">
</cell-output>


The above example will include the code API documentation under the `/api` node.
