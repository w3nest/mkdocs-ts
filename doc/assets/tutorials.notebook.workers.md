# Workers

This notebook demonstrates how to use **worker pools** via <api-link target="WorkerCellView"></api-link>. 
Worker pools allow executing code in dedicated **threads**, enabling **parallel computation** while **keeping the 
UI responsive**.

The cells are referenced with the tag `worker-cell` in the markdown source, e.g.:


<code-snippet language="markdown">
This exemplifies the usage of `worker-cell` within a notebook page:

<worker-cell workers-pool="jsPool" mode="javascript">
/* cell content goes here */
</worker-cell>
</code-snippet>

The available attributes for a `worker-cell` are documented in 
<api-link target="WorkerCellView.FromDomAttributes"></api-link>. In particular, the content can be provided using
**JavaScript** or **Python** - as explained in this page.

To get started, **install the `WorkersPool` module**  from <ext-link target="webpm">WebPM</ext-link>:

<js-cell>
const { WorkersPool } = await webpm.installWorkersPoolModule()
</js-cell>

The conceptual flow to execute computations in a worker pool:

1.  Create a worker pool, defines its environment, and store it in a variable  (e.g., `jsPool`).
2.  Define worker-cells that assigns a task to the pool using the attribute **workers-pool** 
    (e.g. `workers-pool="jsPool"`).

<note level='warning' label="Limitations">
*  Web-worker code executes in a separate thread without access to the main thread's API. 
   In particular, it cannot access the DOM and has no `display` function.
*  Data transferred between main and worker threads must be 
   <ext-link target="worker-transferable">transferable</ext-link>.
   This usually involves cloning, which has overhead. 
   Using <ext-link target="shared-array">SharedArray</ext-link>  removes this overhead as its associated memory block
   is shared between agents.
</note>


## Javascript Execution


### Task Definition

We’ll compute the trajectory of a projectile using <ext-link target="mathjs">MathJS</ext-link> (accessible via
the `math` variable): 

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

This is a standard JavaScript cell, it defines the function that will be:
1.  Be transferred into the worker pool environment (when setting up the worker pool).
2.  Invoked within `worker-cell`.

<note level="hint">
Although this function could have been defined directly inside the worker cell, defining it separately makes it 
accessible also from both standard `js-cell` and `py-cell`. 
</note>
<note level="warning">
The function will execute within the worker pool, meaning it can only access symbols that have been explicitly installed 
in the worker environment (see the setup section below).
</note>

### Workers Pool Runtime Definition

Let's define the workers' pool runtime. 
The next cell creates a pool with a minimum of one worker, able to stretch to ten workers, each set up with:
*  The `mathjs` module (available through the variable `math`)
*  The function `computeTrajectory` previously defined.

<js-cell>
// WorkersPoolView is used to display installation progress
const { WorkersPoolView } = await webpm.installViewsModule()

const jsPool = new WorkersPool({
    install:{
        esm: ["mathjs#^13.0.3 as math"]
    },
    pool: { startAt: 1, stretchTo: 10 },
    globals: {
        computeTrajectory
    }
})
</js-cell>

The above specifies the workers pool environment:
*  **`install`** is the usual definition of required `esm`, `pyodide` and `backends` components.
*  **`pool`** specifies sizing policy.
*  **`globals`** specifies which variables from the main thread are provided to the workers scope.

Let's await for the pool readiness and provides visual feedbacks regarding installation & execution progresses (see
<cross-link target="notebook.utils.notifications">plugNotifications</cross-link> helper):

<js-cell>
const { plugWPoolNotifications } = await load("/tutorials/notebook/import-utils")

const jsPoolView = new WorkersPoolView({workersPool:jsPool})
display(jsPoolView)
await plugWPoolNotifications('JS Pool', jsPool, jsPoolView)

await jsPool.ready()
</js-cell>


**Schedule Task**

Let's now define initial parameters for velocity (m/s) and launch angle (degree):

<js-cell>
const v0 = 100
const angle0 = 45
</js-cell>

The following cell is a `worker-cell` (indicated by the <i class='fas fa-cog'></i> icon).  
In the Markdown source, it includes several attributes documented in  
<api-link target="WorkerCellView.FromDomAttributes"></api-link>:

* **`workers-pool="jsPool"`** – Specifies the worker pool responsible for executing the task.
* **`mode="javascript"`** – Indicates that the script will be executed using the JavaScript interpreter  
  (for Python execution via Pyodide, use `mode="python"` instead).
* **`captured-in="angle0 v0"`** – Lists variables transferred from the main thread to the worker thread when the task
  starts.
* **`captured-out="trajectory"`** – Defines variables that will be sent back from the worker thread to the main thread
  once the task completes successfully.

