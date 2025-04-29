#  Import Utilities

This page consolidates utility functions imported from various other pages.

When these utilities are imported using the load function 
(explained in the <cross-link target="notebook.import">Import Tutorial</cross-link>), 
all cells are executed sequentially, and the combined scope is returned. 
Currently, there are no tree shaking strategies implemented (although this is under consideration).

To optimize your imports, consider the following hints:

*  **Encapsulate Implementations:** Define exported symbols as functions that encapsulate both their implementation and 
any required dependencies. These symbols act as 'mini modules.'
*  **Granular Exporting:** Split exported symbols across multiple files. This allows the load function to be more
granular, importing only the necessary parts.

<note level="hint">
The `webpm.install` function efficiently skips retrieval and installation of dependencies that have already been 
installed by WebPM.
</note>

---

## A 2D Chart Helper

The following cell defines a function to render a scatter plot using the <ext-link target='chartjs'>Chart.js</ext-link>
library.

**Function overview**

*  **Input Parameters:**
    *  **`data`**: This parameter can be either an object or an Observable. 
       If it's an object, it must contain x and y attributes, where both are iterable collections of numbers. 
       If it's an Observable, it should emit such objects. 
    *  **`xScale`** and **`yScale`**: The configuration for the x and y scales as required by Chart.js.

*  **Output:** The function returns a Virtual DOM structure encapsulating the chart. 
   If data is provided as an observable, the chart dynamically updates to reflect new data points as they are emitted 
   from the observable.

<js-cell>
const ChartView = async ({data, xScale, yScale}) => {
    const { chartJs, rxjs } = await webpm.install({
        esm:['chart.js#^3.9.1 as chartJs', 'rxjs#^7.5.6 as rxjs'],
    })
    const data$ = data instanceof rxjs.Observable ? data : rxjs.of(data)
    chartJs.registerables.forEach((plot)=>chartJs.Chart.register(plot))
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins:{
            legend: {
                display: false
        }},
        scales: { 
            x: xScale,
            y: yScale
        }
    }
    return {
        tag: 'div',
        class:`border text-center rounded p-2 flex-grow-1 w-100 h-100`,
        children: [
            {
                tag:'canvas',
                class:'mx-auto w-75 h-100',
                connectedCallback: (htmlElement) => {
                    const plot = new chartJs.Chart(
                        htmlElement, 
                        { 
                            type: 'scatter',
                            data: { datasets: [{}] },
                            options: chartOptions
                        }
                    )
                    htmlElement.ownSubscriptions(
                        data$.subscribe( ({x,y}) => {
                            const serie = Array.from({length: x.length}, (_,i) => ({x: x[i], y: y[i]}))
                            plot.data.datasets[0].data = serie
                            plot.update()
                        })
                    )
                    htmlElement.onDisconnected = () => plot.clear()
                },
                disconnectedCallback: (htmlElement) =>  htmlElement.onDisconnected()
            }
        ]
    }
}
</js-cell>

---

## Label Range Input

This cell defines the `LabelRange` component, which creates a labeled range slider for user input.

**Function Overview:**
- **Input Parameters:**
   - `text`: The label text displayed beside the slider.
   - `min` and `max`: The minimum and maximum values for the range slider.
   - `labelWidth` (optional): Specifies the width of the label.
- **Output:** Returns a Virtual DOM object containing a text label and a range slider, aligned horizontally. The `value$` observable emits the current value of the slider.

<js-cell>
const LabelRange = ({ text, min, max, labelWidth }) => {
    const range = new Views.Range({ min, max });
    return {
        tag: 'div',
        class: 'd-flex align-items-center',
        children: [
            new Views.Text(text, { style: { width: labelWidth || '50px' } }),
            Views.mx2,
            range
        ],
        value$: range.value$
    };
};
</js-cell>

---

## Workers Pool Notification

This function integrates **real-time notifications** for worker pools, providing updates during two key phases:

1. **Installation Phase**
    - Displays a notification when the worker pool starts installing.
    - Updates the message based on the installation progress.
    - Notifies when the installation is complete.

2. **Task Execution Phase**
    - Notifies when one or more tasks are running within the pool.
    - Displays the number of active tasks.
    - Automatically dismisses the notification once all tasks finish.

These notifications help users **monitor the state of worker pools** while using 
<api-link target="WorkerCellView"></api-link>.

<js-cell>
const plugWPoolNotifications = async (name, workerPool, view) => {

    const { rxjs } = await webpm.install({
        esm:['rxjs#^7.5.6 as rxjs'],
    })
    // Handle installation notifications
    workerPool.cdnEvent$.pipe(
        rxjs.take(1)
    ).subscribe(()=> {
        const isInstallDone$ = workerPool.cdnEvent$.pipe( 
            rxjs.filter( ev => ev.step !== 'ConsoleEvent'),
            rxjs.map( (ev) => ev.step === 'InstallDoneEvent' ),
            rxjs.takeWhile( (ev) => ev.step !== 'InstallDoneEvent')
        )
        Views.notify({
            level: isInstallDone$.pipe( rxjs.map((done) => done ? 'success' : 'warning' )),
            content: { 
                tag: 'div',
                children: [
                    { 
                        tag: 'div',
                        innerText: { 
                            source$: isInstallDone$, 
                            vdomMap: (done) => done 
                                ? `Workers Pool '${name}' ready` 
                                : `Workers Pool '${name}' is initializing`
                        }
                    },
                    view,
                ]
            },
            done$: isInstallDone$.pipe( 
                rxjs.filter( isDone => isDone),
                rxjs.delay(2000)
            )
        })
    })
    // Handle running task notifications
    workerPool.runningTasks$.subscribe( (tasks) => {
        const hasTasks$ = workerPool.runningTasks$.pipe(
            rxjs.map(tasks => tasks.length === 0),
            rxjs.delay(1000)
        );
        if(tasks.length > 0){
            Views.notify({
                level: 'warning',
                content: {
                    tag: 'div', class: 'd-flex align-items-center',
                    children: [
                        { tag: 'i', class:'fas fa-cog fa-spin mx-1'},
                        { tag: 'div', innerText:`There are ${tasks.length} tasks running in '${name}'.`},
                    ]
                },
                done$: hasTasks$
            })
        }
    })
}

</js-cell>