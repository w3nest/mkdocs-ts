import { Observable, Subject } from 'rxjs'
import { display } from './display-utils'
import { Scope } from './state'
import { AnyVirtualDOM } from '@youwol/rx-vdom'
import { extractKeys } from './js-execution'

function registerMknbModule(pyodide) {
    const isRegistered = pyodide.runPython(`import sys\n'mknb' in sys.modules`)
    if (isRegistered) {
        return
    }
    pyodide.registerJsModule('mknb', {
        pyFctWrapperJs: pyodide.runPython(`
def wrapper(target_func):
    def inner_wrapper(*args, **kwargs):
        # Convert attributes using 'to_py' if available
        converted_args = [arg.to_py() if hasattr(arg, 'to_py') else arg for arg in args]
        converted_kwargs = {key: value.to_py() if hasattr(value, 'to_py') else value for key, value in kwargs.items()}
        
        # Forward the call to the target function with converted attributes
        return target_func(*converted_args, **converted_kwargs)
    
    return inner_wrapper
    
wrapper
`),
    })
}

function registerMknbCellModule(pyodide, displayInOutput, scope) {
    pyodide.runPython(`
import sys
if 'mknb_cell' in sys.modules:
    del sys.modules['mknb_cell']    
    `)
    pyodide['registerJsModule']('mknb_cell', {
        display: (e) => displayInOutput(e),
        ...scope.let,
        ...scope.const,
    })
}
/**
 * Execute a given python source content.
 *
 * @param _args
 * @param _args.src The source to execute.
 * @param _args.scope The entering scope.
 * @param _args.output$ Subject in which output views are sent (when using `display` function).
 * @param _args.invalidated$ Observable that emits when the associated cell is invalidated.
 * @returns Promise over the scope at exit
 */
export async function executePy({
    src,
    scope,
    output$,
    invalidated$,
}: {
    src: string
    scope: Scope
    output$: Subject<AnyVirtualDOM>
    invalidated$: Observable<unknown>
}) {
    const pyodide = scope.const.pyodide
    registerMknbModule(pyodide)

    const displayInOutput = (element: HTMLElement) => display(element, output$)
    registerMknbCellModule(pyodide, displayInOutput, scope)

    const pyHeader = [...Object.keys(scope.let), ...Object.keys(scope.const)]
        .filter((k) => !['pyodide'].includes(k))
        .reduce((acc, k) => {
            return `${acc}\nif hasattr(${k}, 'to_py'):\n\t${k}=${k}.to_py()\n`
        }, '')

    const footer = `
return { 
    const:{ ${extractKeys(scope.const)} },
    let:{ ${extractKeys(scope.let)} },
    python: pyScope.toJs({dict_converter:  Object.fromEntries})
}
    `
    const wrapped = `const pyScope = await scope.const.pyodide.runPythonAsync(\`
from mknb_cell import display, ${extractKeys(scope.let)} ${extractKeys(scope.const).slice(0, -1)}
from mknb import pyFctWrapperJs
${pyHeader}
${src}
    
{ k: pyFctWrapperJs(v) for k, v in globals().items() if not k.startswith('__') and k not in ['display'] and callable(v)}
\`)`

    const srcPatched = `
return async (scope, {display, output$, invalidated$}) => {

    // header
const {${extractKeys(scope.const)}} = scope.const
let {${extractKeys(scope.let)}} = scope.let

${wrapped}
    // footer
${footer}
}
    `
    return await new Function(srcPatched)()(scope, {
        display: displayInOutput,
        invalidated$,
        output$,
    })
}
