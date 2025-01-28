# Getting Started

This tutorial serves as an introduction to the core concepts and features of {{mkdocs-ts}}, 
a library designed for creating hierarchical, interactive, and dynamic documentation. 
While the example used—a whimsical guide to *The Hitchhiker’s Guide to the Galaxy* quotes—might lean on humor, 
the underlying purpose is to demonstrate practical techniques for building structured applications with {{mkdocs-ts}}.

Below is a preview of the final application in action:

<cell-output cell-id="app-start" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;"> </cell-output>

Through this example, you'll gain an understanding of how to use Markdown, the library's layout system,
and its navigation features to create modular and responsive applications. 
By the end, you'll have both a fun example application and the knowledge to start building your own tailored projects.

Let's get started!

<note level=hint>
Many links to the API documentation are embedded throughout this tutorial. 
To enhance your experience, you can toggle a split view by clicking <split-api></split-api>
to read the tutorial alongside the API documentation.
The button is also accessible from the left navigation panel under the <i class="fas fa-code">API</i> node.
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

## Grab Your Towel

Let's start with installing {{mkdocs-ts}} along with its required stylesheets:

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

<note level='info' expandable="true" title="About `webpm`">

<ext-link target="webpm">WebPM</ext-link> is an installer used in this context to dynamically install {{mkdocs-ts}}.
However, in a standard project setup, {{mkdocs-ts}} is typically installed as a dependency within the project's 
`node_modules` folder, making this step unnecessary.
</note>

---

## Don't Panic

### Step 1: Navigation

Creating an application with {{mkdocs-ts}} centers around defining a  <api-link target="Navigation"></api-link> object.


The navigation defined next use Markdown to create the page using the <api-link target="parseMd"></api-link> function.
Markdown is a core feature of {{mkdocs-ts}}, making it simple to use while offering powerful features.
For example, this very page comes from the following 
<github-link target="tutorials.basics.md">Markdown file</github-link>.

The next expandable section defines the text content for the two pages involved in the navigation.

<note level='abstract' label='Texts `homePage` & `noPanicPage`' expandable="true" mode="stateful">

<js-cell>

const homePage = `
# A Guide About The Guide

---

**A Whimsical Guide to Crafting Documents**

Welcome, dear hitchhiker, to a tutorial as whimsically nonsensical as the universe itself.
In this journey, you’ll not only explore pearls of wisdom plucked from the mind of Douglas Adams,
but also learn to craft a document worthy of any intergalactic traveler.
Together, we’ll stack layers of absurdity and structure like a Vogon stacks bureaucracy—only with far less pain.
So grab your towel, prepare to navigate nested nodes, and let’s build something delightfully improbable!


> "*For a moment, nothing happened. Then, after a second or so, nothing continued to happen.*"
> – Douglas Adams, *The Hitchhiker's Guide to the Galaxy*

`

const noPanicPage = `
# Don't Panic

---

**The First Rule of Intergalactic Travel**

In bold, friendly letters, this phrase reassures us that no matter how complex things may seem—whether you’re
facing intergalactic bureaucracy or crafting a hierarchical document—you’ve got this.
Building a structured document doesn’t require an improbability drive, just a little guidance.
So, grab your towel, take a deep breath, and let’s prove that even the most daunting tasks can be surprisingly simple.

> "*'I like the cover,' he said. 'Don't Panic. It's the first helpful or intelligible thing anybody's said to me 
> all day.'*" – Douglas Adams, *The Hitchhiker's Guide to the Galaxy*

`;

</js-cell>
</note>


And the navigation:

<js-cell>
const header = (faIcon) => ({
    icon: {tag:'i', class: `fas ${faIcon}`}
})


// Define the navigation structure
let navigation = {
    name: "A Guide",
    layout: () => MkDocs.parseMd({src:homePage}),
    header: header('fa-space-shuttle'),
    routes:{
        '/dont-panic': { 
            name: "Don't panic",
            layout: () => MkDocs.parseMd({src:noPanicPage}),
            header: header('fa-temperature-low')
        },
    }
}
</js-cell>

