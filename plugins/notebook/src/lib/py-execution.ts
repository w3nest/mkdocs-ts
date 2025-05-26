import { display } from './display-utils'
import { ExecCellError, Scope } from './state'
import { ExecInput, indent } from './execution-common'
import { ContextTrait, NoContext } from 'mkdocs-ts'
import { Observable, Subject, take } from 'rxjs'

export interface PyodideNamespace {
    get: (key: string) => unknown
    set: (key: string, v: unknown) => void
}
export interface Pyodide {
    globals: { get: (key: string) => () => PyodideNamespace }
    runPython: (code: string) => unknown
    registerJsModule: (name: string, mdle: unknown) => void
}

/**
 * Definition of a Pyodide proxy.
 */
export interface PyodideProxy<T> {
    /**
     * Retrieve the translated type in JavaScript.
     */
    toJs(options: unknown): T
}

/**
 * Represents the inputs when executing a JavaScript snippet.
 */
export type ExecPyInput = ExecInput & {
    /**
     * Namespace holding pyodide globals.
     */
    pyNamespace: PyodideNamespace
}

export interface PythonAstException {
    type: 'SyntaxError' | 'IndentationError' | 'TabError'
    message: string
    stack: string
}

function registerMknbModule(pyodide: Pyodide) {
    const isRegistered = pyodide.runPython(
        `import sys\n'mknb' in sys.modules`,
    ) as boolean
    if (isRegistered) {
        return
    }
    pyodide.registerJsModule('mknb', {
        HandledException: pyodide.runPython(`
class HandledException(RuntimeError):    
    def __init__(self, message, original_exception=None):
        super().__init__(message)
        self.original_exception = original_exception

    def __str__(self):
        error_message = super().__str__()
        if self.original_exception:
            error_message += f" | Caused by: {repr(self.original_exception)}"
        return error_message

HandledException
`),
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

/**
 * Sanitizes JavaScript variable names to ensure compatibility with the Python environment:
 *
 * - **Unauthorized characters** (e.g., `$` in JavaScript) are replaced with an **underscore (`_`)**.
 * - **Python keywords** (e.g., `class`, `def`, `import`) are **suffixed with an underscore (`_`)** to avoid conflicts.
 *
 * This ensures seamless interoperability between JavaScript and Python when executing code in Pyodide.
 *
 * @param scope The input scope containing `const` and `let` variable mappings.
 * @param pyodide The Pyodide runtime instance, used to retrieve Python's reserved keywords.
 * @returns A new scope object with sanitized JavaScript variable names.
 */
export function fixScopeInvalidVar(scope: Scope, pyodide: Pyodide) {
    const kwlist = pyodide.runPython(
        'import keyword\nkeyword.kwlist',
    ) as string[]

    const fix = (input: string) => {
        return kwlist.includes(input) ? `${input}_` : input.replace(/\$/g, '_')
    }
    const scopeConst = Object.entries(scope.const).reduce((acc, [k, v]) => {
        return { ...acc, [fix(k)]: v }
    }, {})
    const scopeLet = Object.entries(scope.let).reduce((acc, [k, v]) => {
        return { ...acc, [fix(k)]: v }
    }, {})
    return { ...scope, const: scopeConst, let: scopeLet }
}

/**
 * Registers a **cell-specific Python module** under the name `mknb_cell_${cellId}` within Pyodide.
 *
 * It exposes:
 * - `display`: A function to send output elements to the JavaScript execution environment (see {@link display}).
 * - `invalidated_`: An observable that emits when the cell is invalidated. This can be used in Python to clean up resources.
 * - JavaScript Scope Variables:
 *   - All `let` and `const` variables from JavaScript are exposed as Python symbols.
 *   - Variable names may be adjusted to ensure they are valid Python identifiers (see {@link fixScopeInvalidVar}).
 *
 * @param _p
 * @param _p.cellId The unique identifier for the executing cell.
 * @param _p.pyodide The Pyodide instance used to execute Python code.
 * @param _p.displayInOutput Function to render output elements in JavaScript.
 * @param _p.invalidated$ An observable that emits when the cell is invalidated.
 * @param _p.error$ A subject to handle execution errors and propagate them to JavaScript.
 * @param _p.scope The execution scope, containing JavaScript variables (`const`, `let`).
 * @param _p.src The source code of the Python cell being executed.
 */
export function registerMknbCellModule({
    cellId,
    pyodide,
    displayInOutput,
    invalidated$,
    error$,
    scope,
    src,
}: {
    cellId: string
    pyodide: Pyodide
    displayInOutput: (...element: HTMLElement[]) => void
    invalidated$: Observable<unknown>
    error$: Subject<ExecCellError | undefined>
    scope: Scope
    src: string
}) {
    pyodide.runPython(`
import sys
if 'mknb_cell_${cellId}' in sys.modules:
    del sys.modules['mknb_cell_${cellId}']    
    `)
    pyodide.registerJsModule(`mknb_cell_${cellId}`, {
        display: (...element: HTMLElement[]) => {
            displayInOutput(...element)
        },
        emit_error: (e: PyodideProxy<Omit<ExecCellError, 'src'>>) => {
            const converted = e.toJs({ dict_converter: Object.fromEntries })
            error$.next({ ...converted, src: src.split('\n'), scopeIn: scope })
        },
        invalidated_: invalidated$,
        ...scope.let,
        ...scope.const,
    })
    return `mknb_cell_${cellId}`
}

function isDestroyable(v: unknown): v is { destroy: () => void } {
    return (
        ((v !== null && typeof v === 'object') || typeof v === 'function') &&
        'destroy' in v
    )
}
/**
 * Executes a given Python code snippet using Pyodide within a controlled execution scope.
 *
 * <note level="warning">
 * The Pyodide runtime must be provided via `scope.const.pyodide`.
 * </note>
 *
 * ## Scope Management
 *
 * - **Variable Persistence**:
 *   - Only **top-level variables** defined in the cell persist to subsequent Python cells.
 *   - **Primitive types** (e.g., `int`, `float`, `str`, `bool`) are re-initialized with each execution.
 *   - **Non-primitive objects** (e.g., lists, dictionaries, custom classes) are stored in `globals()`, meaning their
 *   state can be **modified** by later cells.
 *
 * - **JavaScript Integration**:
 *   - JavaScript variables declared as `const` or `let` in prior JS cells **can be accessed and mutated**.
 *   - However, **they cannot be reassigned** within Python execution.
 *   - See {@link registerMknbCellModule} for details on JavaScript-Python variable sharing (some variables may
 *   be renamed to comply with Python synthax).
 *
 * - **Predefined Symbols**:
 *   - The following symbols are scoped to the cell and automatically injected into the Python execution environment:
 *     - `display`: A function to render output in the notebook interface.
 *     - `invalidated_`: An observable that emits when the cell is invalidated.
 *
 * ## Execution Lifecycle
 *
 * - Upon execution, Python code runs within a **unified runtime**, where JavaScript and Python share state.
 * - When a cell is **invalidated** (e.g., re-executed or modified), all proxies of **Python objects exposed to
 *   JavaScript** are automatically **destroyed** to prevent memory leaks.
 *
 * @param inputs See {@link ExecPyInput}
 * @param ctx Execution context used for logging and tracing.
 * @returns Promise over the scope at exit
 */
export async function executePy(inputs: ExecPyInput, ctx?: ContextTrait) {
    ctx = (ctx ?? new NoContext()).start('executePy', ['Exec'])

    const {
        cellId,
        src,
        scope,
        output$,
        error$,
        displayFactory,
        invalidated$,
        pyNamespace,
    } = inputs

    const pyodide = scope.const.pyodide as Pyodide
    const sanitizedScope = fixScopeInvalidVar(scope, pyodide)
    ctx.info('Sanitized scope computed', { sanitizedScope })
    registerMknbModule(pyodide)

    const displayInOutput = (...element: HTMLElement[]) => {
        display(output$, displayFactory, ...element)
    }
    const pyCellModule = registerMknbCellModule({
        cellId,
        pyodide,
        displayInOutput,
        invalidated$,
        error$,
        scope: sanitizedScope,
        src,
    })

    const constKeys = Object.keys(sanitizedScope.const)
    const letKeys = Object.keys(sanitizedScope.let)
    Object.entries(scope.python).forEach(([k, v]) => {
        if (['string', 'number', 'boolean'].includes(typeof v)) {
            pyNamespace.set(k, v)
        }
    })
    const localsAssignments = Object.keys(scope.python).reduce(
        (acc, e) => `${acc}\n${e}=globals()['${e}']`,
        '',
    )
    const importsLet =
        letKeys.length > 0
            ? `from ${pyCellModule} import ${String(letKeys)}`
            : ''
    const importsConst =
        constKeys.length > 0
            ? `from ${pyCellModule} import ${String(constKeys)}`
            : ''

    const pyVarsCount = Object.keys(scope.python).length

    const srcPatched = `
return async (scope, { pyNamespace }) => {
    
    const pyScope = await scope.const.pyodide.runPythonAsync(\`
        from mknb import pyFctWrapperJs, HandledException
        import traceback
        
        try:
            def run():
                ${indent(localsAssignments, '                ')}
                from ${pyCellModule} import invalidated_, display
                ${importsLet}
                ${importsConst}
                
                initial_vars = { k: v for k, v in locals().items() }
                
                ${indent(src, '                ')}
            
                final_vars = { k: v for k, v in locals().items() }
                final_keys = final_vars.keys()
                new_vars = [k for k in final_keys if k not in initial_vars or initial_vars[k] is not final_vars[k] ]   
                new_scope = { k: final_vars[k] for k in new_vars}
                return new_scope, new_vars
            
            new_scope, new_vars = run()
            for k, v in new_scope.items():
                globals()[k] = v
                
        except Exception as e:
            from ${pyCellModule} import emit_error
            tb = traceback.extract_tb(e.__traceback__)
            for entry in reversed(tb):
                if entry.filename == "<exec>":
                    error_line = entry.lineno
                    break
            else:
                error_line = None
                
            tb_list = traceback.format_exception(type(e), e, e.__traceback__)
            emit_error({ 
                "kind": "Runtime", 
                "message": str(e), 
                "stackTrace": tb_list, 
                "lineNumber": error_line - 13 - ${String(pyVarsCount)}
            })
            raise HandledException("Handled error: " + str(e), original_exception=e)
            
        new_scope, new_vars
    \`, { globals: pyNamespace } )
    
    return pyScope.toJs({dict_converter:  Object.fromEntries})
}`
    try {
        ctx.info('Wrapped src defined', { wrappedSrc: srcPatched })

        // eslint-disable-next-line @typescript-eslint/no-implied-eval,@typescript-eslint/no-unsafe-call
        const [pyScopeOut, newGlobals] = (await new Function(srcPatched)()(
            scope,
            { pyNamespace },
        )) as [Record<string, unknown>, string[]]
        const scopeOut = {
            let: scope.let,
            const: scope.const,
            python: { ...scope.python, ...pyScopeOut },
        }
        ctx.info('Py cell execution done', {
            src,
            scopeIn: scope,
            scopeOut,
            newGlobals,
        })
        invalidated$.pipe(take(1)).subscribe(() => {
            ctx.info('Destroy py proxies', { scopeOut, newGlobals })
            Object.entries(scopeOut.python)
                .filter(([k]) => {
                    return newGlobals.includes(k)
                })
                .filter(([, v]) => isDestroyable(v))
                .forEach(([k, v]: [k: string, v: { destroy: () => void }]) => {
                    ctx.info(`Destroy py proxy ${k}`)
                    v.destroy()
                })
        })
        ctx.exit()
        return scopeOut
    } catch (e) {
        if (isInstanceofPyException(e)) {
            const error: ExecCellError = {
                cellId,
                kind: 'AST',
                src: src.split('\n'),
                message: e.message.split('\n').slice(-2)[0],
                stackTrace: e.stack.split('\n'),
                scopeIn: scope,
            }
            error$.next(error)
        }
        ctx.error('Failed to execute cell', e)
        ctx.exit()
        throw e
    }
}

function isInstanceofPyException(e: unknown): e is PythonAstException {
    return ['SyntaxError', 'IndentationError', 'TabError'].includes(
        (e as PythonAstException).type,
    )
}
