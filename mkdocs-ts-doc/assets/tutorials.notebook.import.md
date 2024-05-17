# Import

There are three methods for making external components accessible within a notebook page:
1. Import components that are available within the project application, especially those included in 
its `node_modules` folder.
2. Dynamically install components using the `webpm` CDN installer.
3. Load symbols defined in other notebook pages.


## From project application

The [NotebookPage](@nav/api/Notebook.NotebookPage) constructor accepts an `initialScope` parameter, which can be utilized to supply symbols to the 
first cell. This allows for the provision of ESM modules available within the hosting application, among other uses.

The next cell illustrates the injection within a notebook page of a dummy `exportedModule` symbol:

<js-cell language='javascript'>
const { MkDocs, RxDom } = await webpm.install({
    modules:[ '@youwol/mkdocs-ts#{{mkdocs-version}} as MkDocs' ],
    css: [
        `@youwol/mkdocs-ts#{{mkdocs-version}}~assets/mkdocs-light.css`,
        `@youwol/mkdocs-ts#{{mkdocs-version}}~assets/notebook.css`,
    ]
})
const src =  `
### Hello world

<js-cell>
display(exportedModule.sayHello())
</js-cell>
`
const NotebookModule = await MkDocs.installNotebookModule()

// This is a dummy example,
// in practice you may want to provide module from the node_modules
const exportedModule = { 
    sayHello: () => ({
        tag: 'div', 
        class:'border rounded p-2', 
        innerText: 'Hello!'
    })
}

const nav = {
    name: 'Notebook',
    tableOfContent: MkDocs.Views.tocView,
    html: ({router}) => new NotebookModule.NotebookPage({
        src,
        router,
        initialScope: {
            const: {
                exportedModule
            }
        }
    }),
}
const router = new MkDocs.Router({ 
    navigation: nav, 
    // For real scenario the following parameters is not needed.
    // Here it is used to not re-locate the browser when navigating in this example.
    mockBrowserLocation: { 
        initialPath:'https://foo.com/?nav=/', 
        history:[]
    }
})

const app = new MkDocs.Views.DefaultLayoutView({
    router,
    name: 'Demo App',
})

display({
    tag: 'div',
    style:{ height:'500px' },
    children:[app]
})
</js-cell>





## From `webpm` CDN installer


WebPM is a CDN package installer that provides *smart* installation for ESM modules, Python packages, scripts, and CSS. 
It can also install backends if your application is running through py-youwol. 
Its intelligence lies in its ability to resolve both direct and indirect dependencies of the requested resources, 
and to ensure that the latest compatible versions, according to semantic versioning, are retrieved.


<note level='info'>
  The py-youwol environment is an ideal companion for creating your projects. 
  It emulates a deployed cloud environment, allowing you to inject ongoing work on your components 
  (modules, backends, etc.), access and organize data, lazily download missing resources, and take advantage of many 
  other cloud-like features. Your projects can then be shared at any time by publishing them in the online youwol 
  ecosystem.

  More information on py-youwol can be found 
  <a href='/applications/@youwol/py-youwol-doc/latest' target='_blank'> here</a>.
</note>


<note level='warning' label="Important">
The ESM and backend components available are those published in the online youwol ecosystem.
The Python packages available come from the pyodide ecosystem, including pure Python wheels from PyPI and 
<a href="https://pyodide.org/en/stable/usage/packages-in-pyodide.html" target='_blank'>pyodide packages</a>.

To check and/or request the availability of an NPM package, please visit this
<a target="_blank" href="https://platform.youwol.com/applications/@youwol/npm-explorer/latest">link</a>.
</note>


### ESM modules

The following example illustrates a somewhat complex installation scenario involving dependencies that share indirect 
dependencies, potentially in incompatible versions. Each fetched library is installed as a standalone entity and 
linked at runtime.