The example above defines a **static** navigation tree (**dynamic** navigation tree exists, they are presented in a 
<cross-link target="dynamic-nav">dedicated page</cross-link>). 
The structure is recursive, child nodes are defined through the `routes` attribute. 
Each node includes:

*  **Segment ID**: The key in the mapping (e.g., `/dont-panic`). It should start with '/', not use spaces or special 
   characters not allowed in URLs as a page URL of the document is defined by the sequence of segment IDs.
*  **Name**: A non-unique identifier typically used for display purposes.
*  **Layout**: The content of the page, specified by a function or object defining one or multiple views - depending
   on the specific layout. More on views definition in a bit.
*  **Header**: Provide handle on how the node is rendered in the navigation panel. It defines here an icon, expressed 
   as a Virtual DOM from <ext-link target='rx-vdom'>Rx-vDOM</ext-link> library. 
   This could also be standard `HTMLElement`, more on that in a bit.

Note that the attribute `layout` & `header` have a structure that is determined by the type of layout uses
for rendering. In the current case, showcasing the default layout, they are defined by 
<api-link target="DefaultLayout.NavLayout"></api-link> and 
<api-link target="DefaultLayout.NavHeader"></api-link> 
respectively.
In particular, it is possible to provide a `string` to the `layout` attribute: in this case it is interpreted as a 
URL pointing to markdown source that is fetched and parsed.

<note level="info" expandable="true" label="Asynchronous navigation">

{{mkdocs-ts}} often use the <api-link target="Resolvable">Resolvable</api-link> to define elements of the navigation.
This is for instance the case to define the <api-link target="StaticRoutes"></api-link> or for the specification of the 
<api-link target="DefaultLayout.NavLayout"></api-link> content.

This is for instance useful when a request to a service is needed to construct some navigation nodes.

Asynchronous data can be provided in navigation using `Promise` or `Observable` in two ways.

*  **Async Node**: A whole node cen be defined asynchronously, requiring the navigation tree to wait for 
   resolution before updating.
*  **Async Layout Content**: Instead of the whole node being a promise or an observable, the layout can as well be
   asynchronous. In such case, it does not block the navigation tree's construction: the promise resolves only when the
   page is displayed, offering better performance and responsiveness.

</note>

### Step 2: Router

With the navigation object ready, you can create a <api-link target="Router"></api-link> instance to manage the 
routing logic of your application:

<js-cell>
let router = new MkDocs.Router({
    navigation,
    // For real scenario the following parameter is not needed.
    // It is used here to not re-locate your browser when navigating in this example.
    browserClient: (p) => new MkDocs.MockBrowser(p)
})
</js-cell>

The `Router` serves as the backbone of your application’s navigation system. 
It encapsulates all routing logic, enabling seamless transitions between pages and ensuring consistent handling 
of navigation events.

For the purposes of this tutorial, a <api-link target="MockBrowser"></api-link> client is used to simulate navigation 
without triggering browser reloads. This makes it easier to experiment with routing concepts without affecting the
actual browser state. In production scenarios, omit the browserClient parameter to use the default browser-based routing.

### Step 3: Layout

{{mkdocs-ts}} includes a default layout powered by the <api-link target="DefaultLayout.Layout"></api-link> class.
This layout provides a structured foundation out of the box.

To enhance the user experience, we'll also use here a **top-banner** that mock a browser's navigation bar. 
Its implementation has been deported within <cross-link target="basics-utils">Code Utilities</cross-link> page:

<js-cell>
const { navBarView } = await load("/tutorials/basics/code-utils")
</js-cell>

With the `navBarView` loaded, here’s the complete application:

