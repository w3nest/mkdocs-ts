# MatplotLib Integration

This page illustrates the use of <ext-link target="matplotlib">Matplotlib</ext-link> for creating and managing graphics 
within the Pyodide environment.
The approach, which can be extended to other scenarios involving Python libraries for graphics generation,
involves producing HTML, SVG, or PNG content via Pyodide and rendering it using standard DOM elements.

<note level="hint">
For better separation of concerns, it's often more efficient to handle rendering logic within JavaScript cells
using JavasScript libraries, while keeping only data processing logic in Python cells.
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


## Setting Up Matplotlib

To begin, we need to install the necessary packages, including numpy and matplotlib, within the Pyodide runtime:

<js-cell>
const { installWithUI } = await webpm.installViewsModule()
const notif = `
This page proceed with installation of **Pyodide** in the main thread.

Expect the UI to be non-responsive until done.

<install-view></install-view>
`

const { pyodide } = await installWithUI({
    pyodide: ["numpy", "matplotlib"],
    display: (view) => {
        display(view)
        const done$ = view.eventsMgr.event$.pipe(
            rxjs.filter( (ev) => ev.step === 'InstallDoneEvent'),
            rxjs.delay(1000) 
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
Because `matplotlib` is installed, it takes a short while.

To keep users informed, the example above displays a notification with real-time installation progress using
<api-link target="notify"></api-link>.
</note>

## Example Scenario: Projectile Motion


The example revisits the projectile motion analysis detailed on the parent page. We use a Python function to compute 
the trajectory of a projectile based on initial velocity and launch angle:


<py-cell>
import numpy as np
import dataclasses

@dataclasses.dataclass(frozen=True)
class Trajectory:
    x: np.array
    y: np.array
    

def compute(v0: float, angle0: float) -> Trajectory:
    gravity = 9.81
    angle0_rad = np.radians(angle0)
    time_of_flight = 2 * v0 * np.sin(angle0_rad) / gravity
    t = np.linspace(0, time_of_flight, num=100)
    
    return Trajectory(
        x=v0 * t * np.cos(angle0_rad),
        y=v0 * t * np.sin(angle0_rad) - 0.5 * gravity * t**2
    )
</py-cell>

## Generating the Plot with Matplotlib

Next, we use Matplotlib to create a plot of the projectile's trajectory. The plot is generated in SVG format to 
facilitate embedding within the HTML structure of the notebook:

<py-cell>
import io
import base64
import matplotlib.pyplot as plt

def plt_to_svg(fig):
    svg_output = io.BytesIO()
    fig.savefig(svg_output, format='svg')
    plt.close(fig)
    svg_output.seek(0)
    return base64.b64encode(svg_output.getvalue()).decode('ascii')

def plot(v0: float, angle0: float):
    trajectory = compute(v0, angle0)
    fig, ax = plt.subplots()
    plt.xlabel('Distance (m)')
    plt.ylabel('Height (m)')
    plt.axis([0, 300, 0, 150])
    ax.plot(trajectory.x, trajectory.y)
    return plt_to_svg(fig)
</py-cell>

### Explanation


1. **Function `plot`**:
    - **Purpose**: Computes the projectile’s trajectory and creates a plot using Matplotlib.
    - **Details**:
        - **Compute Trajectory**: Uses the `compute` function to calculate the projectile’s path based on initial velocity (`v0`) and angle (`angle0`).
        - **Setup Plot**: Sets up a Matplotlib figure and axes, labels the x and y axes, and defines the plot range. The trajectory data is plotted as a line graph.

2. **Function `plt_to_svg`**:
    - **Purpose**: Converts the Matplotlib plot into an SVG image.
    - **Details**:
        - **SVG Conversion**: Saves the figure to an in-memory SVG file using `BytesIO`.
        - **Base64 Encoding**: Encodes the SVG file content into a base64 string, making it suitable for embedding directly in HTML as a data URI.


## User Interaction with Parameters

We provide interactive controls for users to input the initial velocity and launch angle. 
These controls are rendered using custom JavaScript components:

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
    rxjs.debounceTime(50)
)
</js-cell>

## Displaying the Reactive Plot

Finally, we display the generated plot by subscribing to the parameters observable and updating the image source 
accordingly:

<js-cell reactive="true">
display({
    tag: 'img',
    src: `data:image/svg+xml;base64,${plot(params.v0, params.angle0)}`
})
</js-cell>

<note level="hint">
There is no need to explicitly subscribe to the reactive variable **params** in the above cell. 
Since the cell is marked as reactive (note the <i class="fas fa-bolt"></i> icon on the cell's top-right corner),
it automatically subscribes to **params** and the cell is re-executed whenever the parameters update, reflecting the
latest values.
</note>

