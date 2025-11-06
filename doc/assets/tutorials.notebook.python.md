
# Python

This page provides a guide on integrating a Python interpreter into a notebook page, enabling the execution of Python
cells directly within your browser using <api-link target="PyCellView"></api-link>.
These cells are referenced with the tag `py-cell` in the markdown source, e.g.

<code-snippet language="markdown">
This exemplifies the usage of `py-cell` within a notebook page:

<py-cell>
/* cell content goes here */
</py-cell>
</code-snippet>

The available attributes for a `py-cell` are documented in <api-link target="PyCellView.FromDomAttributes"></api-link>.

<note level="hint">
At its core, the Python code executed here is compiled to WebAssembly, enabling seamless interaction with standard 
JavaScript. As this page will demonstrate, it’s not about running Python and JavaScript in isolation—rather,
they coexist in a tightly integrated runtime, allowing bidirectional data exchange and execution between the two 
languages.
</note>

<note level='warning' label='Important'>

When executing Python code as outlined here, the runtime is included and executed within your web browser using the 
<ext-link target="pyodide">Pyodide</ext-link> solution. Be aware of the following limitations:

- **Limited Package Availability:** Only pure Python wheels from PyPI are supported, along with a restricted set of 
    non-pure Python wheels compiled to WebAssembly. For more details, refer to the list of available packages
   <ext-link target="pyodide-packages">here</ext-link>.

- **WebAssembly Constraints:** Pyodide's execution within WebAssembly has certain
    <ext-link target="pyodide-limitations">constraints</ext-link> that may affect performance and functionality.

- **Initial Load Time:** The initial download of Python modules can be time-consuming. 
    However, once downloaded, modules are cached in the browser for online use, or stored in the PC filesystem when 
    used through <ext-link target='w3nest'>W3Nest</ext-link>. 
    Note that warming up the runtime and Python modules also impacts performance each time the page is reloaded.

- **Only functions can be exported**: When importing python symbols from one page to another using `load`, only
  python functions can be referenced.

This approach is suitable for relatively simple scenarios. For more complex cases, consider using a Python backends
interpreter as explained in the <cross-link target="notebook.interpreter">Interpreter Tutorial</cross-link>.

</note>


## Example: Projectile Motion

This example demonstrates how to set up and use a Python interpreter to perform calculations related to projectile
motion. We will use Pyodide to execute Python code directly within the notebook, which calculates the trajectory of a projectile given initial velocity and launch angle.

### Setting Up Pyodide

To enable Python execution, we first need to instantiate a Pyodide runtime and install necessary Python modules:

<js-cell>
const pyodide = await installPyodide({
    version: "{{pyodide-version}}",
    modules: ["numpy"],
    display,
    notification: true
})
</js-cell>

<note level="warning" title="Unresponsive UI">
Since Pyodide is installed in the main thread, the UI will not respond until the installation is complete.

To keep users informed, the example above displays a notification with real-time installation progress using
<api-link target="notify"></api-link>.
</note>

### Python Code for Projectile Motion

Below is the Python function that calculates various parameters of a projectile's motion, such as time of flight, 
range, and maximum height, based on initial velocity and launch angle.

<py-cell>
import numpy as np

def compute(v0: float, angle0: float):
    gravity = 9.81  # acceleration due to gravity in m/s^2
    angle0_rad = np.radians(angle0)  # Convert launch angle to radians
    time_of_flight = 2 * v0 * np.sin(angle0_rad) / gravity
    t = np.linspace(0, time_of_flight, num=100)
    
    return {
        "x": v0 * t * np.cos(angle0_rad),
        "y": v0 * t * np.sin(angle0_rad) - 0.5 * gravity * t**2,
        "timeOfFlight": time_of_flight,
        "maxHeight": (v0**2) * (np.sin(angle0_rad)**2) / (2 * gravity),
        "range": (v0**2) * np.sin(2 * angle0_rad) / gravity
    }
</py-cell>

### JavaScript Integration

To create interactive inputs for initial velocity and launch angle, use the `LabelRange` components. These components allow users to adjust the parameters and see updated results dynamically.

<js-cell>
const { rxjs } = await webpm.install({
    esm:['rxjs#^7.5.6 as rxjs']
})

const { LabelRange } = await load("/tutorials/notebook/import-utils");

const angleView = LabelRange({
    text: String.raw `\(\theta \ (^\circ) \)`, min: 0, max: 90
});
const velocityView = LabelRange({
    text: String.raw `\(\mathbf{v} \ (m/s) \)`, min: 0, max: 50
});

display(angleView);
display(velocityView);

const params$ = rxjs.combineLatest([angleView.value$, velocityView.value$]).pipe(
    rxjs.map(([angle0, v0]) => ({ v0, angle0 })),
    rxjs.debounceTime(50)
)
</js-cell>

### Computing the Results

Next, we calculate the projectile's trajectory using the Python function and display the range.

<js-cell reactive="true">
const result$ = compute(params$.v0, params$.angle0)
    .toJs({ dict_converter: Object.fromEntries });

