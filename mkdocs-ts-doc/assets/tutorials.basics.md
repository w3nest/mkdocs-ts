# Getting Started

## A Simple Application

To start building your application, you need to install the following resources:

<js-cell>
const { MkDocs } = await webpm.install({
    modules:[ '@youwol/mkdocs-ts#{{mkdocs-version}} as MkDocs' ],
    css: [
        'bootstrap#4.4.1~bootstrap.min.css',
        'fontawesome#5.12.1~css/all.min.css',
        '@youwol/fv-widgets#latest~dist/assets/styles/style.youwol.css',
        '@youwol/mkdocs-ts#{{mkdocs-version}}~assets/mkdocs-light.css',
    ]
})
display(MkDocs)
</js-cell>

Creating an application with @youwol/mkdocs-ts involves defining a  [Navigation](@nav/api/MainModule.Navigation) object. 
This object represents a tree structure where nodes (called navigation nodes) are associated with:
*  A target URL
*  A main content view
*  An optional table of content


Here's a simple example:

<js-cell cell-id="example0">
// Define the table of contents view
const tableOfContent = MkDocs.Views.tocView

// Define the navigation structure
let navigation = {
    name: 'Root Node',
    tableOfContent,
    html: () => ({
        tag: 'h1',
        innerText: 'Root page',
    }),
    '/node-1': {
        name: 'First child',
        tableOfContent,
        html: () => ({
            tag: 'h1',
            innerText: 'First page',
        }),
    },
    '/node-2': {
        name: 'Second child',
        tableOfContent,
        html: () => ({
            tag: 'h1',
            innerText: 'Second page',
        }),
    },
}

// For real scenario the following parameters is not needed.
// Here it is used to not re-locate the browser when navigating in this example.
const mockBrowserLocation = {
    initialPath:'https://foo.com/?nav=/',
    history:[]
}
let router = new MkDocs.Router({ 
    navigation,
    mockBrowserLocation
})

let app = new MkDocs.Views.DefaultLayoutView({
    router,
    name: 'Example',
})

display({
    tag: 'div',
    class:'border p-1',
    style:{height:'100%'},
    children:[app]
})
</js-cell>

<cell-output cell-id="example0" full-screen="true" style="height:500px;">
</cell-output>

Key points:
*  The `html` property of a navigation node is provided as VirtualDOM (from the `@youwol/rx-vdom` library). 
   Typically, the `html` definition comes from Markdown source, as explained in the next section.
*  To define a child node, use a property name starting with `/`. This name defines the corresponding part of the URL.
*  the `name` property of a navigation node specifies to the displayed name.
*  the `router` object is the navigation resolver. Its is provided at all places where re-routing can occur.
    See [Router](@nav/api/MainModule.Router) for more information.

<note level="warning" label="Important">
When defining child nodes (e.g., `/node-1`), avoid using spaces or special characters not allowed in URLs 
unless encoded.
</note>

<note level='hint' label='Code factorization'>
To slightly simplify up-coming cells, the next function is defined to display an application:
<js-cell>
const displayApp = (navigation, display) => {
    const app = new MkDocs.Views.DefaultLayoutView({
        router: new MkDocs.Router({
            navigation,
            mockBrowserLocation
        }),
        name: 'Example',
    })
    display({
        tag: 'div',
        class:'border p-1',
        style:{height:'100%'},
        children:[app],
        onclick: () => {
            // Related to the 'View customization' example
            document.querySelectorAll('.ctx-menu').forEach((c) => c.remove())
        }
    })
}
</js-cell>
</note>

## Main HTML Content

The definition of the main HTML content in **@youwol/mkdocs-ts** is flexible.
It can handle views returned by promises or observables, and the virtual DOM structure can directly include any
HTMLElement, allowing you to render elements created by other libraries.

### Using Markdown for Views

Markdown is a first-class citizen of **@youwol/mkdocs-ts**, and the library provides utilities for rendering pages 
using Markdown. Here's an introduction:

<js-cell cell-id="example1">
const mdSrc = `
# Including Markdown

Just a simple example.
`

navigation = {
    name: 'Root Node',
    tableOfContent,
    html: ({ router }) => MkDocs.parseMd({
        src: mdSrc,
        router
    }),
}
displayApp(navigation, display)
</js-cell>

<cell-output cell-id="example1" full-screen="true" style="height:500px;">
</cell-output>

Markdown sources are typically defined in dedicated files that can be accessed from a known URL. 
The following example fetches the root markdown source of this application:

<js-cell cell-id="example2">

const docBasePath = '{{assetsBasePath}}'

navigation = {
    name: 'Root Node',
    tableOfContent,
    html: MkDocs.fetchMd({ url: `${docBasePath}/index.md` }),
}
displayApp(navigation, display)

