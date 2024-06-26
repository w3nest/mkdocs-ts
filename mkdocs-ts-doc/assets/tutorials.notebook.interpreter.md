# Interpreter

This notebook demonstrates the usage of interpreters, which are backend services designed to execute code in a
controlled environment on the user's PC. Interpreters need to implement a `POST:/run` endpoint that accepts a specific
[body](@nav/api/Notebook.RunBody) and returns a defined [response](@nav/api/Notebook.RunResponse).

<note level='warning' label='Important'>
Interpreters, being backends, require the encapsulating application to be run through py-youwol for installation and 
functionality.
</note>

Although this example uses a particular Python interpreter, the principles apply to other types of interpreters as well.


## Interpreter Installation

Interpreters are installed using the `webpm` client, which provides flexibility in configuring their build environments.
The python interpreter `pyrun_backend` is used in this page: 

<js-cell>
const {pyrun} = await webpm.install({
    backends: { 
        modules:['pyrun_backend#^0.1.0 as pyrun'],
        configurations: {
            pyrun_backend: {
                build: { modules:'numpy'}
            }
        }
    }
})
</js-cell>

In the cell above:
*  The `pyrun_backend` interpreter is requested with a version compatible with `^0.1.0`, 
   and the exported symbol `pyrun` refers to its JavaScript client.
*  The backend is configured at the `build` stage to include the numpy module in its environment.

<note level="hint">
Interpreter installations are managed using a concept of partitioning: backends within a partition are isolated from 
others. If no partition ID is specified in the `webpm.install` call, a unique ID is generated, ensuring that other 
applications using `pyrun_backend#^0.1.0` are directed to separate instances, preventing state conflicts.

You can view the running backends partitions in the 
<a target="_blank" href="/co-lab?nav=/environment/backends">Colab</a> interface.
</note>


## Basics

This section covers the fundamentals of using an interpreter. 
It focuses on cells exclusively executed through the interpreter; the following section will address interactions
with other types of cells (e.g., `js-cell`, `py-cell`) and the management of reactivity.

We'll analyze the motion of a projectile launched under specified initial conditions.

In a notebook, a cell bound to an interpreter is declared using an HTML element with the tag `interpreter-cell`. 
The available attributes are documented [here](@nav/api/Notebook.InterpreterCellAttributes).
Key attributes include:
*  **interpreter**: A string pointing to the JavaScript client of the interpreter, such as `pyrun` here.
*  **language**: Specifies the language for syntax highlighting in the editor view.

Cells bounded to an interpreter features the icon <i class="fas fa-network-wired"></i> at the top left of their
editor view.

Let’s begin by implementing a function `compute` that calculates the projectile’s trajectory based on the initial 
velocity and launch angle:

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
    # Convert launch angle to radians
    angle0_rad = np.radians(angle0)
    # Calculate the time of flight, range, and maximum height
    time_of_flight = 2 * v0 * np.sin(angle0_rad) / gravity
    max_height = (v0**2) * (np.sin(angle0_rad)**2) / (2 * gravity)
    range_projectile = (v0**2) * np.sin(2 * angle0_rad) / gravity

    # Time intervals for trajectory calculation
    t = np.linspace(0, time_of_flight, num=100)
    
    # Calculate x and y coordinates
    x = v0 * t * np.cos(angle0_rad)
    y = v0 * t * np.sin(angle0_rad) - 0.5 * gravity * t**2
    
    return Result(
        time_of_flight=time_of_flight, 
        max_height=max_height, 
        range_projectile=range_projectile,
        x=x, 
        y=y,
        t=t
    )
</interpreter-cell>

Let’s test the function by calculating the projectile’s trajectory for a given initial velocity and launch angle:

<interpreter-cell interpreter="pyrun" language="python">
import pprint

initial_velocity = 50  # in meters per second
launch_angle_deg = 45  # in degrees

r = compute(initial_velocity, launch_angle_deg)
pprint.pprint(r)
</interpreter-cell>

In this example:

*  The `compute` function calculates key trajectory parameters: time of flight, maximum height, and range.
*  It returns a `Result` object containing these values and the coordinates of the projectile over time.
*  We use the `pprint` module to display the results in a readable format.


## Capturing Variables

Capturing variables in an interpreter cell allows for seamless data exchange between the interpreter and other types 
of cells, such as JavaScript cells.

When input and output captures are defined within an `interpreter-cell`, they are accessible in the editor view via
dropdowns with the icons <i class='fas fa-sign-in-alt'></i> (input) and <i class='fas fa-sign-out-alt'></i> (output).

<note level='warning' label='Important'>
All data transferred between an interpreter and the frontend must be serializable in the body of an HTTP request.
Typically, this includes simple data structures such as numbers, bytes, strings, lists, and dictionaries.
</note>

### Output capture

To capture output from an `interpreter-cell` for display or further use, define the `captured-out` attribute with 
the variable names to be captured (separated by whitespaces).
For instance, the following cell captures the `result` variable:

