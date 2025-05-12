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
} from 'rxjs'
import { Output, ExecCellError, Scope } from './state'
import { InterpreterApi } from './interpreter-cell-view'

/**
 * Represents the minimal required interface from a backend's client provided by py-youwol.
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
