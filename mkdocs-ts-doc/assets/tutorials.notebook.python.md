# Python

This page explains how to include a Python interpreter in a notebook page to enable Python cells.

<note level='warning' label='Important'>
When executing Python code as explained here, the runtime is included and executed within your web browser.
This implementation uses the <a href="https://pyodide.org/en/stable/index.html" target="_blank">pyodide</a> solution,
which has specific limitations:
* Not all Python packages are available. Only pure Python wheels from PyPI can be used, along with a limited number 
of non-pure Python wheels compiled to WebAssembly (see <a href="" target="_blank">here</a>).
* There are a few important
<a href="https://pyodide.org/en/stable/usage/wasm-constraints.html" target="_blank">limitations</a>.
* The first fetch of Python modules can take some time (though they are cached in the browser when used online,
or in the PC filesystem when used through py-youwol). Additionally, warming up the runtime and the Python modules
impacts performance each time the page reloads.

Overall, this solution is useful for 'simple enough' scenarios. For more complex use cases, consider using Python backends.
</note>

A simple use case is examined here: approximating the value of \\(\pi\\) using the Monte Carlo method.

The principle of the Monte Carlo method is to draw random points in a 2D space of size \\(1 \times 1\\) and calculate
the ratio of points that fall within a circle of radius 0.5. The accuracy of the approximation increases with the 
number of points drawn.
The Python library NumPy is used for this, and the Matplotlib Python module is used to display a plot.

To enable the execution of Python cells, a variable `pyodide` referencing a Pyodide runtime instance should be made 
available. A convenient way to achieve this, along with installing Python modules, is by using the **webpm** client:
<js-cell>

const { pyodide } = await webpm.install({
    pyodide:{
        version:'0.25.0',
        modules:["numpy", "matplotlib"]
    },
    onEvent: (ev) => {
        display(ev.text)
    },
})
const {plt_to_svg} = await load("/tutorials/notebook/python/utils")
</js-cell>

In the above cell, a small utility function (plt_to_svg) is also imported to facilitate displaying Matplotlib plots 
within the notebook. Its implementation can be found [here](@nav/tutorials/notebook/python/utils).


Let's start by defining some parameters (the number of points to be drawn) using a JavaScript variable:

<js-cell>
const options = { ptsCount: 1000 }
</js-cell>

Next, we'll implement the Monte Carlo (MC) algorithm in a Python cell:

<py-cell>
import numpy as np

def pi(options):
    # 2D data spread uniformly across a square of A=1
    n = int(options['ptsCount'])
    data = np.random.uniform(-0.5, 0.5, size=(n, 2))
    # Count points that are within distance 0.5 from center
    inside = len(np.argwhere(np.linalg.norm(data, axis=1) < 0.5))
    return inside / n * 4

display(pi(options))
</py-cell>

As seen in the last line of the cell, JavaScript variables available in the scope (here `options`) are accessible
within Python cells transparently.

You can call Python functions from a subsequent Python cell:

<py-cell>
display(pi(options))
</py-cell>

And also from a JavaScript cell:
<js-cell>
display(pi(options))
</js-cell>

<note level="warning" label="Important">
Currently, only Python functions can be accessed from JavaScript cells.
</note>

Python functions can easily be integrated with observables for reactivity:

<js-cell>
countView = new Views.Range({min:1, max: 7, step: 1})
const piObs = countView.value$.pipe(
    rxjs.map((count) => pi({ ptsCount: Math.pow(10,count) }))
)
display(countView)
display(
    new Views.Text(String.raw`\(\pi\) **approximation**:`), 
    Views.mx1,
    piObs
)
</js-cell>

Creating a plot using Matplotlib is straightforward as well:

<py-cell>
import matplotlib.pyplot as plt

def plot():
    xs = np.logspace(1, 5, 100)
    ys = [pi({'ptsCount': x}) for x in xs]
    fig, ax = plt.subplots()
    plt.xscale('log') 
    plt.xlabel('MC count (log scale)')
    plt.ylabel('π')
    ax.plot(xs, ys)
    return plt_to_svg(fig)

</py-cell>

<js-cell>
display({
    tag:'img',
    src: `data:image/png;base64,${plot()}`
})
</js-cell>

<note level="hint">
As you may have noticed, both loading Python packages and executing computations in the main thread can freeze 
the web browser.

Utilities for executing code within a worker pool are part of our ongoing work and will be released soon. 
This will be especially useful for Python tasks, which often involve 'data-crunching'.
</note>