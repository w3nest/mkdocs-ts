import {
    combineLatest,
    from,
    map,
    Observable,
    ReplaySubject,
    Subject,
    switchMap,
    takeUntil,
    tap,
    shareReplay,
    filter,
} from 'rxjs'
import { Output, ExecCellError, Scope } from './state'
import { InterpreterApi } from './interpreter-cell-view'
import { CdnEvent, installViewsModule } from '@w3nest/webpm-client'
import { Views } from '.'
import { AnyVirtualDOM } from 'rx-vdom'
import type { InstallView } from '@w3nest/webpm-client/views'

/**
 * This helper function is used to install and configure an interpreter
 * (a backend such as e.g. `cpprun_backend`) for use with {@link InterpreterCellView}.
 * It can optionally display the installation progress in a cell output and/or as a notification.
 *
 * @param _p Configuration object.
 * @param _p.backend The backend module identifier, including its semantic version range.
 *   Example: `'cpprun_backend#^0.1.0'`.
 * @param _p.buildWith (Optional) Build configuration for the interpreter.
 *   The format and keys depend on the specific interpreter's (see interpreter documentation).
 * @param _p.display (Optional) A callback used to render the installation UI in the cell output.
 *   Receives a virtual DOM view as an argument. Typically the cell's `display` function.
 * @param _p.notification (Optional) If `true`, displays installation progress as a notification.
 *
 * @returns A `Promise` that resolves to the installed interpreter client.
 *
 */
export async function installInterpreter({
    backend,
    buildWith,
    display,
    notification,
}: {
    backend: string
    buildWith?: Record<string, string>
    display?: (v: AnyVirtualDOM) => void
    notification?: boolean
}): Promise<BackendClient> {
    const { installWithUI } = await installViewsModule()

    const uid = `interpret_${String(Math.floor(Math.random() * 1e6))}`
    const name = backend.split('#')[0]

    const notifyInstall = (view: InstallView) => {
        const done$ = view.eventsMgr.event$.pipe(
            filter((ev: CdnEvent) => ev.step === 'InstallDoneEvent'),
        )
        Views.notify({
            level: 'warning',
            content: {
                tag: 'div',
                children: [
                    {
                        tag: 'div',
                        class: 'w-100 text-center my-1',
                        style: {
                            fontSize: '1.0rem',
                            fontWeight: 'bolder',
                        },
                        children: [
                            {
                                tag: 'div',
                                class: 'ms-1',
                                innerHTML: `Installing interpreter <i>${name} </i>`,
                            },
                        ],
                    },
                    view,
                ],
            },
            done$,
        })
    }
    const scope = (await installWithUI({
        backends: {
            modules: [`${backend} as ${uid}`],
            configurations: {
                [name]: {
                    build: buildWith ?? {},
                },
            },
        },
        display: (view: InstallView) => {
            if (display) {
                display(view)
            }
            if (notification) {
                notifyInstall(view)
            }
        },
    })) as unknown as { [uid]: BackendClient }
    return scope[uid]
}
/**
 * Represents the minimal required interface from a backend's client provided W3Nest.
 */
export interface BackendClient {
    /**
     * Standard `fetch` transformed to json.
     *
     * @param url URL.
     * @param options Fetch options.
     */
    fetchJson(url: string, options: unknown): Promise<unknown>
    /**
     * Rxjs `fromFetch` transformed to json.
     *
     * @param url URL.
     * @param options Fetch options.
     */
    fromFetchJson(url: string, options: unknown): Observable<unknown>
}

type RunBody = InterpreterApi['body']

type RunResponse = InterpreterApi['response']

export async function executeInterpreter({
    body,
    interpreter,
    scope,
    output$,
    error$,
}: {
    body: RunBody
    interpreter: BackendClient
    scope: Scope
    output$: Subject<Output>
    error$: Subject<ExecCellError | undefined>
}) {
    const resp: RunResponse = (await interpreter.fetchJson(`/run`, {
        method: 'post',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    })) as RunResponse

    output$.next({
        tag: 'pre',
        style: { maxHeight: '50vh' },
        class: 'overflow-auto',
        innerText: resp.output,
    })
    if (resp.error) {
        console.error('Run time exec failure', {
            error: resp.error,
        })
        const error = {
            ...resp.error,
            src: body.code.split('\n'),
            scopeIn: scope,
        }
        error$.next(error)
        throw Error(error.message)
    }
    return {
        ...scope,
        const: {
            ...scope.const,
            ...resp.capturedOut,
        },
    }
}

export function executeInterpreter$({
    body,
    interpreter,
    scope,
    output$,
    error$,
    invalidated$,
}: {
    body: RunBody
    interpreter: BackendClient
    scope: Scope
    output$: Subject<Output>
    error$: Subject<ExecCellError | undefined>
    invalidated$: Observable<unknown>
}) {
    const reactives: [string, Observable<unknown>][] = Object.entries(
        body.capturedIn,
    )
        .filter(([, v]) => v instanceof Observable || v instanceof Promise)
        .map(([k, v]: [string, Promise<unknown> | Observable<unknown>]) => [
            k,
            v instanceof Promise ? from(v) : v,
        ])

    const capturedOut$: Record<
        string,
        ReplaySubject<unknown>
    > = body.capturedOut
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
        ([, v]) => v,
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
                    body.capturedIn,
                )
            }),
            switchMap((capturedIn) => {
                const body$ = { ...body, capturedIn }
                return interpreter.fromFetchJson(`/run`, {
                    method: 'post',
                    body: JSON.stringify(body$),
                    headers: { 'Content-Type': 'application/json' },
                }) as Observable<RunResponse>
            }),
            tap((resp) => {
                output$.next(undefined)
                output$.next({
                    tag: 'pre',
                    style: { maxHeight: '50vh' },
                    class: 'overflow-auto',
                    innerText: resp.output,
                })
                if (resp.error) {
                    const error = {
                        ...resp.error,
                        src: body.code.split('\n'),
                        scopeIn: scope,
                    }
                    error$.next(error)
                    throw Error(error.message)
                }
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
        )
        .subscribe((resp) => {
            if (!resp.error) {
                Object.entries(resp.capturedOut).forEach(([k, v]) => {
                    capturedOut$[k].next(v)
                })
            }
        })

    return {
        ...scope,
        const: {
            ...scope.const,
            ...capturedOut$,
        },
    }
}
