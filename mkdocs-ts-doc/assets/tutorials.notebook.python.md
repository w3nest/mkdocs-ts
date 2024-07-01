
# Python

This page provides a guide on integrating a Python interpreter into a notebook page, enabling the execution of Python cells directly within your browser.

<note level='warning' label='Important'>

When executing Python code as outlined here, the runtime is included and executed within your web browser using the 
<a target="_blank" href="https://pyodide.org/en/stable/index.html">Pyodide</a> 
solution. Be aware of the following limitations:

- **Limited Package Availability:** Only pure Python wheels from PyPI are supported, along with a restricted set of 
    non-pure Python wheels compiled to WebAssembly. For more details, refer to the list of available packages
    <a target="_blank" href="https://pyodide.org/en/stable/packages.html">here</a>.
- **WebAssembly Constraints:** Pyodide's execution within WebAssembly has certain
    <a target="_blank" href="https://pyodide.org/en/stable/usage/wasm-constraints.html">constraints</a>
    that may affect performance and functionality.
- **Initial Load Time:** The initial download of Python modules can be time-consuming. 
    However, once downloaded, modules are cached in the browser for online use or stored in the PC filesystem when 
    used through py-youwol. Note that warming up the runtime and Python modules impacts performance each time
    the page is reloaded.

This approach is suitable for relatively simple scenarios. For more complex cases, consider using Python backends.
</note>

## Example: Projectile Motion

This example demonstrates how to set up and use a Python interpreter to perform calculations related to projectile
motion. We will use Pyodide to execute Python code directly within the notebook, which calculates the trajectory of a projectile given initial velocity and launch angle.

### Setting Up Pyodide

To enable Python execution, we first need to instantiate a Pyodide runtime and install necessary Python modules using
the **webpm** client:

<js-cell>
const { pyodide } = await webpm.install({
    pyodide: {
        version: '0.25.0',
        modules: ["numpy"]
    },
    onEvent: (ev) => {
        display(ev.text);
    },
})
</js-cell>

### Python Code for Projectile Motion

Below is the Python function that calculates various parameters of a projectile's motion, such as time of flight, range, and maximum height, based on initial velocity and launch angle.

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
   <a target="_blank" href="https://pyodide.org/en/stable/usage/type-conversions.html"> type conversions documentation
   </a>



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
become unresponsive. We are developing utilities to run code in a worker pool, which will enhance performance for 
Python tasks, especially those involving intensive data processing.
*  An example using <a target="_blank" href="https://matplotlib.org/">matplotlib</a> to draw plots is provided 
   [here](@nav/tutorials/notebook/python/matplotlib).
