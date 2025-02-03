
# Python

This page provides a guide on integrating a Python interpreter into a notebook page, enabling the execution of Python
cells directly within your browser using <api-link target="PyCellView"></api-link>.
These cells are referenced with the tag `py-cell` in the markdown source.

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


Let's start with installing {{mkdocs-ts}}:

<js-cell>
const version = "{{mkdocs-version}}"

const { MkDocs } = await webpm.install({
    esm:[ 
         // Both are used to display a notification
        `mkdocs-ts#${version} as MkDocs`, 
        'rxjs#^7.5.6 as rxjs' 
    ]
})
display(MkDocs)
</js-cell>

## Example: Projectile Motion

This example demonstrates how to set up and use a Python interpreter to perform calculations related to projectile
motion. We will use Pyodide to execute Python code directly within the notebook, which calculates the trajectory of a projectile given initial velocity and launch angle.

### Setting Up Pyodide

To enable Python execution, we first need to instantiate a Pyodide runtime and install necessary Python modules:

<js-cell>
const { installWithUI } = await webpm.installViewsModule()

const notif = `
This page proceed with installation of **Pyodide** in the main thread.

Expect the UI to be non-responsive until done.

<install-view></install-view>
`
const { pyodide } = await installWithUI({
    pyodide: ["numpy"],
    display: (view) => { 
        display(view)
        const done$ = view.eventsMgr.event$.pipe(
            rxjs.filter( (ev) => ev.step === 'InstallDoneEvent')
        )
        const content = MkDocs.parseMd({
            src: notif,
            views: { 'install-view' : () => view }
        })
        Views.notify({
            level: 'warning',
            content,
            done$
        })
    }
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

## Side Notes


*  As observed, loading Python packages and executing computations on the main thread can cause the web browser to 
become unresponsive. The <cross-link target="notebook.workers">Web Workers Tutorial</cross-link> provides
an alternative providing a non-blocking solution.

*  The <cross-link target='notebook.python.matplotlib'>Matplotlib Tutorial</cross-link> illustrates the usage of 
   `matplotlib` to draw plots within your notebook page.
