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
} from 'rxjs'
import { shareReplay } from 'rxjs/operators'
import { AnyVirtualDOM } from '@youwol/rx-vdom'
import { Scope } from './state'

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

/**
 * Represents the body of the `/run` endpoint.
 */

export interface RunBody {
    /**
     * ID of the cell run.
     */
    cellId: string
    /**
     * ID of the previous cell, it allows recovering the proper scope.
     */
    fromCellId: string
    /**
     * The code to run.
     */
    code: string
    /**
     * Input variables to capture:
     * *  keys are variable's name
     * *  values are their associated value, they must be serializable as JSON object.
     */
    capturedIn: { [k: string]: unknown }
    /**
     * Output variables to capture.
     */
    capturedOut: string[]
}

/**
 * Represents the response of the `/run` endpoint.
 */

export interface RunResponse {
    /**
     * Output variables captured:
     * *  keys are variable's name
     * *  values are their associated value, they must be serializable as JSON object.
     */
    capturedOut: { [k: string]: unknown }
    /**
     * Error if any.
     */
    error: string
    /**
     * Standard output generated during the run.
     */
    output: string
}

export async function executeInterpreter({
    body,
    interpreter,
    scope,
    output$,
}: {
    body: RunBody
    interpreter: BackendClient
    scope: Scope
    output$: Subject<AnyVirtualDOM>
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
        textContent: resp.output,
    })
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
    invalidated$,
}: {
    body: RunBody
    interpreter: BackendClient
    scope: Scope
    output$: Subject<AnyVirtualDOM>
    invalidated$: Observable<unknown>
}) {
    const reactives: [string, Observable<unknown>][] = Object.entries(
        body.capturedIn,
    )
        .filter(([_, v]) => v instanceof Observable || v instanceof Promise)
        .map(([k, v]: [string, Promise<unknown> | Observable<unknown>]) => [
            k,
            v instanceof Promise ? from(v) : v,
        ])

    const capturedOut$ = body.capturedOut
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
                    body.capturedIn,
                )
            }),
            switchMap((capturedIn) => {
                const body$ = { ...body, capturedIn }
                return interpreter.fromFetchJson(`/run`, {
                    method: 'post',
                    body: JSON.stringify(body$),
                    headers: { 'Content-Type': 'application/json' },
                })
            }),
            tap((resp) => {
                output$.next(undefined)
                output$.next({
                    tag: 'pre',
                    style: { maxHeight: '50vh' },
                    class: 'overflow-auto',
                    textContent: resp['output'],
                })
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
        )
        .subscribe((resp) => {
            Object.entries(resp['capturedOut']).forEach(([k, v]) => {
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
