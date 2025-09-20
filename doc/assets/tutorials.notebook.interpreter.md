# Interpreter


<note level='warning' label='Important'>
This feature requires the application to be run through the 
**<ext-link target="w3nest">local W3Nest server</ext-link>**. 
Only this environment supports the automatic backend installation required for interpreters.
</note>

This tutorial demonstrates how to use the <api-link target="InterpreterCellView"></api-link> component, 
which defines an executable cell interpreted by a backend. 
These interpreter cells are referenced from the Markdown source code using a DOM element with the tag 
`interpreter-cell`, e.g.:

<code-snippet language="markdown">
This exemplifies the usage of `interpreter-cell` within a notebook page:

<interpreter-cell interpreter="pyrun" language="python">
import numpy
print(numpy)
</interpreter-cell>
</code-snippet>

The available attributes for a `interpreter-cell` are documented in 
<api-link target="InterpreterCellView.FromDomAttributes"></api-link>.


The backend used in this example is <api-link target="pyrun_backend"></api-link>, a built-in interpreter in
{{mkdocs-ts}}. However, you can use other interpreters as long as they implement a `POST /run` endpoint that follows
the <api-link target="InterpreterApi"></api-link> specification.


## Interpreter Installation

Interpreters are installed using the <ext-link target="webpm">WebPM client</ext-link>.
This allows flexible configuration of build environments, as determined by the backend itself.

For example, as documented in <api-link target="pyrun_backend"></api-link>, you can configure it using:

*  `modules`: A list of Python modules to install.

*  `apt`: A list of system packages required by the backend.

The following code installs the pyrun_backend interpreter with the `numpy` module:

<js-cell>
const { displayNotification } = await load("/tutorials/notebook/import-utils")
const { installWithUI } = await webpm.installViewsModule()

const { pyrun } = await installWithUI({
    backends: { 
        modules:['pyrun_backend#^0.2.1 as pyrun'],
        configurations: {
            pyrun_backend: {
                build: { 
                    modules:'numpy'
                }
            }
        }
    },
    display: (view) => { 
        display(view)
        displayNotification(view)
    }
})
</js-cell>

**Checking Backend Status**

You can monitor the status, logs, and running instances of an interpreter backend through
the <ext-link target="w3lab">W3Lab</ext-link> application under **Environment > Backends**.

<note level="hint" title="Partitioning">
Interpreter installations use **partitioning**, isolating backends from each other.
If no partition ID is specified, a unique one is generated per tab session, preventing conflicts.
</note>


## Basic Usage

Let's define a function compute to calculate a projectile's trajectory using **initial velocity** and **launch angle**:

The next cell is an `interpreter-cell` (notice the <i class="fas fa-network-wired"></i> icon), the corresponding
DOM element in the Markdown feature the attributes: 
*  **`interpreter="pyrun"`** → Binds the cell to the interpreter.
*  **`language="python"`** → Controls syntax highlighting (not execution language, which is set by the interpreter).


<interpreter-cell interpreter="pyrun" language="python">
import numpy as np
import dataclasses

@dataclasses.dataclass(frozen=True)
class Result:
    time_of_flight: float
    max_height: float
    range_projectile: float
    x: np.array
    y: np.array
    t: np.array

def compute(v0: float, angle0: float):

    gravity = 9.81  # acceleration due to gravity in m/s^2
    angle0_rad = np.radians(angle0)
    time_of_flight = 2 * v0 * np.sin(angle0_rad) / gravity
    t = np.linspace(0, time_of_flight, num=100)

    return Result(
        time_of_flight=time_of_flight, 
        max_height=(v0**2) * (np.sin(angle0_rad)**2) / (2 * gravity), 
        range_projectile=(v0**2) * np.sin(2 * angle0_rad) / gravity,
        x=v0 * t * np.cos(angle0_rad), 
        y=v0 * t * np.sin(angle0_rad) - 0.5 * gravity * t**2,
        t=t
    )
</interpreter-cell>

Now, let's compute and display the results:

<interpreter-cell interpreter="pyrun" language="python">
import pprint

initial_velocity = 50  # in meters per second
launch_angle_deg = 45  # in degrees

r = compute(initial_velocity, launch_angle_deg)
pprint.pprint(r)
</interpreter-cell>


## Capturing Variables

Captured variables allow data exchange between interpreter cells and other cells (e.g., JavaScript).

Captured variables appear as dropdowns in the editor, marked with:

*  <i class='fas fa-sign-in-alt'></i> for **inputs**

*  <i class='fas fa-sign-out-alt'></i> for **outputs**

<note level='warning' label='Important'>
All data exchanged **must be serializable** (numbers, strings, lists, dicts, etc.).
</note>

### Output capture

To capture output from an `interpreter-cell`, define the `captured-out` attribute with 
the variable names to be captured (separated by whitespaces).

For instance, the following cell captures the `result` variable:

<interpreter-cell interpreter="pyrun" language="python" captured-out="result">
raw = compute(initial_velocity, launch_angle_deg)
result = {
    # The `tolist()` convert the numpy array to a serializable entity over HTTP.
    "x": raw.x.tolist(),
    "y": raw.y.tolist()
}
</interpreter-cell>

