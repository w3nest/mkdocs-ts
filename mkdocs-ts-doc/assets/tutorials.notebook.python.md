# Python

This page explains how to include python cells.

To allow the execution of python cells, a python runtime should be maid available using the `webpm` client:

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

<js-cell>

const options = { mcCount: 1000 }
</js-cell>


<py-cell>
import numpy as np

def pi(options):
    # 2D data spread uniformly across a square of A=1
    n = int(options['mcCount'])
    data = np.random.uniform(-0.5, 0.5, size=(n, 2))
    # Count points that are within distance 0.5 from center
    inside = len(np.argwhere(np.linalg.norm(data, axis=1) < 0.5))
    return inside / n * 4

display(pi(options))
</py-cell>

<py-cell>
display(pi(options))
</py-cell>

<js-cell>
display(pi(options))
</js-cell>


<js-cell>
countView = new Views.Range({min:1, max: 7, step: 1})
const piObs = countView.value$.pipe(rxjs.map((count) => pi({ mcCount: Math.pow(10,count) })))
display(countView)
display(
    new Views.Text(String.raw`\(\pi\) **approximation**:`), 
    Views.mx1,
    piObs
)
</js-cell>


<py-cell>
import matplotlib.pyplot as plt

def plot():
    xs = np.logspace(1, 5, 100)
    ys = [pi({'mcCount': x}) for x in xs]
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