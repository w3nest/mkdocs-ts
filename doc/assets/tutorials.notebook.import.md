# Import

There are three primary methods for importing external components within a notebook page:

1. **Static Imports** : Import components that are available within the project's application, particularly those 
included in its `node_modules` folder.

2. **Dynamic Imports**: Install packages on-demand from a CDN at run time. This document explains the usage of
   <ext-link target="webpm">WebPM</ext-link>.

3. **Cross Pages Import**: Share components across multiple notebook pages.


Before diving into the details, let's install {{mkdocs-ts}}:

<js-cell language='javascript'>
const { MkDocs, NotebookModule, rxjs } = await webpm.install({
    esm:[ 
        'mkdocs-ts#{{mkdocs-version}} as MkDocs',
        `@mkdocs-ts/notebook#^{{notebook-version}} as NotebookModule`,
        // rxjs is used later in this page
        'rxjs#^7.5.6 as rxjs'],
    css: [
        `mkdocs-ts#^{{mkdocs-version}}~assets/mkdocs-light.css`,
        `@mkdocs-ts/notebook#^{{notebook-version}}~assets/notebook.css`,
    ]
})
</js-cell>

<note level="info">
The `webpm.install` function used above is an example of **Dynamic Imports**. 
It is introduced and explained later in this document. 
</note>

---

## Static Imports & Built-in Dependencies

The <api-link target="NotebookPage"></api-link> constructor accepts an `initialScope` parameter, which allows 
injecting symbols (variables or modules) into the first cell of the notebook.

This is particularly useful for providing ESM modules that are available within the hosting application.

The following example demonstrates how to inject a dummy `exportedModule` symbol into a notebook page:

<js-cell language='javascript'>

const src =  `

### Hello world

<js-cell>
display(exportedModule.sayHello())
</js-cell>
`
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
    layout: ({router}) => new NotebookModule.NotebookPage({
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
    // For real scenario the following parameter is not needed.
    // It is used here to not re-locate your browser when navigating in this example.
    browserClient: (p) => new MkDocs.MockBrowser(p)
})

display({
    tag: 'div',
    class: 'py-3 my-3',
    children:[
        // We only display the page, not the navigation & TOC views
        new MkDocs.DefaultLayout.PageView({
            router
        })
    ]
})
</js-cell>

---

## Dynamically Install Dependencies

This section explains how to install dependencies directly from a notebook cell using an online
CDN (Content Delivery Network). Several solutions exist for this purpose, but here we focus on
<ext-link target="webpm">WebPM</ext-link>.


<note level="info" title="**Why WebPM?**">

*   ✅ **Beyond JavaScript**: WebPM isn’t just for **ESM (JavaScript) modules**—it also supports
    **Python** (via <ext-link target="pyodide">Pyodide</ext-link>, running in-browser) and
    **Backend components** (under certain conditions, see the dedicated section below).
*  ✅ **Automatic Dependency Management**: WebPM resolves dependencies automatically, ensuring version compatibility 
   by retrieving the latest packages following semantic versioning.  It also optimizes installations by detecting and 
   skipping already available resources.

This section provide a brief introduction on how to use WebPM within notebook pages. 
More details on its API, available packages, publishing processes, are available 
<ext-link target="webpm">here</ext-link>.
</note>


<note level="warning" title="`webpm` instance">
To provide the `webpm` client available to your pages, don't forget to provide it in the initial scope.
For instance:

<code-snippet language="javascript">
import * as webpm from '@w3nest/webpm-client'
import { NotebookPage } from '@mkdocs-ts/notebook'

const notebookPage = new NotebookPage(
    {
        /*...*/
        initialScope: {
            const: {
                webpm,
            },
            let: {},
        },
    }
)
</code-snippet>

</note>

The `webpm` instance allows to install packages dynamically:

<code-snippet language='javascript'>
await webpm.install({
    esm: /*...*/,
    pyodide: /*...*/,
    backends: /*...*/,
    css: /*...*/,
})
</code-snippet>

To enhance the installation process with real-time progress display, WebPM offers an optional **Views module**,
which can be installed with:

<js-cell>
const WebPmViews = await webpm.installViewsModule()
</js-cell>

This module provides the `installWithUI` function, which works like `webpm.install` but includes a visual progress 
indicator:

<js-cell>
const { installWithUI } = WebPmViews
</js-cell>

The following sections demonstrate how to use `installWithUI` to install **ESM**, **Python modules**, and 
**Backend components**.

### ESM modules

The next example installs a low-code framework, but the same process applies to any ESM module available on WebPM.

<js-cell>
const esmInstall = async () => {
    const { JSConfetti } = await installWithUI({
        esm:['js-confetti#^0.12.0 as JSConfetti'],
        display
        }
    )
    new JSConfetti().addConfetti({
        emojis: ['🌈', '⚡️', '💥', '✨', '💫', '🌸']
    })
}

