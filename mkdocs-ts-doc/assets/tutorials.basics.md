# Basics

## Creating a Simple Application

In `mkdocs-ts`, a document is essentially defined by a [Navigation](@nav/api/MainModule.Navigation) object. Here's a simple example:

<code-snippet language='javascript'>
import { Navigation, Router, Views } from '@youwol/mkdocs-ts'
import { render } from '@youwol/rx-vdom'

// Define the table of contents view
const tableOfContent = Views.tocView

// Define the navigation structure
const navigation: Navigation = {
    name: 'Root Node',
    tableOfContent,
    html: () => ({
        tag: 'div',
        innerText: 'HTML view of the root page',
    }),
    '/node-1': {
        name: 'First child',
        tableOfContent,
        html: () => ({
            tag: 'div',
            innerText: 'HTML view of the "First child" page',
        }),
    },
    '/node-2': {
        name: 'Second child',
        tableOfContent,
        html: () => ({
            tag: 'div',
            innerText: 'HTML view of the "Second child" page',
        }),
    },
}
</code-snippet>

The `Navigation` object is a recursive structure defining nodes, each associated with a name, main HTML content
(using the `html` attribute), and optionally a table of contents. Views are declarative, defined by a virtual DOM 
from the library `@youwol/rx-vdom`. A default `tableOfContent` view is provided by the library, and it is 
also possible to define custom ones.

Nodes can define children using attributes starting with a **`/`**. The name of the attribute defines the associated 
part in the URL.

Creating an application using the navigation object is straightforward:

<code-snippet language='javascript' highlightedLines="5 9-12">
import { render } from '@youwol/rx-vdom'
import { Router, Views } from '@youwol/mkdocs-ts'
import { navigation } from './navigation' // or from another file

// Create a router with the navigation object and base path
const router = new Router({ navigation })

// Render the application
const app = render(
    new Views.DefaultLayoutView({
        router,
        name: 'Demo App',
    }),
)
</code-snippet>

This code sets up a router with the provided navigation object and base path, then renders the application using the 
default layout view.


## Main HTML Content

The definition of the main HTML content in `@youwol/mkdocs-ts` is flexible. 
It can accommodate views returned by promises or observables, and the virtual DOM structure returned can directly
include any HTMLElement, allowing you to render elements created by other libraries.

### Using Markdown for Views

Markdown is a first-class citizen of `@youwol/mkdocs-ts`, and utilities are provided by the library. 
Here's an introduction to using Markdown for rendering pages:

<code-snippet language='javascript' highlightedLines="0 3-5 9-13">
import { parseMd } from '@youwol/mkdocs-ts'

const mdSrc = `
# Including Markdown

Just a simple example.
`

const navigation: Navigation = {
    name: 'Root Node',
    html: ({ router }: { router: Router }) => parseMd({
        src: mdSrc,
        router
    }),
}

const app = render(
    new Views.DefaultLayoutView({
        router: new Router({ navigation, basePath: '/my-domain/my-app' }),
        name: 'Demo App',
    })
)
</code-snippet>

Markdown sources can also be retrieved from URLs, allowing you to split them into dedicated assets:

<code-snippet language='javascript' highlightedLines="0 4">
import { fetchMd } from '@youwol/mkdocs-ts'

const navigation: Navigation = {
    name: 'Root Node',
    html: fetchMd({ url: '/url/to/file.md' }),
}

const app = render(
    new Views.DefaultLayoutView({
        router: new Router({ navigation, basePath: '/my-domain/my-app' }),
        name: 'Demo App',
    })
)
</code-snippet>

This allows you to fetch Markdown content from external sources and include it within your documentation 
pages seamlessly.

More information regarding Markdown parsing (in particular regarding the definition of custom views) is proposed
[here](@nav/tutorials/markdown).


### Using external libraries for views

To include an HTML element from a library, the `html` attribute can be defined as:


<code-snippet language='javascript' highlightedLines="0 7">
import { CustomWidget } from 'some-lib'

