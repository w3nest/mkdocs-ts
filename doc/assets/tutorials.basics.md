# Getting Started

This tutorial introduces you to {{mkdocs-ts}}, guiding you through its default layout and core concepts. 
By the end, you'll have a solid foundation and links to explore more advanced topics.

<note level=hint>
Many links to the API documentation are embedded throughout this tutorial. 
To enhance your experience, toggle a split view by clicking the split button <split-api></split-api>.
This feature allows you to read the tutorial alongside the API documentation and is also accessible from the
left navigation panel under the **API** node.
</note>

<note level="info" label="About Notebook" expandable="true">
This tutorial, like others in this series, adopts a notebook-style presentation.
Interactive cells let you modify and execute code (`Ctrl-Enter` is a shortcut for running cells). 
To learn how to include similar notebook pages in your own {{mkdocs-ts}} application, refer to the 
<cross-link target='notebook'>Notebook tutorial</cross-link>.

To minimize distractions, this tutorial keeps the notebook features simple.
The primary exception is the `display` function, details can be found
<cross-link target='notebook.display'>here</cross-link>.
</note>

---

## Simple Application

Let's install {{mkdocs-ts}} along with its required stylesheets:

<js-cell>
const version = "{{mkdocs-version}}"

const { MkDocs } = await webpm.install({
    modules:[ `mkdocs-ts#${version} as MkDocs`],
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

<note level='info' expandable="true" title="About `webpm`">
<ext-link target="webpm">WebPM</ext-link> is an installer used here to dynamically install **{{mkdocs-ts}}**.
For typical use cases, {{mkdocs-ts}} is usually included "statically" within the project's `node_modules`
folder, rather than being dynamically installed.

It plays however a central role in the Notebook module for dynamic dependencies installation.
This topic is presented within the <cross-link target='notebook'>Notebook tutorial</cross-link>
</note>

### Defining Navigation

Creating an application with {{mkdocs-ts}} centers around defining a  <api-link target="Navigation"></api-link> object.

Below is a simple example of navigation:

<js-cell>

// helper to construct mock view
const loremIpsumView = (title) => ({
    tag: 'div',
    children: [
        {
            tag: 'h4',
            innerText: title,
        },
        {
            tag: 'p',
            innerText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        }
    ]   
})
// Define the navigation structure
let navigation = {
    name: 'Home',
    layout: () => loremIpsumView('Home'),
    routes:{
        '/node-1': {
            name: 'First child',
            layout: () => loremIpsumView('First Page'),
        },
        '/node-2': Promise.resolve({
            name: 'Second child',
            layout:  () => loremIpsumView('Second Page (async navigation)')
        }),
        '/node-3': {
            name: 'Third child',
            layout: () => Promise.resolve(loremIpsumView('Third Page (async layout content)')),
            routes: {
                '/node-1': {
                    name: 'Nested child',
                    layout: () => loremIpsumView('Nested Page')
                }
            }
        },
    }
}
</js-cell>

The example above defines a static navigation tree (dynamic navigation tree exists, they are presented in a 
[dedicated page](@nav/tutorials/basics/dynamic-nav)). 
The structure is recursive, where child nodes are defined through the `routes` attribute. 
Each node includes:

*  **Segment ID**: The key in the mapping (e.g., `/node-1`).
*  **Name**: A non-unique identifier typically used for display purposes.
*  **Layout**: The content of the page, specified by a function or object (see **Defining Views** below).

The example also demonstrates how to handle asynchronous data at different levels (see **Async Nodes & Content** below).

<note level="warning" label="Important">
When defining segment ID (e.g., `/node-1`), do not use spaces or special characters not allowed in URLs.
</note>

<note level="info" expandable="true" label="Defining views">
In {{mkdocs-ts}}, views are typically built using the Virtual DOM from the 
{{rx-vdom}} library. 
The `loremIpsumView` function in the example returns a Virtual DOM.

Views can also integrate standard HTML elements or be rendered directly from Markdown files - as explained in a latter 
section of this page.
</note>

<note level="info" expandable="true" label="Async. node & content">
Asynchronous data can be provided in navigation using `Promise` or `Observable`.

*  **Async Node Example: /node-2** is a node defined asynchronously, requiring the navigation tree to wait for 
   resolution before updating.
*  **Async Layout Content Example**: The layout of `/node-3` is asynchronous but does not block the tree's construction.
   The promise resolves only when the page is displayed, offering better performance and responsiveness.

When possible, prefer resolving asynchronous tasks within the layout specification to avoid delays in
building the navigation tree.
</note>

### Defining Router

Using the navigation object, you can construct a <api-link target="Router"></api-link> instance:

<js-cell>
let router = new MkDocs.Router({
    navigation,
    // For real scenario the following parameter is not needed.
    // It is used here to not re-locate your browser when navigating in this example.
    browserClient: (p) => new MkDocs.MockBrowser(p)
})
display(
    "Current (mocked) browser's path:",
    {tag:'i', class:'mx-1'}, 
    router.path$
)
</js-cell>

The `Router` is the core object that encapsulates the application's navigation logic. 
It serves as the primary construct for interacting with navigation, making it essential for handling routing in 
your application.

<note level="hint">
The output of the above cell displays the `router.path$`, an observable that emits the current path whenever 
navigation occurs. This will dynamically update as you navigate through the application built in the following section.
</note>


### Defining Layout

{{mkdocs-ts}} provides a default layout, rendered using the <api-link target="DefaultLayout.Layout"></api-link> class,
which serves as a convenient starting point for your application:

<js-cell cell-id="example0">
let app = new MkDocs.DefaultLayout.Layout({ router })
display({
    tag: 'div',
    class:'border p-1',
    style:{height:'100%'},
    children:[app]
})
</js-cell>


<cell-output cell-id="example0" full-screen="true" style="height:500px;">
</cell-output>

Refer to the documentation for <api-link target="DefaultLayout.Layout.new"></api-link> to explore the various options 

<note level="hint">
As mentioned earlier, {{mkdocs-ts}} relies on the {{rx-vdom}} library for generating and rendering views.
This topic is introduced hereafter.
</note>

## Views injection

Views injection is a key mechanism in {{mkdocs-ts}}, essential for defining layout content or integrating views 
across various parts of your application.

There are three main options for providing views:

*  **From `HTMLElement`**: The native DOM element used by web browsers. Ultimately, every view resolves to an 
   `HTMLElement`.

*  **From `VirtualDOM`**: The internal standard adopted by {{mkdocs-ts}}, which acts as a lightweight wrapper around 
   `HTMLElement` to enable enhanced reactivity. This representation is powered by the {{rx-vdom}} library and has been 
   used earlier within the `loremIpsumView` function.

*  **From `Markdown`**: A versatile and user-friendly approach for defining views. 
   Markdown combines simplicity, flexibility, and refined rendering capabilities. 
   The Markdown engine provided here extends far beyond standard syntax, as evidenced by this very page, 
   which is generated from the following <ext-link target="tutorials.basics.md">source file</ext-link>.

These three options are introduced hereafter;
to simplify the upcoming examples, a helper function `displayApp` is defined in the expandable block below:

<note level='abstract' icon='fas fa-code' label='Code Helper: `displayApp`' expandable="true" mode="stateful">

<js-cell>
const displayApp = (navigation, display, topBanner) => {
    const app = new MkDocs.DefaultLayout.Layout({
        router: new MkDocs.Router({
            navigation, 
            browserClient: (p) => new MkDocs.MockBrowser(p) 
        }),
    })
    display({
        tag: 'div',
        class:'border p-1',
        style:{ height:'100%' },
        children:[app],
        onclick: () => {
            // Related to the 'View customization' example
            document.querySelectorAll('.ctx-menu').forEach((c) => c.remove())
        }
    })
}
</js-cell>
</note>

### Standard `HTMLElement`

Below is an example demonstrating how to lazily load the 
<ext-link target="tweak-pane">TweakPane</ext-link> library from WebPM's CDN and create 
a simple view:

<js-cell cell-id="example3">
navigation = {
    name: 'Home',
    layout: async () => {
        // doing so will load 'tweakpane' lazily, when accessing the page.
        const {TP} = await webpm.install({modules:['tweakpane#^4.0.1 as TP']})
        const pane = new TP.Pane()
        const PARAMS = {
            title: 'Hello',
            color: '#ff0055',
        };        
        pane.addBinding(PARAMS, 'title');
        pane.addBinding(PARAMS, 'color');   
        return pane.element // HTMLElement
    }
}

displayApp(navigation, display)
</js-cell>

<cell-output cell-id="example3" full-screen="true" style="height:500px;">
</cell-output>


### Virtual DOM

Internally, {{mkdocs-ts}} leverages the <ext-link target="virtual-dom">VirtualDOM</ext-link> construct to manage views. 
For advanced scenarios, we recommend exploring the <ext-link target="rx-vdom">Rx-vDOM</ext-link> library, 
as it integrates naturally with {{mkdocs-ts}} and provides robust support for reactivity, particularly in the Notebook 
submodule.

Here’s an example illustrating reactivity:

<js-cell cell-id="example-vdom">

navigation = {
    name: 'Home',
    layout: async () => {
        const {TP, rxjs} = await webpm.install({modules:['tweakpane#^4.0.1 as TP', 'rxjs#7.5.6 as rxjs']})

        const title$ = new rxjs.BehaviorSubject('Hello')
        const bgColor$ = new rxjs.BehaviorSubject('#ff0055')

        const pane = new TP.Pane()
        const PARAMS = {
            title: title$.value,
            color: bgColor$.value,
        };        
        pane.addBinding(PARAMS, 'title').on('change', (ev) => {
            title$.next(ev.value);
        });
        pane.addBinding(PARAMS, 'color').on('change', (ev) => {
            bgColor$.next(ev.value);
        });   
        return { 
            tag: 'div',
            class: 'p-2 rounded',
            style: { 
                source$: bgColor$, 
                vdomMap:(color) => ({backgroundColor:color}) 
            },
            children:[
                {   
                    tag: 'p', 
                    innerText:{ source$:title$, vdomMap: (d) => d }
                },
                pane.element,
            ]
        }
    }
}

displayApp(navigation, display)
</js-cell>

<cell-output cell-id="example-vdom" full-screen="true" style="height:500px;">
</cell-output>

<note level="hint">
The example above shows the ability to provide a regular `HTMLElement` (`pane.element`) as child of a `VirtualDOM`. 
It can be useful for scenario where a `VirtualDOM` is required while an `HTMLElement` is available, *e.g.* :

<code-snippet language="javascript">
function toVirtualDOM( elem: HTMLElement ): VirtualDOM<'div'> {
    return { tag: 'div', children:[elem] }
}
</code-snippet>
</note>

### Markdown

Markdown is a first-class citizen of {{mkdocs-ts}}. The library provides utilities to render pages using Markdown via:

*  <api-link target='parseMd'></api-link>: Converts Markdown source into a view.
*  <api-link target='fetchMd'></api-link>: Fetches and renders Markdown from a URL.

The {{mkdocs-ts}} Markdown parser extends standard Markdown capabilities. It supports: - LaTeX expressions - 
Custom views - Pre-processing, and more.
For details, refer to the [Markdown tutorial](@nav/tutorials/markdown).

Here is an example using `parseMd`:

<js-cell cell-id="example1">
const mdSrc = `
**Including Markdown**

<!-- internal links should be prefixed by '@nav' -->
Just a simple example with a [link to page](@nav/child-1).
`

navigation = {
    name: 'Home',
    layout: ({ router }) => MkDocs.parseMd({
        src: mdSrc,
        router
    }),
    routes:{
        '/child-1': { 
            name: 'Page 1',
            layout: () => loremIpsumView('Child Page')
        }
    }
}
displayApp(navigation, display)
</js-cell>

<cell-output cell-id="example1" full-screen="true" style="height:500px;">
</cell-output>

<note level="warning" label="Cross navigation">
Cross-navigation within Markdown content uses regular syntax except that the `href` value must be prefixed with `@nav`,
followed by the page path, and optionally extended with a section ID (separated by a dot). 
</note>

## Customization

### Nav. Header

You can customize the header of a navigation node in the navigation panel to include custom icons, styles, or actions.
The default layout defines the structure of the node's header data using 
<api-link target="DefaultLayout.NavHeader"></api-link>


The following example demonstrates how to add a custom icon (<i class='fas fa-tools'></i>) to a node and display a 
context menu when clicking on another icon (<i class='fas fa-ellipsis-h'></i>).
Decoration can define icons and/or actions for a navigation node. Let's start by creating a simple 'popup' panel 
to be displayed when <i class='fas fa-ellipsis-h'></i> is clicked.
In real scenario, this panel lists available actions for the related navigation node. 

The context menu position is computed using the **@floating-ui/dom** library, as defined in the next expandable block.

<note level='abstract' icon='fas fa-code' label='Code Helper: `showCtxMenu`' expandable="true" mode="stateful">

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
</note>

To incorporate the context menu view and define an icon for the node:

<js-cell cell-id="example5">

navigation = {
    name: 'Home',
    layout: () => MkDocs.parseMd({src:"**Nav. item Customization**"}),
    header: {
        icon: {
            tag: 'i',
            class: 'fas fa-home'
        }
    },
    routes:{    
        '/config': {
            name: 'Configuration',
            layout: ({router}) => MkDocs.parseMd({router, src:'# Configuration'}),
            header: {
                icon: {
                    tag: 'i',
                    class: 'fas fa-tools'
                },
                actions: [{
                    tag: 'i',
                    class: 'fas fa-ellipsis-h mkdocs-hover-text-warning',
                    onclick: (ev) => showCtxMenu(ev)
                }]
            },
        }
    }
}

displayApp(navigation, display)
</js-cell>

<cell-output cell-id="example5" full-screen="true" style="height:500px;">
</cell-output>

### Banners

### Bookmarks

### Table of Content

### Style & CSS


##  Going further

Dedicated pages:

*  Dynamic navigation

*  Multi Layout 