display("Max height (m):", Views.mx1, result$.maxHeight.toFixed(2))
display("Time of flight (s):", Views.mx1, result$.timeOfFlight.toFixed(2))
display("Range (m):", Views.mx1, result$.range.toFixed(2))
</js-cell>

Notes:

*  **Reactive Execution:** The cell is marked as reactive, meaning it automatically re-executes whenever the `params$`
   observable updates. This ensures that `params$` always contains the most recent projectile parameters,
   and `result$` emits the updated trajectory data accordingly.

*  **Convertion to JavaScrip:** The `toJs` function converts the Python data structure to JavaScript. 
   The `dict_converter` parameter customizes this conversion by replacing the default behavior of converting a
   Python dictionary to a JavaScript `Map` with a conversion to a JavaScript `Object`. 
   For more details, refer to the Pyodide 
   <ext-link target="pyodide-type-convertion"> type conversions documentation</ext-link>



### Visualizing the Trajectory

Finally, we visualize the projectile’s trajectory using a chart component.

<js-cell>
const { ChartView } = await load("/tutorials/notebook/import-utils");

const chartView = await ChartView({
    data: result$,
    xScale: { title:{ display: true, text: 'Distance (m)'}, min:0, max:300},
    yScale: { title:{ display: true, text: 'Height (m)'}, min:0, max:150}
})

display(angleView)
display(velocityView)
display(chartView)
</js-cell>


## Scope

Details regarding the injected scope in a python cell are available in <api-link target="executePy"></api-link>.
This section illustrates the most important concepts.

Scope management obeys the same rule as for JavaScript cells:
*  Only **top-level** persist in subsequent cells.
*  **Immutables types** (*e.g.* `string`, `float`, `int`) are re-initialized at each run
*  **Mutable types** (*e.g.* `list`, `object`) retain their state across executions.

As illustration, let's initialize some variables:

<py-cell>
foo = 42

bar = { 'value': 42 }

def innerScope():
    baz = 42

innerScope()
</py-cell>

And apply mutations:

<py-cell>
foo = 2 * foo
display("Primitive type:", Views.mx1, foo)
bar['value'] *= 2
display("Non-primitive type:", Views.mx1, bar['value'])

# display(baz) => name 'baz' is not defined
</py-cell>

Each time the cell runs:

*  `foo` resets to `42`, so the output remains `84`.
*  `bar['value']` persists and doubles with each execution.
*   `baz` is defined inside a function and does not persist outside its scope.

**Shared Runtime**

Python and JavaScript symbols are seamlessly shared between py-cell and js-cell, allowing 
**bidirectional communication**. 

JavaScript-defined variables are available in Python:

<js-cell>
const theta = 45
const v = 50
</js-cell>

<py-cell>
result = compute(v, theta)['range']
display(result)
</py-cell>

<note level="warning" >
Variable names that are valid in JavaScript may not be allowed in Python. 
A **sanitization** process adjusts these names as described in <api-link target="fixScopeInvalidVar"></api-link>.
</note>

Similarly, Python-defined variables can be used in JavaScript:

<js-cell>
display(result)
</js-cell>

<note level="hint" >
Most Python variables used in JavaScript are `PyProxy` objects (see 
<ext-link target="pyodide-type-convertion">Pyodide documentation</ext-link>). 
Their **lifecycle must be managed explicitly** using `.destroy()`. 
Python cells **automatically call `.destroy()`** on exposed variables when invalidated.
</note>


Let’s take this a step further by integrating JavaScript UI elements with Python computation:

<js-cell>

const resultView = (params) => {
   display({
        tag: 'div',
        class: 'd-flex',
        children: [
            { tag: 'div',  innerText: 'Range' },
            Views.mx1,
            { tag: 'div',  innerText: compute(params.v0, params.angle0).get('range') },
        ]   
    })
}
</js-cell>

The cell defines a function that compute and display the `range` value of the projectile motion given initial parameters -
computation being implemented within python. Note that `display` is bound to the output of this particular cell.

<py-cell>
display(angleView,  Views.mx2, velocityView)

params_.pipe(
    rxjs.takeUntil(invalidated_)
).subscribe(resultView)

</py-cell>

The python cell display the (JavaScript implemented) slider views, and plug `resultView` call for any changes in parameters.
Note that `params_` is referring to the JavaScript `params$` variable, as `$` is not permitted in python for variable 
names.



<note level="hint">
While most type conversions happen automatically and feel intuitive, some challenges remain—particularly regarding 
object lifecycle between Python and JavaScript. As a general guideline:

*  Use Python for exposing computation as functions to JavaScript.
*  Use JavaScript to orchestrate them an define related UI.

For explanation regarding Python/JavaScript type translations, refer to the
<ext-link target="pyodide-type-convertion">Pyodide documentation</ext-link>.
</note>



## Going Further

*  **Blocking Execution**: Running Python computations or loading packages on the main thread may cause the web browser
   to **become unresponsive**. Consider using **Web Workers** for non-blocking execution, as explained in the 
   <cross-link target="notebook.workers">Web Workers Tutorial</cross-link>.

*  **Data Visualization**: The <cross-link target='notebook.python.matplotlib'>Matplotlib Tutorial</cross-link> 
   demonstrates how to use matplotlib to plot graphs directly in the notebook.
