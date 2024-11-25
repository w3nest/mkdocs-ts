import {
    combineLatest,
    from,
    last,
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

/**
 * Execute a given JavaScript or Python statement within a workers' pool.
 * This is only for non-reactive cells.
 *
 * @param _args
 * @param _args.src The source to execute.
 * @param _args.mode The script's language.
 * @param _args.scope The entering scope.
 * @param _args.workersPool The workers' pool.
 * @param _args.capturedIn Variable's names captured from the main thread and forwarded to the worker.
 * @param _args.capturedOut Variable's names captured from the worker and forwarded to the main thread.
 * @returns Promise over the scope at exit.
 */
export async function executeWorkersPool({
    src,
    mode,
    workersPool,
    scope,
    capturedIn,
    capturedOut,
}: {
    src: string
    mode: 'javascript' | 'python'
    workersPool: WorkersPoolTypes.WorkersPool
    scope: Scope
    capturedIn: { [_k: string]: unknown }
    capturedOut: string[]
}): Promise<Scope> {
    const srcPatched =
        mode === 'javascript'
            ? patchSrc({
                  src,
                  capturedOut,
                  capturedIn: Object.keys(capturedIn),
              })
            : patchPySrc({ src, capturedOut })

    const task = new Function(srcPatched)()

    const r$ = workersPool.schedule({
        title: 'Test',
        entryPoint: task,
        args: capturedIn,
    })

    const lastMessage = await lastValueFrom(r$)
    return {
        let: scope.let,
        const: { ...scope.const, ...lastMessage.data['result'] },
        python: scope.python,
    }
}

/**
 * Execute a given JavaScript or Python statement within a workers' pool.
 * This is only for reactive cells.
 *
 * @param _args
 * @param _args.src The source to execute.
 * @param _args.mode The script's language.
 * @param _args.scope The entering scope.
 * @param _args.workersPool The workers' pool.
 * @param _args.capturedIn Variable's names captured from the main thread and forwarded to the worker.
 * @param _args.capturedOut Variable's names captured from the worker and forwarded to the main thread.
 * @param _args.invalidated$ Observable that emits when the associated cell is invalidated.
 * @returns Promise over the scope at exit.
 */
export async function executeWorkersPool$({
    src,
    mode,
    workersPool,
    scope,
    capturedIn,
    capturedOut,
    invalidated$,
}: {
    src: string
    mode: 'javascript' | 'python'
    workersPool: WorkersPoolTypes.WorkersPool
    scope: Scope
    capturedIn: { [_k: string]: unknown }
    capturedOut: string[]
    invalidated$: Observable<unknown>
}): Promise<Scope> {
    const reactives: [string, Observable<unknown>][] = Object.entries(
        capturedIn,
    )
        .filter(([_, v]) => v instanceof Observable || v instanceof Promise)
        .map(([k, v]: [string, Promise<unknown> | Observable<unknown>]) => [
            k,
            v instanceof Promise ? from(v) : v,
        ])

    const capturedOut$ = capturedOut
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
    const inputs: Observable<unknown>[] = reactives.map(
        ([_, v]) => v,
    ) as unknown as Observable<unknown>[]

    combineLatest(inputs)
        .pipe(
            takeUntil(invalidated$),
            map((vs: unknown[]) => {
                return vs.reduce(
                    (acc: object, e, currentIndex) => ({
                        ...acc,
                        [reactives[currentIndex][0]]: e,
                    }),
                    capturedIn,
                )
            }),
            switchMap((capturedIn) => {
                const srcPatched =
                    mode === 'javascript'
                        ? patchSrc({
                              src,
                              capturedOut,
                              capturedIn: Object.keys(capturedIn),
                          })
                        : patchPySrc({ src, capturedOut })
                const task = new Function(srcPatched)()
                return workersPool
                    .schedule({
                        title: 'Test',
                        entryPoint: task,
                        args: capturedIn,
                    })
                    .pipe(last())
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
        )
        .subscribe((resp) => {
            Object.entries(resp.data['result']).forEach(([k, v]) => {
                capturedOut$[k].next(v)
            })
        })
    return {
        ...scope,
        const: {
            ...scope.const,
            ...capturedOut$,
        },
    }
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