Now, the `result` variable can be used in other types of cells. 
To display the current result, the `ChartView` function is loaded and executed:

<js-cell>
const { ChartView } = await load("/tutorials/notebook/import-utils")

const xScale = { title:{ display: true, text: 'Distance (m)'}, min:0, max:300}
const yScale = { title:{ display: true, text: 'Height (m)'}, min:0, max:150}

display( await ChartView({data:result, xScale, yScale}) )
</js-cell>



### Input capture

Similarly, input can be captured by defining the `captured-in` attribute to pass variables' values to the 
`interpreter-cell`.

For instance, define input variables as in the following JavaScript cell:

<js-cell>
const input = { 
    v0: 25,
    angle0: 65,
}
</js-cell>

To utilize `input` in the following `interpreter-cell`, the attribute `captured-in="input"` has been defined (here, 
also `captured-out="result"` is set for output):

<interpreter-cell interpreter="pyrun" language="python" captured-in="input" captured-out="result">
pprint.pprint(input)
raw = compute(input['v0'], input['angle0'])
result = {
    "x": raw.x.tolist(),
    "y": raw.y.tolist()
}
</interpreter-cell>

Finally, to plot the trajectory for the new input conditions:

<js-cell>
display( await ChartView({data:result, xScale, yScale}) )
</js-cell>

## Reactivity

This section illustrates how to use `interpreter-cell` as a reactive cell. 
We aim to create an interactive view with sliders for input parameters that dynamically update a chart with each 
parameter change.

We'll begin by creating sliders for initial velocity and angle, and a reactive variable `reactiveInput`:

<js-cell>
const { rxjs } = await webpm.install({
    esm:[ 'rxjs#^7.8.2 as rxjs' ]
})
const { LabelRange } = await load("/tutorials/notebook/import-utils");

const angleView = LabelRange({
    text: String.raw `\(\theta \ (^\circ) \)`, min: 0, max: 90
});
const velocityView = LabelRange({
    text: String.raw `\(\mathbf{v} \ (m/s) \)`, min: 0, max: 50
});
display(angleView)
display(velocityView)

const reactiveInput = rxjs.combineLatest([angleView.value$, velocityView.value$]).pipe(
    rxjs.map(([angle0, v0]) => ({v0, angle0})),
    rxjs.debounceTime(50)
)
</js-cell>

<note level='warning' title='Variable name compatibility'>
A common convention is to suffix reactive variable with a `$` sign. 
However, it has not been done for `reactiveInput` because this variable will be used in the next python cell, 
which does not allow `$` in variable name.
</note>

To make an `interpreter-cell` reactive, you need to include one or more reactive variables (either `Observable` or 
`Promise`) in the `captured-in` attribute. The following behavior then applies:
*  The cell is re-executed each time the reactive variable(s) emits new objects.
*  The captured outputs are wrapped within reactive variable as well (*i.e.* as `Observable`).


The next cell is reactive (notice the <i class="fas fa-bolt"></i> icon) as it captures `reactiveInput`
(an `Observable`) as input:

<interpreter-cell interpreter="pyrun" language="python" captured-in="reactiveInput" captured-out="result">
pprint.pprint(reactiveInput)
raw = compute(reactiveInput['v0'], reactiveInput['angle0'])

result = {
    "x": raw.x.tolist(),
    "y": raw.y.tolist(),
    "maxHeight": raw.max_height,
    "timeOfFlight": raw.time_of_flight,
    "rangeProjectile": raw.range_projectile
}
print(f"maxHeight (m): {raw.max_height:.4g}")
print(f"timeOfFlight (s): {raw.time_of_flight:.4g}")
print(f"rangeProjectile (m): {raw.range_projectile:.4g}")
</interpreter-cell>

You can play with the sliders above to see the value displayed updated accordingly.

<note level="hint">
When multiple reactive variables are included in the `captured-in` attribute, the default strategy is to combine
their streams using <a href="https://rxjs.dev/api/index/function/combineLatest" target="_blank">combineLatest</a>.

For finer control over the combination strategy, explore the available
<a href="https://www.learnrxjs.io/learn-rxjs/operators/combination" target="_blank">RxJS combination operators</a>.
</note>

Because `result` is reactive (it is an `Observable`), a JavaScript reactive cell can be used to automatically 
react to changes:

<js-cell reactive="true">
display("Max height (m):", Views.mx1, result.maxHeight.toFixed(2))
display("Time of flight (s):",Views.mx1,  result.timeOfFlight.toFixed(2))
display("Range (m):", Views.mx1, result.rangeProjectile.toFixed(2))
</js-cell>

Finally, let's wrap the view elements in a layout:

<js-cell cell-id="final">
display({
    tag: 'div',
    class:'h-100 d-flex flex-column',
    children:[
        {
        	tag: 'div',
            children: [
                angleView,
                velocityView,
            ]
        },
        Views.my2,
        await ChartView({data:result, xScale, yScale})
    ]
})
</js-cell>

<cell-output cell-id="final" full-screen="true">
</cell-output>