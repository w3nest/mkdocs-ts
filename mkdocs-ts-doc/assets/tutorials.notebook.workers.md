# Workers

This notebook demonstrates the usage of workers' pools. 
Workers' pools enable code execution in dedicated threads, 
allowing parallel computations while keeping the UI & UX rendering thread responsive.

This feature is a thin wrapper around the <a target="_blank" 
href="/applications/@youwol/webpm-client-doc/latest?nav=/tutorials/workers">@youwol/webpm's workers module</a>. 

To get started, make the following `WorkersPool` class available:

<js-cell>
const { WorkersPool } = await webpm.installWorkersPoolModule()
</js-cell>

In addition to JavaScript code, the Workers' pool can also run Python code using <a target="_blank" 
href="https://pyodide.org/en/stable/index.html">Pyodide</a>.

To execute cells within a worker pool, the general idea is to:
*  Create a worker pool with the desired runtime and assign it to a const variable.
*  Use `worker-cell` DOM elements to declare cells running within a worker pool and assign the attribute `workers-pool` 
   to bind the execution to a particular pool. 
   The provided code will be wrapped into a task and submitted to the pool.

<note level='warning' label="Limitations">
*  Web-worker code executes in a separate thread without access to the main thread's API. 
   In particular, it cannot access the DOM and has no `display` function.
*  Data transferred between main and worker threads must be <a 
   href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API" target="_blank">transferable</a>. 
   This usually involves cloning, which has overhead. 
   Using <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer" 
   target="_blank">SharedArrayBuffer</a> removes this overhead as its associated memory block is shared between agents.
*  Orchestrating multiple tasks is limited with `worker-cell`. You can use regular `js-cell` to manually create and 
   orchestrate tasks, as explained <a target="_blank" 
   href="/applications/@youwol/webpm-client-doc/latest?nav=/tutorials/workers">here</a>.
</note>


## Javascript

