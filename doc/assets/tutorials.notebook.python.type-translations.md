
# Type Translations


Let's first install the python environment:

<js-cell>
const { pyodide, rxjs } = await webpm.install({
    esm:['rxjs#^7.5.6 as rxjs' ],
    pyodide: {
        version: "{{pyodide-version}}",
    },
    display
})
</js-cell>

## Variables Sanitizing


**Keywords and special Characters**

* Another special case comes from the fact that Python reserved words cannot be used as attributes. For instance

## Python Variable Lifecycles

<py-cell>
from pyodide.ffi import create_proxy, create_once_callable

# rxjs.timer(1000).subscribe( lambda v: display(v) )
</py-cell>


<py-cell>
from pyodide.ffi import create_proxy, create_once_callable

display_proxy = create_proxy(lambda v: display(v))
rxjs.timer(0,1000).pipe(
    rxjs.takeUntil(invalidated_),
    rxjs.take(5)
).subscribe(display_proxy)

# proxy.destroy() is automatically managed when the cell is invalidated
# This is only for variables declared in the root scope.
</py-cell>


## Consuming JavaScript in Python

<js-cell>
let primitive = 5
let objJs = { a: 7, b : 2}
let listJs = ["hello", "world"]

class Object{
    constructor(a, b){
        this.a = a
        this.b = b
    }
    string(){
        return `a=${this.a} b=${this.b}`
    }
}
let instance = new Object(7, 2)
</js-cell>

Within python cells:
*  **primitives** type are translated to their python equivalent.
*  **non-primitives** type are translated into **proxy** to the original object. The **proxies** are essentially 
   manipulated as expected within python.

For instance:

<py-cell>

for n, s in zip(['primitive', 'objJs', 'listJs', 'instance'], [primitive, objJs, listJs, instance]):
    display(f"Is '{n}' proxied?", Views.mx1, hasattr(s, 'to_py'))


display("objJs.a:", objJs.a, Views.mx1, "objJs.b:",Views.mx1, objJs.b)

display("listJs to upper:",Views.mx1, *[i.upper() for i in listJs])

display("Instance:", Views.mx1, instance.string())
</py-cell>

### Functions

<js-cell>
const square = (x) => x * x 

const sumXYZ_Map = (obj) => {
    // by default obj will be translated in a proxy to Map, see next section 
    return obj.get('x') + obj.get('y') + obj.get('z')
}
const sumXYZ_Obj = (obj) => {
    // keyword argument are provided a proxy to JS object (gathered and provided as last argument)
    return obj.x + obj.y + obj.z
}
</js-cell>

<py-cell>
display(str([square(x) for x in [1,2,3]]))

display(sumXYZ_Map({"x":1, "y":2, "z":3}))

display(sumXYZ_Obj(x=1, y=2, z=3))
</py-cell>


**Python Callback**

When using Python to define callbacks, a common issue related to the lifecycle is encountered:

<py-cell>
from pyodide.ffi import create_proxy, create_once_callable
""""
This does not work: the CB need to outlive cell execution
rxjs.timer(0,1000).subscribe( lambda v: display(v) )
"""

display_proxy = create_proxy(lambda v: display(v))
rxjs.timer(0,1000).pipe(
    rxjs.takeUntil(invalidated_),
    rxjs.take(5)
).subscribe(display_proxy)

# proxy.destroy() is automatically managed when the cell is invalidated
# This is only for variables declared in the root scope.
</py-cell>

A proxy needs to be explicitly defined, here `create_proxy`. A call to `proxy.destroy()` is not required in the notebook
environment for all proxies created in the top most scope, cell invalidation does trigger this for you. 


**Consuming JS callbacks in python**

<js-cell>
const time = () => new Date().toLocaleTimeString()
const displayJs = (e) => display(e)
</js-cell>


<py-cell>
from pyodide.ffi import create_proxy, create_once_callable

rxjs.timer(0,1000).pipe(
    rxjs.takeUntil(invalidated_),
    rxjs.map(time),
    rxjs.take(5)
).subscribe(displayJs)
</py-cell>


## Consuming Python in Javascript
