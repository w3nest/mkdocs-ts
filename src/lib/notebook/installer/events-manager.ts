import {
    CdnEvent,
    EsmEventType,
    PyEventType,
    AllEvents,
    ConsoleEvent,
    isEsmEvent,
    isPyEvent,
    BackendEventType,
    isBackendEvent,
    CssEventType,
    isCssEvent,
    LoadingGraphEventType,
    isLoadingGraphEvent,
} from '@w3nest/webpm-client'
import { filter, map, Observable, scan, take } from 'rxjs'

const pyModuleEvents = [
    'InstallPyModuleEvent',
    'PyModuleLoadedEvent',
    'PyModuleErrorEvent',
] as const
export type PyModuleEventType = (typeof pyModuleEvents)[number]
export type PyModuleEvent = AllEvents[PyModuleEventType]

function isPyModuleEvent(event: CdnEvent): event is PyModuleEvent {
    return pyModuleEvents.includes(event.step as PyModuleEventType)
}
const pyPyRuntimeEvents = [
    'FetchPyRuntimeEvent',
    'FetchedPyRuntimeEvent',
    'StartPyRuntimeEvent',
    'PyRuntimeReadyEvent',
] as const

export type PyRuntimeEventType = (typeof pyPyRuntimeEvents)[number]
export type PyRuntimeEvent = AllEvents[PyRuntimeEventType]

function isPyRuntimeEvent(event: CdnEvent): event is PyRuntimeEvent {
    return pyPyRuntimeEvents.includes(event.step as PyRuntimeEventType)
}

function isConsoleEvent(event: CdnEvent): event is ConsoleEvent {
    return event.step === 'ConsoleEvent'
}

const doneEvents = ['InstallDoneEvent', 'InstallErrorEvent'] as const
export type DoneEventType = (typeof doneEvents)[number]
export type DoneEvents = AllEvents[DoneEventType]

function isInstallDoneEvent(event: CdnEvent): event is DoneEvents {
    return doneEvents.includes(event.step as DoneEventType)
}

export class EventsManager {
    public readonly event$: Observable<CdnEvent>

    public readonly consoleEvent$: Observable<AllEvents['ConsoleEvent']>
    public readonly loadingGraphEvent$: Observable<
        AllEvents[LoadingGraphEventType]
    >
    public readonly esmEvent$: Observable<AllEvents[EsmEventType]>
    public readonly esmStore$: Observable<
        { name: string; version: string; url: string }[]
    >

    public readonly backendEvent$: Observable<AllEvents[BackendEventType]>
    public readonly backendsStore$: Observable<
        { name: string; version: string }[]
    >
    public readonly backendConsoleEvent$: Observable<
        AllEvents['ConsoleEvent'] & { component: 'Backend' }
    >

    public readonly pyEvent$: Observable<AllEvents[PyEventType]>
    public readonly pyRuntimeEvent$: Observable<AllEvents[PyRuntimeEventType]>
    public readonly pyModuleEvent$: Observable<AllEvents[PyModuleEventType]>
    public readonly pyModulesStore$: Observable<string[]>
    public readonly pyConsoleEvent$: Observable<
        AllEvents['ConsoleEvent'] & { component: 'Python' }
    >

    public readonly cssEvent$: Observable<AllEvents[CssEventType]>
    public readonly cssStyleSheetStore$: Observable<
        { name: string; version: string; url: string }[]
    >
    public readonly cssConsoleEvent$: Observable<
        AllEvents['ConsoleEvent'] & { component: 'CSS' }
    >
    public readonly installDoneEvent$: Observable<AllEvents[DoneEventType]>

    constructor(params: { event$: Observable<CdnEvent> }) {
        const scanCbNameVersion = <T extends { name: string; version: string }>(
            acc: T[],
            e: T,
        ) => {
            return acc.some(
                (prev) => prev.name === e.name && prev.version === e.version,
            )
                ? acc
                : [...acc, e]
        }
        const scanCbUrl = <T extends { url: string }>(acc: T[], e: T) => {
            return acc.some((prev) => prev.url === e.url) ? acc : [...acc, e]
        }

        this.event$ = params.event$
        this.consoleEvent$ = params.event$.pipe(filter(isConsoleEvent))
        this.loadingGraphEvent$ = this.event$.pipe(filter(isLoadingGraphEvent))
        this.esmEvent$ = this.event$.pipe(filter(isEsmEvent))
        this.esmStore$ = this.esmEvent$.pipe(
            map((ev) => ({
                name: ev.targetName,
                url: ev.url,
                version: ev.version,
            })),
            scan(
                scanCbUrl,
                [] as { name: string; version: string; url: string }[],
            ),
        )

        this.backendEvent$ = this.event$.pipe(filter(isBackendEvent))
        this.backendsStore$ = this.backendEvent$.pipe(
            map((ev) => ({ name: ev.name, version: ev.version })),
            scan(scanCbNameVersion, [] as { name: string; version: string }[]),
        )

        this.pyEvent$ = this.event$.pipe(filter(isPyEvent))
        this.pyRuntimeEvent$ = this.event$.pipe(filter(isPyRuntimeEvent))
        this.pyModuleEvent$ = this.event$.pipe(filter(isPyModuleEvent))
        this.pyModulesStore$ = this.pyModuleEvent$.pipe(
            map((ev) => ev.name),
            scan(
                (acc, e) => (acc.includes(e) ? acc : [...acc, e]),
                [] as string[],
            ),
        )

        this.cssEvent$ = this.event$.pipe(filter(isCssEvent))
        this.cssStyleSheetStore$ = this.cssEvent$.pipe(
            map((ev) => ({
                name: ev.targetName,
                version: ev.version,
                url: ev.url,
            })),
            scan(
                scanCbUrl,
                [] as { name: string; version: string; url: string }[],
            ),
        )
        this.installDoneEvent$ = this.event$.pipe(
            filter(isInstallDoneEvent),
            take(1),
        )
    }
}