const html = ({router, node}:{router: MyRouter, data:{param: string}): VirtualDOM => {
    return {
        tag: 'div',
        children: [
            // CustomWidget needs to be a standard HTMLElement
            new CustomWidget(/* some arguments */)
        ]
    }
}
const navigation: Navigation = {
    name: 'Root Node',
    html
}

const app = render(
    new Views.DefaultLayoutView({
        router: new Router({ navigation }),
        name: 'Demo App',
    })
)
</code-snippet>

It is also possible to lazy load external libraries when loading a particular page of the document. 
For instance, using the `@youwol/webpm-client` package manager:

<code-snippet language='javascript'>
import { install } from '@youwol/webpm-client'

const html = async ({router}:{router: MyRouter}): VirtualDOM => {
    const { someLib } = await install({
        modules:['some-lib#latest as someLib']
    })
    return {
        tag: 'div',
        children: [
            // CustomWidget needs to be a standard HTMLElement
            new someLib.CustomWidget(router.config.param1)
        ]
    }
}
</code-snippet>

### Cross navigation

Cross navigation is enabled using regular `HTMLAnchorElement`, its `href` attribute must be prefixed with `@nav` and
followed by the path of the page, optionally extended by the section id (separated from the page path by a dot).

## Navigation

### View Customization


<code-snippet language='javascript' highlightedLines="21-27">
import { Navigation, Router, Views } from '@youwol/mkdocs-ts'
import { render } from '@youwol/rx-vdom'

// Define the table of contents view
const tableOfContent = Views.tocView

// Define the navigation structure
const navigation: Navigation = {
    name: 'Root Node',
    tableOfContent,
    html: () => ({
        tag: 'div',
        innerText: 'HTML view of the root page',
    }),
    '/node-1': {
        name: 'First child',
        tableOfContent,
        html: () => ({
            tag: 'div',
            innerText: 'HTML view of the "First child" page',
        }),
        decoration: {
            icon: {
                tag: 'i',
                class: 'fas fa-pastafarianism'
            },
            wrapperClass: 'bg-primary',
        }
    },
}
</code-snippet>

The above code snippet insert an icon and a wrapper class on `node-1`.
More information of can be found [here](@nav/api/MainModule.Decoration).

### Dynamic 

To specify a node within the navigation for which children are not known in advance, you can use the **`...`** 
attribute. 
This attribute catches all navigation routes below the specified node. A callback function is provided to the **`...`**
attribute to dynamically define the node with its children. 
In this case, children are defined explicitly using the children attribute.

To illustrate this topic, let's examine a pseudo example to render a file explorer-like interface. 
This example relies on the functions `getItemInfo` and `getFolderContent`, which are not provided here and are assumed
to be calls to a backend.


<code-snippet language='javascript' highlightedLines="51-57">
import { Navigation, Router, Views } from '@youwol/mkdocs-ts'
import { render } from '@youwol/rx-vdom'
import { getItemInfo, getFolderContent} from './path/to/explorer/client.ts'


const tableOfContent = Views.tocView

async function resolveImplicitNavigation({path}) {
    const info = await getItemInfo(path)
    if(info.isFile){
        return {
            name: info.name,
            html: parseMd({src: `# file at ${path}`}),
            tableOfContent,
            children:[]
        }
    }
    const {files, folders} = await getFolderContent(path)
    return {
        name: info.name,
        html: parseMd({src: `# folder at ${path}`}),
        tableOfContent,
        children: [
            ...folders.map( folder => ({
                name: folder.name, 
                id: folder.id
            })),
            ...files.map( file => ({
                name: file.name, 
                id: folder.id,
                isLeaf: true
            }))
       ],
    }
}

// Define the navigation structure
const navigation: Navigation = {
    name: 'Root Node',
    tableOfContent,
    html: () => ({
        tag: 'div',
        innerText: 'HTML view of the root page',
    }),
    '/files-explorer': {
        name: 'Files explorer',
        tableOfContent,
        html: () => ({
            tag: 'div',
            innerText: 'This node gather a files explorer like interface',
        }),
        '...': ({ path, router }: { path: string; router: Router }) => {
            // below is the definition of 'dynamic' children.
            // The path provided is relative to the current node 
            // e.g. for a global path '/node-1/foo/bar/baz'
            // it becomes '/foo/bar/baz'.
            resolveImplicitNavigation({path})
        }
    },
}
</code-snippet>

In this example, the **`...`** attribute is used to define dynamic children for the node `/files-explorer`. 
The callback function resolveImplicitNavigation is called to dynamically resolve the children based on the provided path.

In case the navigation is expected to change while using the application, it is possible to provide an observable
instead of a function to the *catch-all* attribute (**`...`**). For instance, to refresh the files explorer every second:


<code-snippet language='javascript' highlightedLines="7-8">
import { timer, map } from 'rxjs'
// Code omitted

const navigation: Navigation = {
    // Code omitted
    '/files-explorer': {
        // Code omitted
        '...': timer(0,1000).pipe(
            map(() => ({ path, router }: { path: string; router: Router }) => {
                // below is the definition of 'dynamic' children.
                // The path provided is relative to the current node
                // e.g. for a global path '/node-1/foo/bar/baz'
                // it becomes '/foo/bar/baz'.
                resolveImplicitNavigation({path})
            })
        )
    },
}
</code-snippet>