The code executed in the worker calculates the trajectory of a projectile given initial velocity and launch angle. 
The computation uses the [math.js](https://mathjs.org/) library (available through the `math` variable) and the following function:

<js-cell>
const computeTrajectory = (angle0, v0) => {
    const gravity = 9.81;
    const angle0Rad = math.unit(angle0, 'deg').toNumber('rad');
    const timeOfFlight = (2 * v0 * math.sin(angle0Rad)) / gravity;
    const maxHeight = (math.square(v0) * math.square(math.sin(angle0Rad))) / (2 * gravity)
    const range = (math.square(v0) * math.sin(2 * angle0Rad)) / gravity
    const t = math.range(0, timeOfFlight, timeOfFlight / 100, true).toArray();
    const x = t.map(time => v0 * time * math.cos(angle0Rad))
    const y = t.map(time => v0 * time * math.sin(angle0Rad) - 0.5 * gravity * math.square(time))

    return { x, y, timeOfFlight, maxHeight, range }
}
</js-cell>

First, define a workers' pool with its runtime. 
The next cell creates a pool with a minimum of one worker, able to stretch to 10 workers, each set up with:
*  The `mathjs` module (available through the variable `math`)
*  The global function `computeTrajectory`.

<js-cell>
const jsPool = new WorkersPool({
    install:{
        esm: ["mathjs#^13.0.3 as math"]
    },
    pool: { startAt: 1, stretchTo: 10 },
    globals: {
        computeTrajectory
    }
})
const jsPoolView = jsPool.view()
display(jsPoolView)
await jsPool.ready()
</js-cell>

Let's now define initial parameters for velocity (m/s) and launch angle (degree):

<js-cell>
const v0 = 100
const angle0 = 45
</js-cell>

The next cell is a `worker-cell`. In the Markdown source, it specifies a couple of available 
[attributes](@nav/api/Notebook.WorkerCellAttributes):
*  `workers-pool="jsPool"`: specifies the pool to use.
*  `mode="javascript"`: language of the script.
*  `captured-in="angle0 v0"`: the variables transferred from the main thread to the worker thread.
*  `captured-out="trajectory"`: the variable transferred from the worker thread to the main thread.

<worker-cell workers-pool="jsPool" mode="javascript"  captured-in="angle0 v0" captured-out="trajectory">
const trajectory = computeTrajectory(angle0, v0)
</worker-cell>

Since the variable `trajectory` is captured as output, the next cell allows displaying the computed results:

<js-cell>
display(`Max height is ${trajectory.maxHeight.toFixed(2)} m.`)
display(`Time of flight is ${trajectory.timeOfFlight.toFixed(2)} s.`)
</js-cell>


## Reactivity

To demonstrate how to make a `worker-cell` reactive, let first create two sliders to control the initial 
velocity and launch angle:

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

const params = rxjs.combineLatest([angleView.value$, velocityView.value$]).pipe(
    rxjs.map(([angle0, v0]) => ({ v0, angle0 })),
    rxjs.debounceTime(200)
)
</js-cell>

The `params` variable is reactive: it emits new values each time either the slider for initial velocity or 
launch angle is dragged (with a 200ms debounce time). 
To make a `worker-cell` reactive, as the next one (notice the <i class='fas fa-bolt'></i> icon), 
it needs to capture as input a reactive variable - the `params` variable here -.

<worker-cell workers-pool="jsPool" mode="javascript"  captured-in="params" captured-out="trajectory">
const trajectory = computeTrajectory(params.angle0, params.v0)
</worker-cell>

<note level="hint">
Since the cell is reactive, the `captured-out` variables (`trajectory` here) are reactive as well; 
the updated trajectory can be displayed using:

<js-cell>
display(trajectory)
</js-cell>

</note>


Finally, let's display a plot of the trajectory alongside a side-navigation panel allowing to:
*  Controlling the parameters.
*  Visualizing the state of the underlying workers' pool.

<js-cell>
const { ChartView } = await load("/tutorials/notebook/import-utils");

const chartView = await ChartView({
    data: trajectory,
    xScale: { title:{ display: true, text: 'Distance (m)'}, min:0, max:300},
    yScale: { title:{ display: true, text: 'Height (m)'}, min:0, max:150}
})

const sideNavParameters = {
    icon: 'fas fa-tachometer-alt',
    content: {
        tag: 'div',
        class: 'p-1',
        children: [angleView, velocityView, jsPoolView]
    }
}
display(Views.Layouts.sideNav({
    sideNavElements: { params: sideNavParameters },
    content: chartView
}))
</js-cell>

## Python

Running python code within a `worker-cell` essentially comes down to provide a `pyodide` interpreter within 
the associated workers' pool runtime (along with the necessary Python modules):

<js-cell>
const pyPool = new WorkersPool({
    install:{
        pyodide: {
            version: "0.26.1",
            modules: ["numpy"]
        }
    },
    pool: { startAt: 1, stretchTo: 10 }
})

const pyPoolView = pyPool.view()
display(pyPoolView)
await pyPool.ready()

</js-cell>

The next cell is a `worker-cell`, providing `python` as `language`, `pyPool` as `workers-pool`, 
capturing `params` as input (making the cell reactive) and `trajectory` as output.

<worker-cell workers-pool="pyPool" mode="python" captured-in="params" captured-out="trajectory">
import numpy as np

gravity = 9.81
angle0_rad = np.radians(params.angle0)
v0 = params.v0
time_of_flight = 2 * v0 * np.sin(angle0_rad) / gravity
t = np.linspace(0, time_of_flight, num=100)

trajectory = {
    "x": v0 * t * np.cos(angle0_rad),
    "y": v0 * t * np.sin(angle0_rad) - 0.5 * gravity * t**2,
    "timeOfFlight": time_of_flight,
    "maxHeight": (v0**2) * (np.sin(angle0_rad)**2) / (2 * gravity),
    "range": (v0**2) * np.sin(2 * angle0_rad) / gravity
}
</worker-cell>

It is then possible to display the updated results:

<js-cell reactive="true">
display(`Max height is ${trajectory.maxHeight.toFixed(2)} m.`)
display(`Time of flight is ${trajectory.timeOfFlight.toFixed(2)} s.`)
</js-cell>

As well as plotting the trajectory in the same way as already done above:

<js-cell>
const chartViewPy = await ChartView({
    data: trajectory,
    xScale: { title:{ display: true, text: 'Distance (m)'}, min:0, max:300},
    yScale: { title:{ display: true, text: 'Height (m)'}, min:0, max:150}
})

const sideNavParametersPy = {
    icon: 'fas fa-tachometer-alt',
    content: {
        tag: 'div',
        class: 'p-1',
        children: [angleView, velocityView, pyPoolView]
    }
}

display(Views.Layouts.sideNav({
    sideNavElements: { params: sideNavParametersPy },
    content: chartViewPy
}))
</js-cell>