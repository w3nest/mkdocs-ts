# Including Code API

You can integrate API documentation pages into your application.
The API documentation is represented by a <api-link target='Navigation'></api-link> object, 
which can be inserted at a desired location within your app.

<note level='warning' title="Important">
This page focuses on the **rendering** aspect of API documentation. The rendering is based on structured models that
represent your project's API.

For details on generating these models, see <cross-link target="api-backend">API Documentation</cross-link>.

For example, you can fetch the model for the `MainModule` of {{mkdocs-ts}}
<a target="_blank" href="../assets/api/mkdocs-ts/MainModule.json">here</a>.
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

To enable Code API pages, install the <api-link target='CodeApi'></api-link> plugin using
<api-link target='installCodeApiModule'></api-link>:

<js-cell>
const ApiPlugin = await MkDocs.installCodeApiModule()
</js-cell>

In a typical scenario, API documentation data is pre-generated using a backend parser and hosted at specific URLs.
However, for this tutorial, we'll mock the backend data and implement a mock HTTP client.

Normally, API documentation data is generated in advance and hosted at a given URL.
Here, we use mocked data for demonstration.

<note level="hint"> 
If you're working with **real** API data, you can **skip this section** and proceed to the 
**Navigation** setup.
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
        "navPath": "@nav/api/Foo",
        children: [{
            "name": "Bar",
            "semantic": { "role": "module" },
            "path": "Foo.Bar",
            "navPath": "@nav/api/Bar",
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
             "navPath": "@nav/api.foo",
             "code": {
                 "filePath": "src/lib/index.ts",
                 "declaration": "export function foo(): Result",
                 "implementation": "export function foo(): Result {\n    returns 42\n}",
                 "startLine": 1,
                 "endLine": 3,
                 "references": {
                     "foo": "@nav/api.foo",
                     "Result": "@nav/api/Bar.Result"
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
            navPath: "@nav/api/Foo/Bar",
            children: [],
            files: srcFiles,
            attributes: [],
            types: [{
                 "name": "Result",
                 "documentation": {
                     "sections": [
                         {
                            "content": "An alias for result. See [foo](@nav/api.foo).",
                            "contentType": "markdown", 
                            "semantic": { "role": "" }
                         }
                    ]
                  },    
                 attributes: [],
                 callables: [],
                 "path": "Foo.Bar.Result",
                 "navPath": "@nav/api/Bar.Result",
                 "code": {
                     "filePath": "src/lib/index.ts",
                     "declaration": "export type Result = number",
                     "implementation": "",
                     "startLine": 1,
                     "endLine": 1,
                     "references": {
                         "Result": "@nav/api/Bar.Result"
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
        const assetPath = `${this.project.docBasePath}/${modulePath}.json`
        return rxjs.of(files[assetPath])
    }
    installCss() {
        return webpm.install({
            css: [this.configuration.css(this.project)],
        })
    }
}
</js-cell>

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
    docBasePath: 'assets/api',
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