<js-cell cell-id="example0">
display({
    tag: 'div',
    class:'border p-1 d-flex flex-column w-100 h-100',
    children:[
        navBarView(router),
        { 
            tag: 'div', 
            class: 'flex-grow-1',
            style: { minHeight: '0px' },
            children:[
                new MkDocs.DefaultLayout.Layout({ router })
            ] 
        }
    ]
})
</js-cell>

<cell-output cell-id="example0" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;">
</cell-output>


<note level="hint">
The above view is reactive and adapts to available space. 
For small viewports - just like above when embedded -, it displays in a compact format. 
If you're using a large enough screen, click the <button class="btn btn-sm btn-light fas fa-expand"></button> button at 
the top right of the output to see its expanded format.
</note>

<note level="warning" label="Important">
The `display` function used above is able to consume `Virtual DOM` components from 
<ext-link target="rx-vdom">rx-vdom library</ext-link> (more on that in a bit). 
In your application you'll likely need to explicitly transforms the `Virtual DOM` into plain `HTMLElement`.
To do so, use the `render` function, *e.g.*:

<code-snippet language='javascript'>
import { AnyVirtualDOM, render } from 'rx-vdom'

const vDOM : AnyVirtualDOM = { tag: 'div',  /*...*/ }

document.body.append(render(vDOM))
</code-snippet>
</note>

Through its <api-link target="DefaultLayout.Layout.new">constructor</api-link>, the default layout offers multiple
parameters to control sizing options, they are gathered in 
<api-link target="DefaultLayoutParams.displayOptions"></api-link>.

<note level="hint" label="CSS" expandable="true">
Most components in the view come with unique class names in the form of `mkdocs-*`.
These can be used to define custom styles, giving you more control over the visual appearance of your application.

The CSS selectors can be found from the API documentation, looking for the static attribute `CssSelector`, *e.g.*:
*  <api-link target="DefaultLayout.Layout.CssSelector"></api-link>
*  <api-link target="DefaultLayout.NavHeaderView.CssSelector"></api-link>
*  <api-link target="DefaultLayout.NavigationView.CssSelector"></api-link>
*  <api-link target="DefaultLayout.FavoritesView.CssSelector"></api-link>

</note>

You can also create your own layouts or use multiple layouts within your application, 
this is presented in the <cross-link target="custom-layout">Custom Layouts</cross-link> page.

**Code Factorization**

Before proceeding to the concept of views injection, the above organization of the application's view has been
factorized within the <cross-link target="basics-utils">Code Utilities</cross-link> page in an `withNavBar` function:

<js-cell>
const { withNavBar } = await load("/tutorials/basics/code-utils")
</js-cell>

It will be used to display the application view in the next steps as well as in the others tutorials.

---

## Ultimate Answer

In {{mkdocs-ts}}, views injection is a core mechanism that enables seamless integration of dynamic content 
across your application. 

Injected views are defined using two primary types, as defined in <api-link target="AnyView"></api-link>:

*  **`HTMLElement`**: The native building block of web browsers. Every view eventually resolves into an `HTMLElement`.
   This type allows integration with your favorite libraries to create complex, polished interfaces.

*  **`VirtualDOM`**: The default approach in {{mkdocs-ts}}, powered by the lightweight and reactive 
   <ext-link target="rx-vdom">Rx-vDOM</ext-link> library. It wraps `HTMLElement` with additional capabilities for
   reactive updates and streamlined development.

<note level="hint" label="Cross-Compatibility" expandable="true">
Switching between these two types is straightforward.
To convert a VirtualDOM to an HTMLElement:

<code-snippet language='javascript'>
import { AnyVirtualDOM, render } from 'rx-vdom'

const vDOM : AnyVirtualDOM = { tag: 'div', /* ... */ }
const element : HTMLElement = render(vDOM)
</code-snippet>

To use an HTMLElement within a VirtualDOM:

<code-snippet language='javascript'>
import { AnyVirtualDOM } from 'rx-vdom'

