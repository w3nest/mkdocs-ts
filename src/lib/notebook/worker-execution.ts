import {
    combineLatest,
    filter,
    from,
    lastValueFrom,
    map,
    Observable,
    ReplaySubject,
    switchMap,
    takeUntil,
} from 'rxjs'
import { Scope } from './state'
import { type WorkersPoolTypes } from '@w3nest/webpm-client'
import { shareReplay } from 'rxjs/operators'
import { ExecInput } from './execution-common'
import { ContextTrait, NoContext } from '../context'

/**
 * Represents the inputs when executing a Workers Pool cell.
 */
export type ExecWorkerPoolInput = ExecInput & {
    /**
     * Captured inputs. Keys are variable name and values associated value.
     */
    capturedIn: Record<string, unknown>
    /**
     * Names of captured output variables.
     */
    capturedOut: string[]
    /**
     * The worker pool in which the execution is scheduled.
     */
    workersPool: WorkersPoolTypes.WorkersPool
    /**
     * If `javascript`, the script is interpreted directly, if `python` the script is interpreted through pyodide.
     */
    mode: 'javascript' | 'python'
}

/**
 * Execute a given JavaScript or Python snippet within a workers pool.
 *
 * This implementation is for non-reactive cells, see {@link executeWorkersPool$} for reactive cells.
 *
 * **Functionality**
 *
 *
 * @param inputs  See {@link ExecWorkerPoolInput}.
 * @param ctx Execution context used for logging and tracing.
 * @returns Promise over the scope at exit.
 */
export async function executeWorkersPool(
    inputs: ExecWorkerPoolInput,
    ctx?: ContextTrait,
): Promise<Scope> {
    ctx = (ctx ?? new NoContext()).start('executeWorkersPool', ['Exec'])
    const {
        src,
        cellId,
        error$,
        invalidated$,
        mode,
        workersPool,
        scope,
        capturedIn,
        capturedOut,
    } = inputs
    const srcPatched =
        mode === 'javascript'
            ? patchSrc({
                  src,
                  capturedOut,
                  capturedIn: Object.keys(capturedIn),
              })
            : patchPySrc({ src, capturedOut })

    ctx.info('Inputs prepared', { srcPatched, capturedIn, capturedOut })
    // eslint-disable-next-line @typescript-eslint/no-implied-eval,@typescript-eslint/no-unsafe-call
    const task = new Function(srcPatched)() as (
        input: WorkersPoolTypes.EntryPointArguments<Record<string, unknown>>,
    ) => void

    const r$ = workersPool
        .schedule({
            title: 'Test',
            entryPoint: task,
            args: capturedIn,
        })
        .pipe(takeUntil(invalidated$))

    r$.pipe(
        filter((message: WorkersPoolTypes.Message) => message.type === 'Log'),
    ).subscribe((message) => {
        ctx.info(message.data.text, message.data.json)
    })
    const lastMessage = await lastValueFrom(r$)
    if (lastMessage.type === 'Exit' && lastMessage.data.error) {
        error$.next({
            cellId,
            kind: 'Runtime',
            message: lastMessage.data.result.message,
            stackTrace: lastMessage.data.result.stack?.split('\n'),
            src: src.split('\n'),
            scopeIn: scope,
        })
        throw Error(lastMessage.data.result.message)
    }
    ctx.info('Task exited successfully')
    const data = lastMessage.data as WorkersPoolTypes.MessageExit
    const results = typeof data.result === 'object' ? data.result : {}
    ctx.exit()
    return {
        let: scope.let,
        const: { ...scope.const, ...results },
        python: scope.python,
    }
}

/**
 * Executes a reactive JavaScript or Python cell within a worker pool.
 *
 * This function is a wrapper around {@link executeWorkersPool}, enabling the execution of computations
 * in worker threads with automatic handling of reactive inputs and outputs.
 *
 * @param inputs See {@link ExecWorkerPoolInput}.
 * @param ctx Execution context used for logging and tracing.
 * @returns A `Promise` resolving to an updated execution scope, with `capturedOut` variables exposed as `const`
 * properties.
 */
export function executeWorkersPool$(
    inputs: ExecWorkerPoolInput,
    ctx?: ContextTrait,
): Promise<Scope> {
    ctx = (ctx ?? new NoContext()).start('executeWorkersPool$', ['Exec'])
    const { scope, capturedIn, capturedOut, invalidated$ } = inputs
    const reactives: [string, Observable<unknown>][] = Object.entries(
        capturedIn,
    )
        .filter(([, v]) => v instanceof Observable || v instanceof Promise)
        .map(([k, v]: [string, Promise<unknown> | Observable<unknown>]) => [
            k,
            v instanceof Promise ? from(v) : v,
        ])

    const capturedOut$: Record<string, ReplaySubject<unknown>> = capturedOut
        .map((k) => {
            return [k, new ReplaySubject()]
        })
        .reduce(
            (acc, [k, v]: [string, ReplaySubject<unknown>]) => ({
                ...acc,
                [k]: v,
            }),
            {},
        )
    const inputs$: Observable<unknown>[] = reactives.map(
        ([, v]) => v,
    ) as unknown as Observable<unknown>[]

    combineLatest(inputs$)
        .pipe(
            takeUntil(invalidated$),
            map((vs: unknown[]) => {
                return vs.reduce(
                    (acc: object, e, currentIndex) => ({
                        ...acc,
                        [reactives[currentIndex][0]]: e,
                    }),
                    capturedIn,
                ) as Record<string, unknown>
            }),
            switchMap((capturedIn) => {
                return from(executeWorkersPool({ ...inputs, capturedIn }, ctx))
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
        )
        .subscribe((scopeOut) => {
            inputs.capturedOut.forEach((k) => {
                capturedOut$[k].next(scopeOut.const[k])
            })
            ctx.exit()
        })
    return Promise.resolve({
        ...scope,
        const: {
            ...scope.const,
            ...capturedOut$,
        },
    })
}

function patchSrc({
    src,
    capturedIn,
    capturedOut,
}: {
    src: string
    capturedIn: string[]
    capturedOut: string[]
}) {
    const footer = capturedOut.reduce((acc, e) => `${acc} ${e},`, '')
    const header = capturedIn.reduce((acc, e) => `${acc} ${e},`, '')
    return `return ({args, workerScope}) => { 
        const {${header}} = args
        // Start user script
        ${src}
        // End user script
        
        return {${footer}}
    }`
}

function patchPySrc({
    src,
    capturedOut,
}: {
    src: string
    capturedOut: string[]
}) {
    const footer = capturedOut.reduce((acc, e) => `${acc} "${e}": ${e},`, '')

    return `return async ({args, workerScope}) => {
        const pyNamespace = workerScope.pyNamespace || pyodide.globals.get('dict')()
        // args is the input captured variables
        Object.entries(args).forEach(([k, v]) => {
            pyNamespace.set(k, v)
        })
        const outScope = await pyodide.runPythonAsync(\`
# Start user code    
${src}
# End user code

{${footer}}

\`, { globals: pyNamespace} )
        workerScope.pyNamespace = pyNamespace
        return outScope.toJs({dict_converter:  Object.fromEntries})
}`
}
