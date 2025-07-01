# Notebook

A notebook page within {{mkdocs-ts}} is an interactive page that allows users to combine code, visualizations, 
explanatory text, and other media elements in a single interface.
It provides a convenient way to demonstrate code, view the results, and document analysis or findings in a structured 
and easily shareable format. 

This very page is an example of it, you can have a look at its source 
<github-link target='tutorials.notebook.md'>here</github-link>.

You can also find examples of notebooks in the <ext-link target='w3nest-gallery'>W3Nest Gallery</ext-link>.

## Requirements

### MkDocs-TS

Start by ensuring {{mkdocs-ts}} is installed along with its required dependencies:

<js-cell>
const version = "{{mkdocs-version}}"

const { MkDocs } = await webpm.install({
    esm:[ `mkdocs-ts#${version} as MkDocs`],
    css: [
        'bootstrap#5.3.3~bootstrap.min.css',
        `mkdocs-ts#${version}~assets/mkdocs-light.css`,
        'fontawesome#5.12.1~css/all.min.css',
    ]
})
display(MkDocs)
</js-cell>


### Notebook plugin

To enable Notebook pages, install the <api-link target='Notebook'></api-link> plugin:

<js-cell>
const versionNotebook = "{{notebook-version}}"
const { NotebookModule } = await webpm.install({
    esm:[ `@mkdocs-ts/notebook#^${versionNotebook} as NotebookModule`],
    css: [
        `@mkdocs-ts/notebook#^${versionNotebook}~assets/notebook.css`,
    ]
})
display(MkDocs)

</js-cell>


## Getting Started

The <api-link target="NotebookPage"></api-link> component can be integrated into the navigation structure,
allowing it to encapsulate Markdown source code or external Markdown files referenced via a URL.

The following example demonstrates how to create a simple document including a single notebook page from 
a Markdown source (`src`):

<js-cell cell-id="example0">
const src =  `
# Welcome to Interactive Notebooks  

This example demonstrates a **simple JavaScript cell**:

<js-cell>
display('Hello World')
</js-cell>

Click the <i class='fas fa-play text-success'></i> button to run the cell, or press \`Ctrl+Enter\` inside the cell.

---

### **Explore Different Cell Types**

In addition to JavaScript cells, notebooks support multiple interactive cell types:
- **\`md-cell\`** → Markdown for rich text and formatting
- **\`py-cell\`** → In-Browser Python execution
- **\`interpreter-cell\`** → Custom interpreters for other languages 
- **\`worker-cell\`** → Background task execution

---

### **Reactive from the Ground Up**

Built-in **reactivity** using <a target="_blank" href="https://reactivex.io/">ReactiveX</a> ensures seamless updates
and dynamic content.

<note level='hint'>
This is just the beginning—let’s get started! 🚀  
</note>
`
const nav = {
    name: 'Notebook',
    layout: ({router}) => new NotebookModule.NotebookPage({
        src,
        router,
    }),
}
const router = new MkDocs.Router({ 
    navigation: nav, 
    // For real scenario the following parameter is not needed.
    // It is used here to not re-locate your browser when navigating in this example.
    browserClient: (p) => new MkDocs.MockBrowser(p)
})

const app = new MkDocs.DefaultLayout.Layout({
    router,
    name: 'Demo App',
})

display(app)
</js-cell>

<cell-output cell-id="example0" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;" class="p-1 rounded border">
</cell-output>

Configuration options for a notebook page are defined within <api-link target="NotebookViewParameters"></api-link>. 
Key parameters include:
*  **`params.url`**: Specifies a URL for the Markdown source, replacing the need for a direct `src`.

*  **`params.options.markdown`**: Defines Markdown parsing options, such as **custom views**, **LaTeX support**, 
   *etc*. See <api-link target="MdParsingOptions"></api-link>).

*  **`params.initialScope`**: Sets the initial scope available to the first cell 
   (see <api-link target="Scope"></api-link>).

*  **`params.displayFactory`**: Allows defining custom display rules for rendering elements (covered in more detail 
   in upcoming sections). See <api-link target="DisplayFactory"></api-link>.

<note level="hint">
Since multiple **notebook pages** can be structured hierarchically—and symbols can be
**imported** between them (see <cross-link target="notebook.import">Imports</cross-link>) —
a <api-link target="Navigation"></api-link> node associated with a notebook page effectively behaves like a **module**. 
</note>

## Essential concepts

This section introduces the fundamental concepts of notebooks. 
Additional pages provide deeper dives into specific topics.

Notebook pages are made up of coding cells. Each cell can access variables defined in previous cells.
When you modify and run a cell, the cells that follow are invalidated and need to be re-executed.