display({
    tag: 'button',
    class: 'btn btn-primary btn-sm',
    innerText: 'Install ESM',
    onclick: () => esmInstall()
})

</js-cell>

Click the above button to trigger the installation. 
The view automatically collapses upon installation success, but you can re-expand it for details.

<note level='hint'>
*  **`webpm.install` vs `installWithUI`** - `installWithUI` introduces an additional `display` 
   parameter, a callback function responsible for rendering the installation view. In this example, we use 
   the cell’s built-in `display` function.
</note>



### In-Browser Python modules

Installing Python modules with WebPM makes the following available within the browser:

*  A **<ext-link target="pyodide">Pyodide</ext-link> runtime**.

*  The requested **Python packages**

The following snippet install Pyodide at the latest version available and the module `numpy`:

<js-cell>
const pyCode = `
import numpy

str(numpy)
`
const pyInstall = async () => {
    const { pyodide } = await installWithUI({ 
        pyodide: ["numpy"], 
        display
    })
    display("Numpy: ",pyodide.runPython(pyCode))
}

display({
    tag: 'button',
    class: 'btn btn-primary btn-sm',
    innerText: 'Install Python',
    onclick: () => pyInstall()
})

</js-cell>

This is the foundation of <api-link target="PyCellView"></api-link>, which enables Python execution in notebook pages.
A key advantage of this approach—compared to using a backend interpreter for Python execution—is the ability to 
seamlessly mix Python and JavaScript. 
You can call Python functions from JavaScript objects and vice versa, creating a fully integrated, interactive 
JavaScript + Python environment.
Learn more in the <cross-link target='notebook.python'>Python Tutorial</cross-link>.

---

### External Backends via W3Nest 

For users running the <ext-link target="w3nest">W3Nest</ext-link> local server, it is possible to install
**backends on the fly**, enabling the use of languages or libraries that cannot run directly in the browser.

<note level="warning">
Notebook pages utilizing custom backends will only work for users running your application through the **W3Nest** 
local server.

Want to give it a try? *(Linux & Mac only for now)*
*  Run `pipx run w3nest`
*  <a href="http://localhost:2000/apps/@mkdocs-ts/doc/latest?nav=/tutorials/notebook/import.python-modules"
   target="_blank">Reload this page</a>

</note>

If you have W3Nest running, click the button below to install the backend:

<js-cell>

const backendInstall = async () => {
    // Install the backend (more info below)
    const { pyrun } = await installWithUI({
        backends:['pyrun_backend#^0.2.0 as pyrun'],
        display
    })
    // Send a POST request to '/run' (execute Python code)
    const body = { code: 'import platform\nsystem = platform.python_version()', cellId:'foo', capturedIn:{}, capturedOut:['system'] }
    const resp = await pyrun.fetchJson(
        '/run', 
        {   method: 'post',
            body: JSON.stringify(body),
            headers: { 'content-type': 'application/json' }
        })
   display("Python Version:", resp.capturedOut.system)
}

display({
    tag: 'button',
    class: 'btn btn-primary btn-sm',
    innerText: 'Install Backend',
    onclick: () => backendInstall()
})

</js-cell>


The example above installs the `pyrun_backend`, a backend that follows the <api-link target="InterpreterApi"></api-link>
and can be used within {{mkdocs-ts}} notebook pages to execute <api-link target="InterpreterCellView"></api-link>.
More information in the upcoming tutorial <cross-link target="notebook.interpreter">Backend Interpreter</cross-link>.


The `pyrun_backend` is included in the {{mkdocs-ts}} repository,
and its documentation can be found here: <api-link target='pyrun_backend'></api-link>.

<note level="info">
Unlike Pyodide, which is suitable for running lightweight Python code in the browser,
`pyrun_backend` provides a fully configurable environment: not only Python modules can be specified, but also the 
Python version, as well as additional system dependencies. 
</note>

---

## From other pages

When building notebook projects, you may want to reuse code or hide implementation details in separate
notebook pages. The `load` function allows you to dynamically import components from other pages within JavaScript cells.

The next cell illustrates this feature by importing the `ChartView` function from the
<cross-link target="notebook.utils.2d-chart">Import-Utils page</cross-link>: 

<js-cell>
const { ChartView } = await load("/tutorials/notebook/import-utils")

const data = rxjs.timer(0,1000).pipe(
    rxjs.map(() => ({
        x: Array.from({length: 100}, () => Math.random()),
        y: Array.from({length: 100}, () => Math.random())
    }))
)

display( await ChartView({data}) )
</js-cell>

<note level='warning' title="Importing Pyodide Symbols">
Currently, **only functions** can be exported from Python (Pyodide) cells. 
For more details, refer to the <cross-link target="notebook.python">Python Tutorial</cross-link>.
</note>