<js-cell cell-id="vs-flow-0">
const {VSF, Canvas, rxDom, rxjs} = await webpm.install({
    modules:[
        '@youwol/vsf-core#^0.2.4 as VSF', 
        '@youwol/rx-vdom as rxDom', 
        '@youwol/vsf-canvas#^0.2.2 as Canvas'],
    css: [
        'bootstrap#^4.4.0~bootstrap.min.css', 
        'fontawesome#5.12.1~css/all.min.css', 
        '@youwol/fv-widgets#latest~dist/assets/styles/style.youwol.css']
})
let project = new VSF.Projects.ProjectState()
project = await project.with({
    toolboxes:["@youwol/vsf-three", '@youwol/vsf-pmp', '@youwol/vsf-rxjs'],
    workflow: {
        branches:[
            "(of#of)>>(torusKnot#geom)>>(fromThree#three->pmp)>>(uniformRemeshing#remesh)>>(toThree#pmp->three)>>0(combineLatest#combine)>>(mesh#threeMesh)>>(viewer#viewer)",
            "(#of)>>(standardMaterial#material)>>1(#combine)"
        ],
        configurations:{
            material: { wireframe: true },
            remesh: { edgeFactor: 0.7 }
        }
    }
})
const view = project.instancePool.inspector().getModule('viewer').html() 
display({
    tag:'div',
    class:'w-100',
    style:{
        aspectRatio: '1/1',
        maxHeight: '100%'
    },
    children:[view]
})
</js-cell>

<cell-output cell-id="vs-flow-0" full-screen="true">
</cell-output>

<note level='info'>

The above example is a low-code application using the vs-flow library. It creates a 3D geometry (a torus knot),
which is then re-meshed using the <a href="https://www.pmp-library.org/" target="_blank">PMP</a> C++ library ported 
to <a href="https://webassembly.org/" target="_blank">WASM</a>, and finally combined with a wireframe material to be 
displayed in a 3D viewer (from <a href="https://threejs.org/" target="_blank">three.js</a> library).

The following cell allows displaying the associated DAG:

<js-cell cell-id="vs-flow-1">
const dag3D = new Canvas.Renderer3DView({
    project$: rxjs.of(project), workflowId: 'main'
})
display({
    tag:'div',
    class:'w-100',
    style:{
        aspectRatio: '1/1',
        maxHeight: '100%'
    },
    children:[dag3D]
})
</js-cell>
<cell-output cell-id="vs-flow-1" full-screen="true">
</cell-output>

</note>


### Python modules

Installing Python modules from webpm means making the following accessible within the browser environment:
*  A Python runtime.
*  A list of requested packages.

For more information on this topic, please navigate to the [Python page](@nav/tutorials/notebook/python).


### Backends 

For users using the py-youwol local server, it is also possible to install backends on the fly. 
This provides opportunities to use languages or libraries that cannot run in the browser.

<note level="warning">
A notebook using such custom backends will only be able to run for users who have py-youwol installed and 
are running your application (from a provided URL) with it.
</note>

The next cell illustrates such an installation. It is initially commented for users running this document online.
In case you are running this page from py-youwol, you can uncomment the code and proceed to its execution.

<js-cell>
/*
const {client} = await webpm.install({
    backends:['demo_yw_backend#^0.1.0 as client'],
    onEvent: (ev) => display(ev.text)
})

display(
    new Views.Text('Response from **`GET:/hello-world`**:'), 
    client.fromFetchJson('/hello-world')
)
*/
</js-cell>

<note level='info'>
A good practice for a backend is to expose its API documentation under a `/docs` endpoint. 
If this application is running from the local py-youwol server, you can access it by following, for example:

<a href="/backends/demo_yw_backend/^0.1.0/docs" target="_blank">/backends/demo_yw_backend/^0.1.0/docs</a>
</note>

<note level="hint">
Interested in trying the local py-youwol server? 
* Run `pipx run youwol`.
* Reload this
<a href="http://localhost:2000/applications/@youwol/mkdocs-ts-doc/latest?nav=/tutorials/notebook/import.python-modules" 
target="_blank">page</a>.

⚠️ Not yet available for Windows hosts. We are working on it...

Refer to the py-youwol 
<a href="https://platform.youwol.com/applications/@youwol/py-youwol-doc/0.1.10-wip?nav=/how-to/install-youwol" 
target="_blank">install guide</a> for more information in case of troubles.
</note>

## From another notebook page

When designing your notebook projects, you may want to factorize code or hide implementation details in separate
notebook pages. The `load` function is available within JavaScript cells to do so.

The next cell illustrates this feature by importing the `timer1s` variable from this
[page](@nav/tutorials/notebook/import/from-page): 

<js-cell>
const {timer1s} = await load("/tutorials/notebook/import/from-page")

</js-cell>

You can then reference the variables imported, eventually reactive ones (the next cell is reactive):

<js-cell reactive='true'>
const div = document.createElement('div')
div.innerText = `Tick : ${timer1s}`
display(div)
</js-cell>

<note level='warning'>
Regarding python cells, only functions can be exported for now. 
Visit [this page](@nav/tutorials/notebook/python) for more information on this topic.
</note>