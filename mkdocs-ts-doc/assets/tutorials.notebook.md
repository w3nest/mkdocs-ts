# Notebook

A notebook page within **mkdocs-ts** is an interactive page that allows users to combine code, visualizations, 
explanatory text, and other media elements in a single interface.
It provides a convenient way to demonstrate code, view the results, and document analysis or findings in a structured 
and easily shareable format. You can find examples of notebooks
<a href="/applications/@youwol/gallery/latest" target="_blank">here</a>.

<note level="info">
Although the format offers convenience and attractiveness, boasting a wide range of capabilities, the code generated
within the notebook is not optimized, not standardized (they are not ESM module). The coding environment is also
far from what is usually proposed in common IDE.
Its strength lies in presenting the usage of multiple interactive components, which are themselves constructed 
from standard technology stacks.
</note>


## Create a project

Notebook are pages within `@youwol/mkdocs-ts` navigation structure, it wraps Markdown source code or Markdown file 
referenced by a URL. 
The following cell presents an example of it, creating a simple document including one notebook page
(from the Markdown source `src`):

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
display('Hello World')
</js-cell>
`
const NotebookModule = await MkDocs.installNotebookModule()

const nav = {
    name: 'Notebook',
    tableOfContent: MkDocs.Views.tocView,
    html: ({router}) => new NotebookModule.NotebookPage({
        src,
        router,
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

Global options for a notebook page are available, see [here](@nav/api/Notebook.NotebookPage).

In the above example, a single Javascript cell is included using the DOM element `js-cell`, others are available
(*e.g.* `py-cell`, `md-cell`), they will be introduced in what follows.

Because the notebook feature is supported by **mkdocs-ts**, it is possible to create projects with multiple pages,
and also import symbols from one page to another (more on that in a bit).

Usually projects are divided in:
*  One or more typescript files that defines the navigation, router and application object 
(respectively the `nav`, `router` and `app` variables referenced in the above cell).
The `html` attribute of navigation nodes referencing URL of markdown files.
*  A folder that include the markdown files, in which the notebook contents are written.

The project is usually served by a dev-server that automatically reload the application when either the typescript 
or Markdown sources changed.


## Essential concepts

This section covers the fundamental concepts of the notebook, with additional child pages available for
delving deeper into specific topics.

Notebook pages primarily consist of a series of coding cells. Each cell can access variables defined in the 
preceding ones. 
When modifying and running a particular cell, the subsequent cells become invalidated and must be re-executed.

In the upcoming sections, the focus will primarily be on JavaScript cells to explore the foundations.
However, if you're interested in Python cells, you can visit this [page](@nav//tutorials/notebook/python).

### Scope

Within a particular notebook page, all the top levels symbols exposed by the javascript cells are accessible to the 
following cells.

<js-cell>
const x = 1 // 'x' is accessible in following cells
let y = 2  // so is 'y'
{
   const z = 3 // but 'z' is not
}
</js-cell>

It is possible to bring into the scope ESM or python libraries, backends as well as symbols from another notebook page, 
refer to the [imports page](@nav/notebook/imports) for explanation on that topic.


### Output

Each cell includes a `display` function within its scope to render outputs.

This function can handle various types of data:
* **`string` | `boolean` | `number`**: These are rendered directly.
* **`HTMLElement`**: They are appended as they are.
* **`VirtualDOM`**: This represents the native reactive extension of DOM elements within a notebook page 
(more on that in the next section).
* **`Observable`**: These are <a href="https://rxjs.dev/" target="_blank">RxJS</a> observables,
which emit values over time. 
The output subscribes to it and displays the outgoing data using the rules explained here 
(more on that in the reactive section too).
* **`Unknown Data`**: This serves as a fallback if none of the previous rules apply.

The following cell illustrates the different options:

<js-cell>
// Elementary types
display("An elementary type (string)")

// HTMLElement
const htmlElement = document.createElement('div')
htmlElement.innerText = "An HTMLElement"
htmlElement.classList.add("p-2", "rounded", "border", "bg-light")
display(htmlElement)

// VirtualDOM
display({tag:'div', innerText:'A VirtualDOM', class:"p-2 rounded border bg-light"})

// Observable
const obs$ = new rxjs.timer(0,1000).pipe(
    rxjs.map((count) => `Observable (over elementary type): ${count}`)
)
display(obs$)

// Unknown
display({id: 'foo', values:[42], metadata:{ bar:(x) => 2*x}})

</js-cell>

It is possible to provide multiple arguments to `display`, in such case the arguments are rendered in a row (as much as
the screen size allows):


<js-cell>
// Elementary types
display(
    "Display in a row", 
    { tag:'div', class: 'mx-1' },
    { tag:'div', innerText:'A VirtualDOM', class:"p-2 rounded border bg-light" },
    { tag:'div', class: 'mx-1' },
    rxjs.timer(0, 100)
)
</js-cell>



**Deported outputs**

Cell's outputs are by default generated right after the code cells.
You can change this behavior using an explicit `cell-output` DOM element cross referecing a `cell-id` of a Javascript 
or Python cell. You can also provide custom style to the cell-output:


<md-cell>
For instance this output:
<cell-output cell-id='foo' class="text-primary" style="display:inline-block;">
</cell-output> 
is actually generated by this cell:

<js-cell cell-id="foo">
display(new rxjs.timer(0,1000))
</js-cell>
</md-cell>

Because the `display` function is bound to one cell, it is possible to reuse the output view of one cell
in others by retrieving an instance of it:

<js-cell>
const display_foo = display
display("Hello foo")
</js-cell>

The 'Hello bar' message above is actually generated by:
<js-cell>
display_foo("Hello bar")
</js-cell>

Deported output can also set `full-screen='true'` option to provide a menu allowing to extend the rendering area.

### Reactivity

The primary approach to bring reactivity between cells is to use RxJS observables.
The `js-cell` can use a `reactive="true"` attribute that will automatically unwrap observables or pormises 
referenced within the cell, and provides the current value in place of the observable.

For instance, the following cell referenced an observable:
<js-cell>
const timer = new rxjs.timer(0, 1000)
</js-cell>

And this next one has been set with `reactive="true"`:
<js-cell reactive="true">
display(`Got a tick, index: ${timer}`)
const date = new Date().toLocaleString()
</js-cell>

As can be seen the cell is re-executed each time `timer` emits, its value within the cell is the current value
(and not the observable).

<note level='warning'>
Because of its reactivity, the `date` variable is not a string for upcoming cells:
it is an observable of string (its value changes each time `timer` emits).
This is true for every variable defined within a reactive cell.
</note> 

It is then possible to use the variable `date` just like a standard string when using a reactive cell as well:

<js-cell reactive="true">
display(`Its is: ${date}`)
</js-cell>

### Views

<note level='info'>
This section introduces the creation of views, here the concepts are presented alongside the use of
`@youwol/rx-vdom`, a tiny library for creating reactive HTMLElement. However, you can load and use any similar library,
as long as they can create HTMLElement (that can be used in the `display` function).
</note>

The notebook module comes with a predefined set of views.
This section explains the general behaviors of such views, for more information regarding available views,
their options, and how to tune them, please refer to [this page](@nav/api/Notebook/Views).

The `Views` object is available in the cells, all elements are `@youwol/rx-vdom`
VirtualDOM that can be directly rendered  using the `display` function:
<js-cell>
const range = new Views.Range()
display(range)
</js-cell>

Most views have a `value$` observable, it emits each time the value change. It can be used as it or transformed using 
the various operators of RxJS:
<js-cell>
display(range.value$)
const debounced = range.value$.pipe(rxjs.debounceTime(200))
</js-cell>

Because `value$` and associated transforms are observables, they can be used within a reactive cell:
<js-cell reactive="true">
display(`The value is: ${debounced}`)
</js-cell>

The views can also be initialized by providing the `value$` generator (that may be owned by another component):
<js-cell>
const range2 = new Views.Range({max:2, value$:range.value$})
display(range2)
</js-cell>


To gather view elements in layout:
<js-cell>
const vdom = {
    tag: 'div',
    class: 'd-flex justify-content-around',
    children:[
        range,
        range2
    ]
}
display(vdom)
</js-cell>

From an observable and a reactive cell it is possible to easily create view (note that any ways to create HTMLElement
can be used here):
<js-cell reactive='true'>
const size = '25px'
const styleRect = {
    backgroundColor:'red',
    width:size, height:size,
    left:`${50*debounced}%`,  
    position: 'absolute'  
}
display({
    tag: 'div',
    class: 'w-100',
    style: { position: 'relative', height:size },
    children:[{
        tag: 'div',
        style: styleRect
    }]
})
</js-cell>

<note level='info'>
The above approach is convenient but has an overhead: all the view is recreated from scratch each time a new debounced 
value is emitted. 
It is possible to make the changes more granular, as proposed in the next cell (which is not reactive).
</note>

<js-cell>
display({
    tag: 'div',
    class: 'w-100',
    style: { position: 'relative', height:'25px' },
    children:[{
        tag: 'div',
        style:{ 
            source$: styleRect,
            vdomMap: (style) => style
        }
    }]
})
</js-cell>

<note level='hint'>
It is also possible to have reactive children defined in the virtual DOM using `@youwol/rx-vdom`.
At the end of the day this library is tiny and capable (this very application is constructed from it)
fitting naturally within the notebook. We encourage the reader navigate to its
<a target="_blank" href="https://l.youwol.com/doc/@youwol/rx-vdom">documentation</a> for details.
</note>

## Misc

### Latex

To enable parsing latex:
*  Install the `MathJax` package before parsing occurs (either statically from your node modules, or dynamically 
   using *e.g.*  webpm).
*  Provide in the [NotebookPage](@nav/api/Notebook.NotebookPage) constructor the `options.markdown.latex:true` 
   parameter.


<md-cell>
When \\(a \ne 0\\), there are two solutions to \\(ax^2 + bx + c = 0\\),
and they are:
$$
x = {-b \pm \sqrt{b^2-4ac} \over 2a}.
$$

</md-cell>

### Markdown Cell

Markdown cell allows to provide example of Markdown source, they can themselves reference nested cells of other type.
In markdown cell it is also possible to inline expressions referenced from the current scope by providing a single 
expression like the following:

<md-cell>
The value of the previously defined slider is ${debounced}$.
</md-cell>

<note level="info">
Inlined expressions are automatically 'reactive': it displays the result of the expression
using the current values of referenced promises or observables.
</note>
