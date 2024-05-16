# Python utilities

This pages includes python utilities.

<js-cell>
const pyodide = window['pyodide']
</js-cell>



<py-cell>
import io
import base64
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas

def plt_to_svg(fig):
    canvas = FigureCanvas(fig)
    canvas.draw()
    png_output = io.BytesIO()
    plt.savefig(png_output, format='png')
    plt.close(fig)
    png_output.seek(0)
    return base64.b64encode(png_output.getvalue()).decode('ascii')

</py-cell>