<interpreter-cell interpreter="pyrun" language="python" captured-out="result">
raw = compute(initial_velocity, launch_angle_deg)
result = {
    # The `tolist()` convert the numpy array to a serializable entity ove HTTP.
    "x": raw.x.tolist(),
    "y": raw.y.tolist()
}
</interpreter-cell>

Now, the `result` variable can be used in other types of cells. 
The next JavaScript cells demonstrate how to plot the projectile’s trajectory using `chart.js`.

First, install and initialize the `chart.js` plotting library:

<js-cell>
const { chartJs } = await webpm.install({
    modules:['chart.js#^3.9.1 as chartJs'],
})
chartJs.registerables.forEach((plot)=>chartJs.Chart.register(plot))
</js-cell>

In the next cell, a function `chartView` is defined.
This function returns a VirtualDOM component from the 
<a target="_blank" href="https://l.youwol.com/doc/@youwol/rx-vdom"> Rx-vDOM library</a>.
It accepts a reactive variable expected to emit objects with `x` and `y` attributes, updating the chart with each 
emission:

<js-cell>
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { 
        x: { title:{ display: true, text: 'Distance (m)'}, min:0, max:300},
        y: { title:{ display: true, text: 'Height (m)'}, min:0, max:150},
    }
}
const chartView = (r) => {
    let plot
    return {
        tag: 'div',
        class:`border text-center rounded p-2 flex-grow-1 w-100`,
        children: [
            {
                tag:'canvas',
                class:'mx-auto w-75 h-100',
                connectedCallback: (htmlElement) => {
                    plot = new chartJs.Chart(
                        htmlElement, 
                        { 
                            type: 'scatter',
                            data: { datasets: [{label:'Trajectory'}] },
                            options: chartOptions
                        }
                    )
                    htmlElement.ownSubscriptions(
                        r.subscribe( ({x,y}) => {
                            data = Array.from({length: x.length}, (_,i) => ({x: x[i], y: y[i]}))
                            plot.data.datasets[0].data = data
                            plot.update()
                        })
                    )
                },
                disconnectedCallback: (htmlElement) =>  plot.clear()
            }
        ]
    }
}
</js-cell>

<note level='hint'>
At this stage, it would have been possible to simplify a little the above implementation to account for plain value
rather than reactive variable. It has been provided as such to allow code factorization regarding future usage.
</note>

To display the current result, the `chartView` function is called (`rxjs.of` transforms the plain value `result` into
a reactive variable emitting this single object):

<js-cell>
display(chartView(rxjs.of(result)))
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

Finally, the plot of the trajectory for the new input conditions:

<js-cell>
display(chartView(rxjs.of(result)))
</js-cell>

## Reactivity

This section illustrates how to use `interpreter-cell` as a reactive cell. 
We aim to create an interactive view with sliders for input parameters that dynamically update a chart with each 
parameter change.

We'll begin by creating sliders for initial velocity and angle, and a reactive variable `reactiveInput`:

<js-cell>
const ctrlView = (text, min, max) => {
    const range = new Views.Range({min, max}) 
    return {
        tag: 'div',
        class: 'd-flex align-items-center',
        children:[
            { tag: 'div', innerText: text, style:{width: '100px'}},
            Views.mx2,
            range
        ],
        value$: range.value$
    }
}
const angleView = ctrlView(String.raw `Angle (°)`, 0, 90)
const velocityView = ctrlView(String.raw `Velocity (m/s)`, 0, 50)
display(angleView)
display(velocityView)

const reactiveInput = rxjs.combineLatest([angleView.value$, velocityView.value$]).pipe(
    rxjs.map(([angle0, v0]) => ({v0, angle0})),
    rxjs.debounceTime(50)
)
</js-cell>


To make an `interpreter-cell` reactive, you need to include one or more reactive variables (either Observable or 
Promise) in the `captured-in` attribute. The following behavior then applies:
*  The cell is re-executed each time the reactive variable(s) emits new objects.
*  The captured outputs are wrapped within reactive variable as well (as `Observable`).


The next cell is reactive (notice the <i class="fas fa-bolt></i> icon) as it captures `reactiveInput`
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
print("maxHeight", raw.max_height)
print("timeOfFlight", raw.time_of_flight)
print("rangeProjectile", raw.range_projectile)
</interpreter-cell>

You can play with the above sliders to see the value displayed updated accordingly.

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

Finally, let's wrap the view elements in a convenient layout:

<js-cell cell-id="final">
display({
    tag: 'div',
    class:'h-100 d-flex flex-column',
    children:[
        {
        	tag: 'div',
            class: 'p-2 my-2',
            children: [
                angleView,
                velocityView,
            ]
        },
        chartView(result)
    ]
})
</js-cell>

<cell-output cell-id="final" full-screen="true">
</cell-output>