const element : HTMLElement = document.createElement('div') 
const vDOM : AnyVirtualDOM = { tag: 'div', children: [element] } 
</code-snippet>
</note>

The <api-link target="parseMd">Markdown parser</api-link> function enables combining  `HTMLElement` and `VirtualDOM`
within Markdown content to build powerful, reactive views. 

Let’s illustrate this with a new navigation node **/answer**, showcasing a dynamic computation panel embedded in 
Markdown text.

### Step 1: Page Content

The page content references placeholders for custom views, such as `controls` and `solution`, 
to be replaced dynamically at runtime:

<js-cell >

const pageAnswer = `
# The Answer

---

**The Ultimate Answer to Life, the Universe, and Everything**

To compute the answer provide the following parameters & hit **compute**:

<controls></controls>

<solution title="**The answer**: ">

> "*The Ultimate Answer to Life, The Universe and Everything is...42!*"
> – Douglas Adams, *The Hitchhiker's Guide to the Galaxy*

<note level='question'>
What does the answer really mean? Is it a cosmic joke or a profound truth?
Either way, this iconic number continues to spark debates, inspire T-shirts, and bewilder philosophers.
Spoiler alert: The real challenge is figuring out the Ultimate Question.
</note>
</solution>

`
</js-cell>

The DOM element **`note`** is a custom view registered by {{mkdocs-ts}} itself, available any time Markdown are parsed.
Other views are also available, they are defined in <api-link target="MdWidgets"></api-link>.

### Step 2: Custom Views

**Controls**

The controls view creates an interactive control panel using the <ext-link target='tweakpane'>Tweakpane</ext-link> 
library:

<js-cell >
const controls = async (computeCb) => {
    /*
    *  - `computeCb`: called when clicking `compute` with the parameters.
    *
    *  -  Returns an `HTMLElement`.
    */
    const {TP} = await webpm.install({
        esm:['tweakpane#^4.0.1 as TP']
    })
    const pane = new TP.Pane()

    const params = {
        improbabilityFactor: 3,
        babelFishCount: 1,
        vogonPoetryExposure: 250,
        towelAbsorbency: 2,
    };   
    Object.keys(params).forEach((k) => pane.addBinding(params, k))
    pane.addButton({ title: 'Compute', label: ''}).on('click', () => computeCb(params));
    return pane.element
}
</js-cell>

**Solution**

The `solution` view reacts to computation results, dynamically updating the display:

<js-cell>
const solution = (elem, result$) => {
    /*
    *  -  `elem` is the `HTMLElement` as referenced in the markdown source. It is used to retrieve the `textContent`.
    *  -  `result` is a stream that emits `undefined` when computation starts, and the result at the end.
    *
    *  -  Returns a `VirtualDOM`.
    */
    return { 
        tag:'div',
        children:[{
            source$: result$, 
            vdomMap: (r) => r !== undefined
                ? MkDocs.parseMd({src:`${elem.getAttribute('title')} ${r} \n\n---\n\n ${elem.textContent}`})
                : { tag: 'i', class: 'fas fa-spinner fa-spin'}
        }]
    }
}

</js-cell>

### Step 3: Connect 

Finally, define the `/answer` navigation node and link the views:

<js-cell cell-id="the-answer">
navigation = {
    ...navigation,
    routes: {
        ...navigation.routes,
        '/answer': {
            name: 'The Answer',
            header: header('fa-cogs'),
            layout: async () => {
                const {rxjs} = await webpm.install({
                    esm:['rxjs#7.8.1 as rxjs']
                })
                const result$ = new rxjs.Subject()
                const ctrlPane = await controls((params) => {
                    // A long-running and complex computation ;)
                    result$.next(undefined)
                    setTimeout(() => result$.next(42), 3000)
                })
                return MkDocs.parseMd({
                    src: pageAnswer,
                    views: {
                        controls: () => ctrlPane,
                        solution: (elem) => solution(elem, result$)
                    }
                })
            }
        }
    }
}