</js-cell>
<cell-output cell-id="example2" full-screen="true" style="height:500px;">
</cell-output>

<note level="hint">
The Markdown parser provided by **@youwol/mkdocs-ts** offers additional features compared to standard parsers. 
It allows parsing LaTeX expressions, creating custom views, performing pre-processing, and more. 
For details, refer to the dedicated [page](@nav/tutorials/markdown).
</note>



### Using external libraries

Since VirtualDOM can accommodate regular HTMLElements as children, you can include views generated by external 
libraries. 

The following example lazily loads the TweakPane library from WebPM's CDN and creates a simple view:


<js-cell cell-id="example3">

navigation = {
    name: 'Root Node',
    html: async (router) => {
        // doing so will load 'tweakpane' lazily, when accessing the page.
        const {TP} = await webpm.install({modules:['tweakpane#^4.0.1 as TP']})
        const pane = new TP.Pane()
        const PARAMS = {
            factor: 123,
            title: 'hello',
            color: '#ff0055',
        };        
        pane.addBinding(PARAMS, 'factor');
        pane.addBinding(PARAMS, 'title');
        pane.addBinding(PARAMS, 'color');        
        return { tag: 'div', children:[pane.element] }
    }
}

displayApp(navigation, display)
</js-cell>

<cell-output cell-id="example3" full-screen="true" style="height:500px;">
</cell-output>


### Cross navigation

Cross navigation is enabled using regular HTMLAnchorElement. The href attribute must be prefixed with @nav followed 
by the page path, optionally extended by the section ID (separated from the page path by a dot).

<js-cell cell-id="example4">

const rootSrc = `
# Cross ref

Here is a [cross reference](@nav/node-1).
`
navigation = {
    name: 'Root Node',
    tableOfContent,
    html: ({router}) => {
        return MkDocs.parseMd({router, src: rootSrc})
    },
    '/node-1': {
        name: 'Node 1',
        tableOfContent,
        html: ({router}) => MkDocs.parseMd({router, src:'# Referenced page'})
    }
}

displayApp(navigation, display)
</js-cell>

<cell-output cell-id="example4" full-screen="true" style="height:500px;">
</cell-output>


## Navigation

### View Customization

You can customize the navigation view to include custom icons, styles, or actions by providing a decoration attribute 
to the navigation node definition. For more details, refer to the [Decoration API](@nav/api/MainModule.Decoration).

The following example demonstrates how to add a custom icon (<i class='fas fa-tools'></i>) to a node and display a 
context menu when clicking on another icon (<i class='fas fa-ellipsis-h'></i>).
Decoration can define icons and/or actions for a navigation node. Let's start by creating a simple 'popup' panel 
to be displayed when <i class='fas fa-ellipsis-h'></i> is clicked.
In real scenario, this panel lists available actions for the related navigation node. 
The context menu position is computed using the **@floating-ui/dom** library.


<js-cell>
const { FloatingUI, RxDom } = await webpm.install({
    modules:[
        "@floating-ui/dom#^1.6.3 as FloatingUI",
        "@youwol/rx-vdom#^1.0.1 as RxDom"
    ]
})
const showCtxMenu = (ev) => {
    // rough implementation of context menu using @floating-ui/dom
    ev.stopPropagation()
    ev.preventDefault()
    const refElement = ev.target
    const popup = RxDom.render({
        tag: 'div',
        class:'ctx-menu rounded p-2 bg-secondary text-light',
        style: {    
            position: 'absolute',
            zIndex:100
        },
        innerText: 'Context Menu',
    })
    document.querySelectorAll('.ctx-menu').forEach((c) => c.remove())
    document.body.appendChild(popup)
    const cleanup = FloatingUI.autoUpdate(refElement, popup, () => {
        FloatingUI.computePosition(refElement, popup, {
            placement: 'bottom',
            middleware: [FloatingUI.flip()],
        }).then(({ x, y }) => {
            Object.assign(popup.style, {
                left: `${x}px`,
                top: `${y}px`,
            })
        })
    })
}
</js-cell>

To incorporate the context menu view and define an icon for the node:

<js-cell cell-id="example5">

navigation = {
    name: 'Root Node',
    tableOfContent,
    html: ({router}) => {
        return MkDocs.parseMd({router, src:"# Nav. item Customization"})
    },
    '/config': {
        name: 'Configuration',
        tableOfContent,
        html: ({router}) => MkDocs.parseMd({router, src:'# Configuration'}),
        decoration: {
            icon: {
                tag: 'i',
                class: 'fas fa-tools px-1'
            },
            actions: [{
                tag: 'i',
                class: 'fas fa-ellipsis-h px-1 mkdocs-hover-text-warning',
                onclick: (ev) => showCtxMenu(ev)
            }]
        },
    }
}

