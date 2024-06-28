# Notebook

A notebook page within **mkdocs-ts** is an interactive page that allows users to combine code, visualizations, 
explanatory text, and other media elements in a single interface.
It provides a convenient way to demonstrate code, view the results, and document analysis or findings in a structured 
and easily shareable format. You can find our examples of notebooks
<a href="/applications/@youwol/gallery/latest" target="_blank">here</a>.

<note level="info">
Although the format offers convenience and a wide range of capabilities, the code generated within the notebook
is not optimized and not standardized (in particular, it is not in ESM module format). 
The coding environment is also quite poor compared to what is typically offered in common IDEs.

The strength of this format lies in presenting the usage of multiple interactive components, which themselves are 
constructed from standard technology stacks.
</note>


## Create a project

Notebooks are pages within the **@youwol/mkdocs-ts** navigation structure, wrapping Markdown source code or Markdown 
files referenced by a URL.

The following cell presents an example, creating a simple document that includes one notebook page (from the Markdown
source `src`):

<js-cell>
const { MkDocs } = await webpm.install({
    modules:[ '@youwol/mkdocs-ts#{{mkdocs-version}} as MkDocs' ],
    css: [
        'bootstrap#4.4.1~bootstrap.min.css',
        'fontawesome#5.12.1~css/all.min.css',
        '@youwol/fv-widgets#latest~dist/assets/styles/style.youwol.css',
        '@youwol/mkdocs-ts#{{mkdocs-version}}~assets/mkdocs-light.css',
        '@youwol/mkdocs-ts#{{mkdocs-version}}~assets/notebook.css',
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

Global options for a notebook page are available. See [here](@nav/api/Notebook.NotebookPage) for details.

In the above example, a single Javascript cell is included using the DOM element `js-cell`, others are available
(*e.g.* `py-cell`, `md-cell`), they will be introduced in what follows.

Because the notebook feature is supported by **mkdocs-ts**, it is possible to create projects with multiple pages,
and also import symbols from one page to another (more on that in a bit).

## Essential concepts

This section introduces the fundamental concepts of notebooks. 
Additional child pages provide deeper dives into specific topics.

Notebook pages are made up of coding cells. Each cell can access variables defined in previous cells.
When you modify and run a cell, the cells that follow are invalidated and need to be re-executed.

In the following sections, we will focus on JavaScript cells to cover the basics. If you're interested in Python cells,
please visit this [page](@nav//tutorials/notebook/python).


### Scope

In a notebook page, all top-level symbols exposed by JavaScript cells are accessible to the subsequent cells.

<js-cell>
const x = 1 // 'x' is accessible in following cells
let y = 2  // so is 'y'
{
   const z = 3 // but 'z' is not
}
</js-cell>

You can also bring ESM modules, Python libraries, backends, and symbols from other notebook pages into scope. 
For more information on this topic, refer to the [imports page](@nav/notebook/imports).

### Output

Each cell contains a `display` function within its scope for rendering outputs.

This function accommodates various types of data:
* **`string` | `boolean` | `number`**: These are rendered directly.
* **`HTMLElement`**: They are appended as is.
* **`VirtualDOM`**: This represents the native reactive extension of DOM elements within a notebook page 
(covered in the next section).
* **`Observable`**: These are [RxJS](https://rxjs.dev/) observables, they hold value of data that changes over time.
The output subscribes to it and displays the outgoing data (explained further in the 'Reactivity' section).
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

You can provide multiple arguments to display. In such cases, the arguments are rendered in a row, as much as the 
screen size allows:

<js-cell>
// Elementary types
display(
    "Display in a row", 
    { tag:'div', class: 'mx-1' },
    { tag:'div', innerText:'a VirtualDOM', class:"p-2 rounded border bg-light" },
    { tag:'div', class: 'mx-1' },
    "and an observable",
    { tag:'div', class: 'mx-1' },
    rxjs.timer(0, 100)
)
</js-cell>


**Deported outputs**

By default, cell outputs are generated right after the code cells. 
However, you can change this behavior by using an explicit `cell-output` DOM element that cross-references a 
`cell-id` attribute of a JavaScript or Python cell. 
Additional options (e.g. `full-screen`, `inlined`, `style`, *etc.*) can be provided - see 
[DeportedOutputsView.FromDom](@nav/api/Notebook.DeportedOutputsView.FromDom).

For instance, the following snippet define a deported output with the option `full-screen`:

<md-cell>
This output:
<cell-output cell-id='foo' class="text-primary" full-screen="true">
</cell-output>

Is actually generated by:

<js-cell cell-id="foo">
display({ 
    tag: 'div', class: 'h-100 w-100 d-flex flex-column justify-content-center', 
    children: [{ 
        tag: 'div',
        class: 'w-100 text-center',
        innerText: {
            source$: new rxjs.timer(0,1000),
            vdomMap:    () => new Date().toLocaleString()
        }
    }]
})
</js-cell>

</md-cell>

And this next one is used to define an inlined element within the MarkDown (using `inlined="true"`):

<md-cell>
This output "<cell-output cell-id='foo' inlined="true"></cell-output>"
is actually generated by:

<js-cell cell-id="foo">
display(new rxjs.timer(0,1000))
</js-cell>
</md-cell>

<note level="info">
The two cells above also give an example of MarkDown cell, included using the DOM element `md-cell`.
</note>


Since the display function is bound to a specific cell, you can reuse the output view of one cell in subsequent cells by
retrieving an instance of it:

<js-cell>
const display_foo = display
display("Hello foo")
</js-cell>

The 'Hello bar' message above is actually generated by:
<js-cell>
display_foo("Hello bar")
</js-cell>


### Reactivity

To achieve reactivity between cells, you can use JavaScript promises or RxJS observables. 
The key differences between the two are:
*  Promises: Hold a single value that becomes available at some point in the future.
*  Observables: Can emit multiple values over time, making them more versatile for handling streams of data.
   Additionally, observables can be combined and transformed to create powerful data-flow definitions.

The Javascript cells can use a `reactive="true"` attribute that will automatically unwrap observables or promises 
referenced within the cell, and provides their current value in place of the observable.

For instance, the following cell create an observable:
<js-cell>
const timer = new rxjs.timer(0, 1000)
</js-cell>

And this next one has been set with `reactive="true"` (notice the <i class='fas fa-bolt'></i> icon on the right):
<js-cell reactive="true">
display(`Got a tick, index: ${timer}`)
const date = new Date().toLocaleString()
</js-cell>

As can be seen the cell is re-executed each time `timer` emits, its value within the cell is the current value
(and not the observable).

<note level='warning' label="Important">
Because of its reactivity, the `date` variable is not a string for upcoming cells:
it is an observable of string (its value changes each time `timer` emits).
This is true for every variable defined within a reactive cell.


It is then possible to use the variable `date` just like a standard string in another reactive cell:

<js-cell reactive="true">
display(`Its is: ${date}`)
</js-cell>

</note> 


### Views

<note level='info'>
This section introduces the creation of views using @youwol/rx-vdom, a small library for creating reactive HTML
elements. You can also load and use any similar library, as long as it can create HTML elements that can be used with 
the display function.
</note>

The notebook module includes a predefined set of views. This section explains the general behavior of these views.
For more information about available views, their options, and how to customize them, please refer to [this page](@nav/api/Notebook/Views).


The `Views` object is available in JavaScript cells, and all elements are `@youwol/rx-vdom` VirtualDOM components 
that can be directly rendered using the `display` function:

<js-cell>
const range = new Views.Range();
display(range);
</js-cell>

Most views have a `value$` observable that emits each time the value changes. 
This observable can be used directly or transformed using various RxJS operators:

<js-cell>
display(range.value$);
const debounced$ = range.value$.pipe(rxjs.debounceTime(200))
</js-cell>

Since `value$` and its transformations are observables, they can be used within a reactive cell:

<js-cell reactive="true">
display(`The value is: ${debounced$}`);
</js-cell>

Views can also be initialized by providing a `value$` generator, which may be owned by another component:

<js-cell>
const range2 = new Views.Range({ max: 2, value$: range.value$ });
display(range2);
</js-cell>

To arrange view elements in a layout:

<js-cell>
const vdom = {
    tag: 'div',
    class: 'd-flex justify-content-around',
    children: [
        range,
        range2
    ]
};
display(vdom);
</js-cell>

From an observable and a reactive cell it is possible to easily create a reactive view:
<js-cell reactive='true'>
const size = '25px'
const styleRect = {
    backgroundColor:'red',
    width:size, height:size,
    left:`${50*debounced$}%`,  
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

The drawback of the above cell is that it re-creates the entire HTML div element each time `debounced$` emits, 
while only the style of the inner child actually changes.

For more granular updates, use a non-reactive cell:
<js-cell>
display({
    tag: 'div',
    class: 'w-100',
    style: { position: 'relative', height:'25px' },
    children:[{
        tag: 'div',
        style:{ 
            source$: debounced$,
            vdomMap: (debounced) => ({
                backgroundColor:'red',
                width:size, height:size,
                left:`${50*debounced}%`,  
                position: 'absolute'  
            })
        }
    }]
})
</js-cell>

<note level='hint'>
It is also possible to define reactive children within the virtual DOM using `@youwol/rx-vdom`. 
This library is both tiny and capable, fitting naturally within the notebook's RxJS-based reactivity approach. 
For more details, refer to its <a target="_blank" href="https://l.youwol.com/doc/@youwol/rx-vdom">documentation</a>.
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

Markdown cells allow you to provide examples of Markdown source code. These examples are included using the md-cell DOM 
element.

Markdown cells can reference nested cells of other types, as demonstrated previously. 
They can also include inline expressions that use the current scope. These inline expressions are automatically 
reactive, displaying results based on the current values of referenced promises or observables.

For instance:
<md-cell>
The value of the previously defined slider is ${debounced$}$.
</md-cell>