display(
    await withNavBar(navigation)
)
</js-cell>

<cell-output cell-id="the-answer" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;">
</cell-output>

--- 

##  Unprobability Drive

This section is all about expanding perspectives. 
The goal is to create a new page with a `wizard` **mode** accessible via the navigation panel and demonstrate 
how all the components fit together.

### Step 1: Page Content

We begin by crafting the content of the Markdown page:

<js-cell >

const pageBeyond = `
# Unprobability Drive

---

**One Improbable Step**

As we embark on this journey, expect the unexpected—and maybe even a bit of fun! Let’s turn the improbable into the 
delightful as we organize chaos into structure. 
Ready? Trigger the <i class='fas fa-hat-wizard'></i> mode from the side
navigation panel.

>  *"There is a theory which states that if ever anyone discovers exactly what the Universe is for and why it is here, it 
> will instantly disappear and be replaced by something even more bizarre and inexplicable."*
> – Douglas Adams, *The Hitchhiker's Guide to the Galaxy*
`
</js-cell>

### Step 2: Custom Views

**Wizard Button**

To give users control over the view mode, we define a toggle button using a `VirtualDOM` specification.
This button switches between **`normal`** and **`wizard`** modes:

<js-cell>

const mode$ = new rxjs.BehaviorSubject('normal')

const checkBox = { 
    tag:'button', 
    class: { 
        source$: mode$,
        vdomMap: (mode) => mode === 'normal' ? 'btn-dark' : 'btn-light',
        wrapper: (d) => `btn btn-sm fas fa-hat-wizard ${d} `
    },
    onclick: () => mode$.next(mode$.value === 'normal' ? 'wizard' : 'normal')
}
</js-cell>

Let's define the associated **normal** and **wizard** views.

**Normal View**

The normal view simply parses the Markdown content into a VirtualDOM structure:

<js-cell>
const normalView = () => MkDocs.parseMd({src:pageBeyond})
</js-cell>

**Wizard View**

The wizard view transforms the content into a dynamic 3D visualization using the 
<ext-link target="three">Three.js</ext-link> CSS3DRenderer.


<js-cell>
const wizardView = ({THREE, htmlElement}) => ({
    tag: 'div',
    class: 'w-100',
    style: {aspectRatio: '1/1'},
    onclick: () => mode$.next('normal'),
    connectedCallback: (container) => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
        const { CSS3DRenderer, CSS3DObject } = CSS3DModule(THREE)
        const renderer = new CSS3DRenderer();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        container.appendChild(renderer.domElement);
        const cssObject = new CSS3DObject(htmlElement)
        scene.add(cssObject);
        camera.position.z = 500;
        function animate() {
            requestAnimationFrame(animate);
            cssObject.rotation.x += 0.01;
            cssObject.rotation.y += 0.01;
            renderer.render(scene, camera);
        }
        animate();
    }
})
</js-cell>

### Step 3: Connect

Add the **Unprobability Drive** to the app's navigation system, allowing users to toggle between the `normal` 
and `wizard` views:


<js-cell cell-id="beyond">
navigation = {
    ...navigation,
    routes: {
        ...navigation.routes,
        '/unprobability': {
            name: 'Unprobability',
            header: {
                ...header('fa-jedi'),
                actions: [checkBox] 
            },
            layout: async () => {
                const { rxVDom, THREE } = await webpm.install({
                    esm:[
                        'rx-vdom#^0.1.0 as rxVDom',
                        'three#^0.152.0 as THREE',
                    ]
                })
                return {
                    source$: mode$,
                    vdomMap: (mode) => { 
                        const regular = normalView()
                        return mode === 'wizard' 
                        ? wizardView({THREE, htmlElement: rxVDom.render(regular)})
                        : regular
                    }
                }
            }
        }
    }
}
display(
    await withNavBar(navigation)
)
</js-cell>