In the following sections, we will focus on  <api-link target="JsCellView"></api-link> cells to cover the basics. 
They are referenced from the Markdown source code using a DOM element with the tag 
`js-cell`, e.g.:

<code-snippet language="markdown">
This exemplifies the usage of `js-cell` within a notebook page:

<js-cell>
console.log("Hello JavaScript cell")
</js-cell>
</code-snippet>

The available attributes for a `js-cell` are documented in 
<api-link target="JsCellView.FromDomAttributes"></api-link>.


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
For more information on this topic, refer to the
<cross-link target="notebook.imports">Import Tutorial</cross-link>.

### Output

Each cell exposes a <api-link target="display"></api-link> function within its scope 
for rendering outputs.

This function accommodates various types of data:

* **`string` | `boolean` | `number`**: These are rendered directly.

* **`HTMLElement`**: They are appended as is.

* **`VirtualDOM`**: This represents the native reactive extension of DOM elements within a notebook page 
(covered in the next section).

* **`Observable`**: These are <ext-link target="rxjs">RxJS</ext-link> observables, they hold value of data that changes over time.
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
const { rxjs } = await webpm.install({
    esm:[ `rxjs#^7.5.6 as rxjs`]
})

const obs$ = new rxjs.timer(0,1000).pipe(
    rxjs.map((count) => `Observable (over elementary type): ${count}`)
)
display(obs$)

// Unknown
display({id: 'foo', values:[42], metadata:{ bar:(x) => 2*x}})

</js-cell>

You can provide multiple arguments to `display`. In such cases, the arguments are rendered in a row, as much as the 
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
<api-link target='DeportedOutputsView.FromDomAttributes'></api-link>.

For instance, the following snippet define a deported output with the option `full-screen`:

<md-cell>
The following output:  
<cell-output cell-id='foo' class="text-primary" full-screen="true">
</cell-output>

is dynamically generated by the JavaScript cell below:

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

Similarly, the following example demonstrates how to define an inline element directly within Markdown using
the `inlined="true"` attribute:

<md-cell>
This output "<cell-output cell-id='foo' inlined="true"></cell-output>"
is actually generated by:

<js-cell cell-id="foo">
display(new rxjs.timer(0,1000))
</js-cell>
</md-cell>

<note level="hint" title="Markdown Cells" expandable="true" mode="stateful">
The examples above showcase <api-link target="MdCellView"></api-link>, which can be embedded using 
the `md-cell` DOM element. These Markdown cells allow:

*  Referencing nested cells of different types.

*  Embedding inline expressions that interact with the current execution scope.

*  Automatic reactivity, meaning inline expressions dynamically update based on changes in referenced observables or 
   promises (more details in the next section).

</note>


Since the `display` function is bound to a specific cell, you can reuse the output view of one cell in subsequent cells 
by retrieving an instance of it:

<js-cell>
const display_foo = display
display("Hello foo")
</js-cell>

The 'Hello bar' message above is actually generated by:
<js-cell>
display_foo("Hello bar")
</js-cell>


### Reactivity

To achieve reactivity between cells, you can use <ext-link target="Observable">JavaScript Promise</ext-link> or 
<ext-link target="Observable">RxJS Observable</ext-link>. 

The key differences between the two are:

*  **`Promises`**: Hold a single value that becomes available at some point in the future.

*  **`Observables`**: Can emit multiple values over time, making them more versatile for handling streams of data.
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

As can be seen, **the cell is re-executed each time `timer` emits**, its value within the cell is the current value
(and not the observable).

<note level='warning' label="Important">
Because of its reactivity, the `date` variable is not a string for upcoming cells:
it is an observable of string (its value changes each time `timer` emits).
This is true for every variable defined within a reactive cell.


It is then possible to use the variable `date` just like a standard string in another **reactive** cell:

<js-cell reactive="true">
display(`Its is: ${date}`)
</js-cell>

</note> 


<note level='warning' label="Scope">
To ensure **robustness and predictability**, reactive cells can only reference **`const` variables from
the input scope**, and **only export `const` variable in the output scope**.

For more information, refer to the <api-link target="executeJs$"></api-link>.
</note>

### Views

<note level='info'>
This section introduces the creation of views using <ext-link target="rx-vdom">Rx-vDOM</ext-link>,
a small library for creating reactive HTML elements. 
You can also load and use any similar library, as long as it can create HTML elements that can be used within
the `display` function.
</note>

The notebook module includes a predefined set of views. This section explains the general behavior of these views.
For the list of available views and associated options, please refer to <api-link target="Notebook.Views"></api-link>.


The `Views` object is available in JavaScript cells, they can be directly rendered using the `display` function.
For instance with a <api-link target="Notebook.Views.Range"></api-link>:

