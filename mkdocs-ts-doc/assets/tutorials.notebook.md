# Notebook

Notebook allows to insert pages including code that can eventually be displayed, modified and run.

It is a good to display code for illustration, documentation and collaboration.

For anything serious, we recommend developing libraries using your favorite IDEA and stack, the code written
in notebooks are neither optimized nor standardized.


## Create a notebook

Notebook are pages within `@youwol/mkdocs-ts` navigation structure, it wraps a Markdown page:

<js-cell language='javascript'>
const { MkDocs, RxDom } = await webpm.install({
    modules:[
        '@youwol/mkdocs-ts#0.3.4 as MkDocs',
        '@youwol/rx-vdom#1.0.1 as RxDom'
    ]
})
const src =  `
### Loading example

<js-cell>
display(1)
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

Global options for a notebook page are availables, see [here](@nav/api/Notebook.NotebookPage).

When instantiating the `html` attribute of a navigation node using `NotebookPage` multiple widgets becomes available
for markdown:
*  **`<js-cell></js-cell>`** : It defines a javascript cell. Its content can be displayed or not, and its output can
be displayed or not, as well as inserted at any position in your document.
*  **`<py-cell></py-cell>`** : It's a TODO, just like a javascript cell but code are written in python, more on that 
in the dedicated page.

When editing the notebook, the associated project is usually served using a dev. server for automatic refresh when 
sources changed. Also, it comes in complement with what already exist in `mkdocs-ts`, in particular regarding 
the edition of Markdown (custom widgets, *etc*).

## Essential concepts

This section presents the essential concepts of the notebook, it is backed up by dedicated pages to dive inside 
particular topic.

Notebook pages essentially comes down to a list of coding cells that depends on each others. 
To make it simple for now, one cell can be executed if all the previous cells have been executed as well.
When modifying and running a particular cell, the following cells become `invalidated` and must be re-executed.

### Scope

Within a particular notebook page, all the top levels symbols exposed by the javascript cells are accessible to the 
following cells.

<js-cell cell-id="60">
const x = 1 // 'x' is accessible in following cells
let y = 2  // so is 'y'
{
   const z = 3 // but 'z' is not
}
</js-cell>

It is possible to bring into the scope esm or python libraries, backends or symbols from another notebook page, 
refer to the [impots](@nav/notebook/imports) section for explanation on that topic.


### Output

Each cell has in its scope a  ̀display` function to render outputs of a cell.

The display function can handle:
*  **`string` | `boolean` | `number`**: They are rendered directly.
*  **`HTMLElement`**: They are appended just as they are.
*  **`VirtualDOM`**: The native reactive extension of DOM element within a notebook page (more on that in the next section).
*  **`Observable`**: They are rxjs observable, a kind of 'pipe' that emits value over time. The output subscribe to it
and display the outgoing data using the rules explained here (more on that in the reactive section too).
*  **`Unknown Data`**: The fallback if none of the previous rules applied.

The following cell illustrates the different options:

<js-cell cell-id="86">
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

**Deported outputs**

Cell's outputs are by default generated right after the code cells (if displayed, otherwise at its location).
You can change this behavior using an explicit `<cell-output cell-id='an_id'></cell-output>` to control the position
of the output. The `cell-id` attribute should be explicitely provided to one coding cell, *e.g.* 
`<js-cell cell-id='an_id'></js-cell>`. You can provide custom style to the cell-output.


<md-cell cell-id="md-117">
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

<js-cell cell-id="140">
const display_foo = display
display("Hello foo")
</js-cell>

<js-cell cell-id="145">
display_foo("hello bar")
</js-cell>

### Reactivity
<js-cell cell-id="171">
const timer = new rxjs.timer(0, 1000)
</js-cell>


<js-cell cell-id="174" reactive="true">
display(`Got a tick, index: ${timer}`)
const date = new Date().toLocaleString()
</js-cell>

<js-cell cell-id="179" reactive="true">
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
their options and how to tune them, please refer to [this page](@nav/api/Notebook/Views).

The `Views` object is available in the cells, all elements are rx-vdom VirtualDOM that can be directly rendered 
using the `display` function:
<js-cell>
const range = new Views.Range()
display(range)
</js-cell>

All views have a `value$` generator, it emits each time the value change. It can be used as it or transformed using 
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

This approach is convenient but has an overhead: all the view is recreated from scratch each time a new debounced value 
is emitted. Using rx-vdom it is possible to create a view that only update the style attribute of the
inner div (the following cell is not reactive):

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

# Misc

## Latex

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

## Markdown Cell

<md-cell>
The value is ${debounced}$.
</md-cell>