<cell-output cell-id="beyond" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;">
</cell-output>

---

## Farewell

Let's add a goodbye page:

<js-cell >
const pageFarewell = `
# Farewell

---

**Closing the Guide, But Not the Adventure**

As you venture forth into new document-building adventures, remember the wisdom of the Guide: stay curious,
stay creative, and most importantly, Don’t Panic.


> "*So long, and thanks for all the fish.*"
> – Douglas Adams, *The Hitchhiker's Guide to the Galaxy*

`
</js-cell>


### Banners

The <api-link target="DefaultLayout.Layout"></api-link> constructor accepts providing a custom
<api-link target="DefaultLayoutParams.sideNavHeader">sideNavHeader</api-link> and/or
<api-link target="DefaultLayoutParams.sideNavFooter">sideNavFooter</api-link>.

Let's define them as such:

<js-cell cell-id="example-banners">
const sideNavHeader = () => ({
    tag: 'i',
    class:'w-75 text-center my-2 border-bottom mx-auto',
    innerText: "Don't Panic"
})
const sideNavFooter = () => ({
    tag: 'i', 
    class:'w-100 text-center border-top', 
    innerText: 'Bring Your Towel'
})
</js-cell>


### Bookmarks

Bookmarks can be included in the favorite bar at the very left of the default layout.
They are provided through <api-link target="DefaultLayoutParams.bookmarks$">bookmarks$</api-link> of
the <api-link target="DefaultLayout.Layout.new">default layout constructor</api-link> as
<ext-link target="BehaviorSubject">BehaviorSubject</ext-link>.

When `bookmarks` is provided, the navigation' nodes header feature a
<button class="btn btn-sm btn-light fas fa-bookmark"></button> button allowing the reader to dynamically add/remove
bookmarks.

<js-cell>
const bookmarks$ = new rxjs.BehaviorSubject(['/', '/dont-panic', '/answer', '/unprobability', '/farewell'])
</js-cell>

**Finally**

<js-cell cell-id="final">

navigation = {
    ...navigation,
    routes: {
        ...navigation.routes,
        '/farewell': {
            name: 'Farewell',
            header: header('fa-fish'),
            layout: () => MkDocs.parseMd({src:pageFarewell})
        }
    }
}
const finalView = await withNavBar(navigation, ({router}) => {
    return new MkDocs.DefaultLayout.Layout({
        router,
        sideNavHeader,
        sideNavFooter,
        bookmarks$
    })
})
display(finalView)
</js-cell>

<cell-output cell-id="final" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;">
</cell-output>

<note level="info" title="Top View" expandable="true" mode="stateful">
This cell is associated with a deported view port: the one displayed at the top of this page:

<js-cell cell-id="app-start">
display(finalView)
</js-cell>
</note>

---

##  Going Further

This concludes our introduction to the basics of navigation, router mechanics, and default layout concepts. 
Hopefully, you’ve enjoyed this slightly weird adventure inspired by Douglas Adams. 
Rest assured, the upcoming tutorials will bring us back to the comforting realm of normality.

For your next steps, we recommend diving into the next tutorial on Markdown parsing, which you can find 
<cross-link target="markdown">here</cross-link>.

For those looking to explore further, here are three additional sub-pages to deepen your knowledge:

*  **<cross-link target="dynamic-nav">Dynamic Navigation</cross-link>**: The examples so far have used a navigation
   structure defined at compile time. This page explores how to handle scenarios where navigation must adapt dynamically.

*  **<cross-link target="custom-layout">Custom Layout</cross-link>**: Learn how to define and work with custom layouts,
   enabling you to tailor the look and feel of your application.

*  **<cross-link target="typescript">Typescript</cross-link>**: If you’re working in TypeScript, this section offers 
   practical advice and tips for achieving type safety and smoother development.
