import { ChildrenLike, sync$, VirtualDOM } from 'rx-vdom'
import { EventsManager } from './events-manager'
import { filter, map } from 'rxjs'
import { shareReplay } from 'rxjs/operators'
import { ItemView, Phase, PhaseStatus } from './common.view'
import {
    CdnEvent,
    DownloadBackendEvent,
    StartBackendEvent,
    InstallBackendEvent,
} from '@w3nest/webpm-client'

function isBackendDownloadEvent(
    event: CdnEvent,
): event is DownloadBackendEvent {
    return event.step === 'DownloadBackendEvent'
}
function isBackendInstallEvent(event: CdnEvent): event is InstallBackendEvent {
    return event.step === 'InstallBackendEvent'
}
function isBackendStartEvent(event: CdnEvent): event is StartBackendEvent {
    return event.step === 'StartBackendEvent'
}

/**
 * Represents the view gathering events w/ backend installation; each event being displayed using {@link BackendView}.
 */
export class BackendEventsView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-BackendEventsView'

    public readonly tag = 'div'
    public readonly class = BackendEventsView.CssSelector
    public readonly children: ChildrenLike
    constructor(state: EventsManager) {
        this.children = sync$({
            policy: 'sync',
            source$: state.backendsStore$,
            vdomMap: ({ name, version }) => {
                return new BackendView({
                    name,
                    version,
                    state,
                })
            },
        })
    }
}
/**
 * The view for backend events targeting a specific backend.
 * It uses {@link ItemView} with `download`, `install` & `start` phases.
 */
class BackendView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-BackendView'
    public readonly tag = 'div'
    public readonly class = BackendView.CssSelector
    public readonly children: ChildrenLike

    constructor({
        name,
        version,
        state,
    }: {
        name: string
        version: string
        state: EventsManager
    }) {
        const itemEvent$ = state.backendEvent$.pipe(
            filter((ev) => ev.name === name && ev.version === version),
            shareReplay({ refCount: true }),
        )
        const downloadEvent$ = itemEvent$.pipe(filter(isBackendDownloadEvent))
        const installEvent$ = itemEvent$.pipe(filter(isBackendInstallEvent))
        const startEvent$ = itemEvent$.pipe(filter(isBackendStartEvent))

        const phases: Phase[] = [
            {
                source$: downloadEvent$.pipe(
                    map((ev) => {
                        return ev.event
                    }),
                ),
                icon: 'fas fa-download',
            },
            {
                source$: installEvent$.pipe(
                    map((ev) => {
                        return ev.event
                    }),
                ),
                icon: 'fas fa-cog',
            },
            {
                source$: startEvent$.pipe(
                    map((ev) => {
                        const event = ev.event
                        const mapper: Record<typeof event, PhaseStatus> = {
                            failed: 'failed',
                            starting: 'started',
                            listening: 'succeeded',
                        }
                        return mapper[event]
                    }),
                ),
                icon: 'fas fa-play',
            },
        ]
        this.children = [
            new ItemView({ name, topic: 'Backend', version, phases }),
        ]
    }
}