<worker-cell workers-pool="jsPool" mode="javascript" captured-in="angle0 v0" captured-out="trajectory">  
const trajectory = computeTrajectory(angle0, v0)  
</worker-cell>  

When this cell executes, the provided code is submitted to the worker pool for processing:

* If an available worker exists, it immediately picks up and executes the task.
* If all workers are busy, the task is added to the queue and will be processed once a worker becomes available.
* If the worker pool is not yet at its maximum capacity, a new worker may be created to handle the task.

Once execution is complete, the results are transferred back to the main thread, where they can be displayed:

<js-cell>  
display(`Max height is ${trajectory.maxHeight.toFixed(2)} m.`)  
display(`Time of flight is ${trajectory.timeOfFlight.toFixed(2)} s.`)  
console.log("JSPool", jsPool)  
</js-cell>  

## Reactivity

To illustrate how to make a `worker-cell` reactive, we'll first create two sliders to dynamically adjust the initial 
velocity and launch angle.

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

const { rxjs } = await webpm.install({esm:["rxjs#^7.5.6 as rxjs"]})
const params = rxjs.combineLatest([angleView.value$, velocityView.value$]).pipe(  
rxjs.map(([angle0, v0]) => ({ v0, angle0 })),  
rxjs.debounceTime(200)  
)  
</js-cell>

The `params` variable is **reactive**, meaning it emits new values whenever the user adjusts the sliders.
A **200ms debounce** ensures that computations are not triggered too frequently.

To enable reactivity in a `worker-cell`, it must capture a reactive variable as input. 
In the following example, the `params` variable is used, making the `worker-cell` reactive (as indicated by the 
<i class='fas fa-bolt'></i> icon).

<worker-cell workers-pool="jsPool" mode="javascript" captured-in="params" captured-out="trajectory">  
const trajectory = computeTrajectory(params.angle0, params.v0)  
</worker-cell>  

<note level="hint">  
Since this cell is reactive, the output variable (`trajectory`) is also reactive, meaning it updates automatically
when input values change.  
</note>  

### Visualizing the Results

Next, we’ll display the projectile's trajectory alongside a side navigation panel, which allows users to:
* Adjust parameters interactively.
* Monitor the state of the underlying worker pool.

<js-cell>  
const { ChartView } = await load("/tutorials/notebook/import-utils");  

const chartView = await ChartView({  
    data: trajectory,  
    xScale: { title: { display: true, text: 'Distance (m)' }, min: 0, max: 300 },  
    yScale: { title: { display: true, text: 'Height (m)' }, min: 0, max: 150 }  
});

const sideNavParameters = {  
    icon: 'fas fa-tachometer-alt',  
    content: {  
        tag: 'div',  
        class: 'p-1',  
        children: [angleView, velocityView]  
    }  
};

display(Views.Layouts.sideNav({  
    sideNavElements: { params: sideNavParameters },  
    content: chartView  
}));  
</js-cell>

This setup provides an interactive visualization where users can modify inputs and see the trajectory update in real-time.

## Python Execution

Running Python code within a `worker-cell` involves setting up a **Pyodide** interpreter inside the associated 
worker pool runtime. This allows Python scripts to run efficiently in the background, alongside the
necessary Python modules.

<js-cell>
const pyPool = new WorkersPool({
    install:{
        pyodide: {
            version: "{{pyodide-version}}",
            modules: ["numpy"]
        }
    },
    pool: { startAt: 1, stretchTo: 10 }
})

const pyPoolView = new WorkersPoolView({workersPool:pyPool})
display(pyPoolView)
plugWPoolNotifications('PY Pool', pyPool, pyPoolView)

await pyPool.ready()

</js-cell>

The following `worker-cell` defines the following attributes:

* **`workers-pool="pyPool"`** –  Specifies the worker pool that executes the Python task.
* **`mode="python"`** – Indicates that Pyodide is used as the interpreter.
* **`captured-in="params"`** – Receives the input reactive parameter `params`, making the cell reactive. 
* **`captured-out="trajectory"`** –  Sends back the computed trajectory after execution.


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

We can plot the projectile's trajectory using the same approach as before.

<js-cell>
const chartViewPy = await ChartView({
    // `trajectory` is a reactive variable (Observable)
    data: trajectory,
    xScale: { title:{ display: true, text: 'Distance (m)'}, min:0, max:300},
    yScale: { title:{ display: true, text: 'Height (m)'}, min:0, max:150}
})

const sideNavParametersPy = {
    icon: 'fas fa-tachometer-alt',
    content: {
        tag: 'div',
        class: 'p-1',
        children: [angleView, velocityView]
    }
}

display(Views.Layouts.sideNav({
    sideNavElements: { params: sideNavParametersPy },
    content: chartViewPy
}))
</js-cell>