<js-cell>
const range = new Views.Range();
display(range);
</js-cell>

Most views have a **`value$`** observable that emits each time the value changes. 
This observable can be used directly or transformed using various
<ext-link target="operators">RxJS operators</ext-link>:

<js-cell>
display(range.value$);
const debounced$ = range.value$.pipe(rxjs.debounceTime(200))
</js-cell>

Since **`value$`** and its transformations are **observables**, they can be used within a reactive cell:

<js-cell reactive="true">
display(`The value is: ${debounced$}`);
</js-cell>

Views can also be usually initialized by providing an explicit **`value$`** generator, 
which may be owned by another component:

<js-cell>
const range2 = new Views.Range({ max: 2, value$: range.value$ });
display(range2);
</js-cell>

To arrange view elements in a layout, a convenient option is to use a 
<ext-link target="virtual-dom">VirtualDOM</ext-link>:

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

In the above, <ext-link target="bootstrap.d-flex">Bootstrap Flex Rendering</ext-link> class utilities have been used
to render **`range`** & **`range2`** into a specific (horizontal) layout.

<note level="hint" title="Layouts">
The module <api-link target="Notebook.Views.Layouts"></api-link> provide a set of builtins layouts.
</note>

Using a **reactive cell** enables the rendering of a reactive view. 
The following example demonstrates this by displaying a red square whose position is dynamically computed based on the 
**`debounced$`** observable:

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

<note level="hint" title="Optimizing Rendering" expandable="true" mode="stateful">
The limitation of the example above is that the entire `div` element is recreated each time **`debounced$`** emits a 
new value, even though only the style of the inner child actually changes.

To achieve more granular updates, the <ext-link target="rx-vdom">Rx-vDOM</ext-link> library provides various primitives 
to efficiently react to observables in a controlled manner.

The following (**non-reactive**) example improves efficiency by making only the style attribute reactive:

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
                width:'25px', height:'25px',
                left:`${50*debounced}%`,  
                position: 'absolute'  
            })
        }
    }]
})
</js-cell>

We recommend that readers explore `Rx-vDOM` to leverage its capabilities for efficient, fine-grained reactivity in 
their applications.
</note>

### Scope & Mutations

Each time a cell runs, it starts with an initial scope defined by the entering scope rather than a global scope.
This feature helps maintain consistency across runs.

**Immutable Variable**

Let’s initialize a variable:

<js-cell>
let foo = 42
</js-cell>

Now, mutate it:

<js-cell>
foo *= 2
display(foo)
</js-cell>

Each time you run the above cell, the output remains the same (84) because foo is reinitialized to 42 in the entering
scope every time. This ensures predictable and reproducible results.

**Mutable Object**

Consider a scenario involving a mutable object:

<js-cell>
let bar = { 'value': 42 }
</js-cell>

Now, mutate the value:

<js-cell>
bar['value'] *= 2
display(bar.value)
</js-cell>

Each time you run this cell, `bar['value']` is doubled, producing an updated value.
This occurs because `bar` retains its state between runs as a mutable object. Re-running the cell results in:

```
84
168
336
...
```

This illustrates a key distinction:

*  **Immutable Variables**: Are redefined with the same initial value each run, maintaining consistent behavior.
*  **Mutable Objects**: Retain and modify their state, potentially leading to different results on each run.

**Practical Implications**

While mutable objects can be powerful, they can introduce challenges:

*  **Reproducibility**: Results may differ between runs due to retained state changes, complicating debugging and validation.
*  **Subtle Bugs**: Mutations can lead to hard-to-trace issues, especially when objects are shared across cells or modules.

<note level='hint'>
To avoid pitfalls associated with mutable state:

*  **Minimize Mutation**: Prefer immutable data structures where possible, especially in scenarios requiring consistent,
   reproducible results.
*  **Explicit Initialization**: Reinitialize mutable objects within cells if they must be reset to a known state for
   each run.
*  **Isolation**: Isolate mutable state changes within controlled scopes to prevent unintended side effects.

</note>


## What's Next?

Ready to explore more? Dive into the following tutorials:

*  **<cross-link target="notebook.import">Import</cross-link>**: Learn how to import **ESM, Python, backends**, 
   and even other Notebook pages.

*  **<cross-link target="notebook.scope">Scope & Mutations</cross-link>**: Understand how scope management works 
  within interactive notebooks.
 
* **<cross-link target="notebook.python">Python</cross-link>**: Execute Python code **directly in your web browser**.

* **<cross-link target="notebook.workers">Worker's Pool</cross-link>**:  Leverage **Web Workers** to distribute 
  computations across multiple threads.

* **<cross-link target="notebook.interpreter">Interpreter</cross-link>**:  Use backend interpreters to run cells in
  **different programming languages**.
