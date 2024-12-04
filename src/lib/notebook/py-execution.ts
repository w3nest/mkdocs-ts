import { Observable, Subject } from 'rxjs'
import { display, DisplayFactory } from './display-utils'
import { Output, Scope } from './state'
import { extractKeys } from './js-execution'

export interface PyodideNamespace {
    get: (key: string) => unknown
}
export interface Pyodide {
    globals: { get: (key: string) => () => PyodideNamespace }
    runPython: (code: string) => unknown
    registerJsModule: (name: string, mdle: unknown) => void
}

function registerMknbModule(pyodide: Pyodide) {
    const isRegistered = pyodide.runPython(
        `import sys\n'mknb' in sys.modules`,
    ) as boolean
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

function registerMknbCellModule(
    pyodide: Pyodide,
    displayInOutput: (...element: HTMLElement[]) => void,
    scope: Scope,
) {
    pyodide.runPython(`
import sys
if 'mknb_cell' in sys.modules:
    del sys.modules['mknb_cell']    
    `)
    pyodide.registerJsModule('mknb_cell', {
        display: (...element: HTMLElement[]) => {
            displayInOutput(...element)
        },
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
 * @param _args.displayFactory Factory to display HTML elements when `display` is called.
 * @param _args.invalidated$ Observable that emits when the associated cell is invalidated.
 * @param _args.pyNamespace Namespace holding pyodide globals.
 * @returns Promise over the scope at exit
 */
export async function executePy({
    src,
    scope,
    output$,
    displayFactory,
    invalidated$,
    pyNamespace,
}: {
    src: string
    scope: Scope
    output$: Subject<Output>
    displayFactory: DisplayFactory
    invalidated$: Observable<unknown>
    pyNamespace: PyodideNamespace
}) {
    const pyodide = scope.const.pyodide as Pyodide
    registerMknbModule(pyodide)

    const displayInOutput = (...element: HTMLElement[]) => {
        display(output$, displayFactory, ...element)
    }
    registerMknbCellModule(pyodide, displayInOutput, scope)

    const pyHeader = [...Object.keys(scope.let), ...Object.keys(scope.const)]
        .filter((k) => !['pyodide'].includes(k))
        .reduce((acc, k) => {
            return `${acc}\nif hasattr(${k}, 'to_py'):\n\t${k}=${k}.to_py()\n`
        }, '')

    const footer = `
return pyScope.toJs({dict_converter:  Object.fromEntries})
    `
    const wrapped = `const pyScope = await scope.const.pyodide.runPythonAsync(\`
from mknb_cell import display, ${extractKeys(scope.let)} ${extractKeys(scope.const).slice(0, -1)}
from mknb import pyFctWrapperJs
${pyHeader}
initial_globals = list(globals().keys())
${src}
final_globals = list(globals().keys())
new_globals = [k for k in final_globals if k not in initial_globals]

python_scope = { k: pyFctWrapperJs(globals()[k]) for k in new_globals if callable(globals()[k])}
python_scope
\`, { globals: pyNamespace} )`

    const srcPatched = `
return async (scope, {display, output$, invalidated$, pyNamespace}) => {

    // header
const {${extractKeys(scope.const)}} = scope.const
let {${extractKeys(scope.let)}} = scope.let

${wrapped}
    // footer
${footer}
}
    `
    // eslint-disable-next-line @typescript-eslint/no-implied-eval,@typescript-eslint/no-unsafe-call
    const pyScopeOut = (await new Function(srcPatched)()(scope, {
        display: displayInOutput,
        invalidated$,
        output$,
        pyNamespace,
    })) as Record<string, unknown>
    const scopeOut = {
        let: scope.let,
        const: scope.const,
        python: { ...scope.python, ...pyScopeOut },
    }
    console.log('Py cell execution done', { src, scopeIn: scope, scopeOut })
    return scopeOut
}
