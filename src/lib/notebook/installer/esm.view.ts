import { ChildrenLike, sync$, VirtualDOM } from 'rx-vdom'
import { EventsManager } from './events-manager'
import { filter, map } from 'rxjs'
import { shareReplay } from 'rxjs/operators'
import { ItemView, Phase, PhaseStatus } from './common.view'

/**
 * Represents the view gathering events w/ ESM installation; each event being displayed using {@link EsmView}.
 */
export class EsmEventsView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-EsmEventsView'
    public readonly tag = 'div'
    public readonly class = EsmEventsView.CssSelector
    public readonly children: ChildrenLike

    constructor(state: EventsManager) {
        this.children = sync$({
            policy: 'sync',
            source$: state.esmStore$,
            vdomMap: ({ name, version, url }) => {
                return new EsmView({ name, version, url, state })
            },
        })
    }
}

/**
 * The view for ESM events targeting a specific module.
 * It uses {@link ItemView} with `loading` & `parsing` phases.
 */
export class EsmView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-EsmView'
    public readonly tag = 'div'
    public readonly class = EsmView.CssSelector
    public readonly children: ChildrenLike

    constructor({
        name,
        version,
        url,
        state,
    }: {
        name: string
        version: string
        url: string
        state: EventsManager
    }) {
        const itemEvent$ = state.esmEvent$.pipe(
            filter((ev) => ev.targetName === name && ev.version === version),
            shareReplay({ refCount: true }),
        )
        const loadingEvent$ = itemEvent$.pipe(
            filter(
                (ev) =>
                    ev.step === 'SourceLoadingEvent' ||
                    ev.step === 'SourceLoadedEvent' ||
                    ev.step === 'UrlNotFoundEvent' ||
                    ev.step === 'UnauthorizedEvent',
            ),
            filter((ev) => {
                return ev.url === url
            }),
            map((ev) => {
                const step = ev.step
                const mapper: Record<typeof step, PhaseStatus> = {
                    SourceLoadingEvent: 'started',
                    SourceLoadedEvent: 'succeeded',
                    UrlNotFoundEvent: 'failed',
                    UnauthorizedEvent: 'failed',
                }
                return mapper[step]
            }),
        )
        const parsingEvent$ = itemEvent$.pipe(
            filter(
                (ev) =>
                    ev.step === 'SourceParsedEvent' ||
                    ev.step === 'ParseErrorEvent',
            ),
            map((ev) =>
                ev.step === 'SourceParsedEvent' ? 'succeeded' : 'failed',
            ),
        )
        const phases: Phase[] = [
            {
                source$: loadingEvent$,
                icon: 'fas fa-download',
            },
            {
                source$: parsingEvent$,
                icon: 'fas fa-play',
            },
        ]
        this.children = [new ItemView({ name, topic: 'ESM', version, phases })]
    }
}