displayApp(navigation, display)
</js-cell>

<cell-output cell-id="example5" full-screen="true" style="height:500px;">
</cell-output>


### Dynamic 

Up until now, the navigation structure in our examples has been static, with all pages and their hierarchy known in 
advance. However, this isn't always the case, and **@youwol/mkdocs-ts** provides a formalism to handle dynamic 
scenarios.

In this example, we'll create a document with a **File System** node that represents a structure typically queried using
HTTP requests (for which responses are not known in advance). For simplicity, we'll mock the file structure and content.

Here is the mocked file system structure:
<js-cell>
const mockFS = {
    '': {
        files:[{id:'foo', name:'foo.txt'}],
        folders:[{id:'baz', name:'baz'}]
    },
    'baz': {
        files:[{id:'bar', name:'bar.txt'}],
        folders:[]
    }
}
const filesContent = {
    'foo': '# Foo \n This is the content of the **foo** file.',
    'baz/bar': '# Bar \n This is the content of the **bar** file.'
}
</js-cell>

Next, we'll define a helper function to generate the main HTML content when a folder is selected. 
This function lists the files in the folder and uses anchor elements to link to the files:

<js-cell>
const filesView = (elem) => {
    const path = elem.getAttribute('parent-folder')
    const { files } = mockFS[path]
    return {
        tag: 'div',
        children: files.map((file) => ({
            tag:'a',
            href: `@nav/fs/${path}/${file.id}`,
            class: 'd-flex align-items-center',
            children:[
                {   tag: 'i',
                    class: 'fas fa-file'
                },
                { tag:'i', class:'mx-2'},
                {   tag: 'div',
                    innerText: file.name
                }
            ]
        }))
    }
}
</js-cell>

The key element for defining dynamic navigation is a function that takes the **path** of the selected node 
(and the application's router object if needed) and returns a [CatchAllNav](@nav/api/MainModule.CatchAllNav)
navigation node:


<js-cell>
const resolveDynamicNavigation = async ({path}) => {
    // A file is selected
    if(filesContent[path]){
        return {
            name: path,
            html: ({router}) => MkDocs.parseMd({src:filesContent[path], router}),
            tableOfContent,
        }
    }
    // Otherwise, it is a folder
    const {files, folders} = mockFS[path]
    return {
        name: path,
        html: ({router}) => MkDocs.parseMd({
            src: `
# folder at ${path}

Below are the files of the folder:

<filesView parent-folder='${path}'></filesView>
`,
            views: {
                filesView: filesView
            }
        }),
        tableOfContent,
        children: [
            ...folders.map( folder => ({
                name: folder.name, 
                id: folder.id,
                decoration: {
                    icon:{class:'fas fa-folder px-1'}
                }
            })),
            ...files.map( file => ({
                name: file.name, 
                id: file.id,
                leaf: true,
                decoration: {
                    icon:{class:'fas fa-file px-1'}
                }
            }))
       ],
    }
}
</js-cell>

<note level="info">

The `filesView` helper is directly referenced within the markdown content of the folder's `html` definition.
It uses the 'custom view' feature of Markdown parsing, which are explained in detail on the Markdown 
dedicated [page](@nav/tutorials/markdown).
</note>

Finally, to integrate the implicit navigation resolver, the function above is referenced within its parent node using 
the **`...`** catch-all key:

<js-cell cell-id="example6">
navigation = {
    name: 'Root Node',
    tableOfContent,
    html: ({router}) => {
        return MkDocs.parseMd({router, src:`
# Embedding a files system

<note level='info'>Navigate to the [File System](@nav/fs) node to display the 'dynamic' children. </note>
`})},
    '/fs': {
        name: 'Files system',
        tableOfContent,
        html: ({router}) => {
            return MkDocs.parseMd({router, src:`
# File System

This is an example of dynamic navigation: navigation nodes
are not known in advance.
`})},
        '...': resolveDynamicNavigation
    }
}

displayApp(navigation, display)

</js-cell>

<cell-output cell-id="example6" full-screen="true" style="height:500px;">
</cell-output>

<note level="warning" label="Important">
The path provided to the 'catch-all' callback is relative to the parent node in which it is defined. 
For example, for the global path `/fs/foo/bar/baz`, it becomes `foo/bar/baz` (since `fs` is the parent node of the
reactive navigation).
</note>

<note level="hint">
The callback definition for the **`...`** catch-all accommodates returning `Promise` or `Observable`.
The latter allows the navigation structure to change at runtime (e.g., when the user performs an action).
</note>

