import { ChildrenLike, sync$, VirtualDOM } from 'rx-vdom'
import { EventsManager } from './events-manager'
import { filter, map } from 'rxjs'
import { shareReplay } from 'rxjs/operators'
import { ItemView, Phase, PhaseStatus } from './common.view'

/**
 * Represents the view gathering events w/ CSS installation; each event being displayed using {@link CssView}.
 */
export class CssEventsView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-CssEventsView'
    public readonly tag = 'div'
    public readonly class = CssEventsView.CssSelector
    public readonly children: ChildrenLike

    constructor(state: EventsManager) {
        this.children = sync$({
            policy: 'sync',
            source$: state.cssStyleSheetStore$,
            vdomMap: ({ name, version, url }) => {
                const target = url.split('/').slice(9).join('/')
                return new CssView({ name, target, version, url, state })
            },
        })
    }
}
/**
 * The view for CSS events targeting a specific resource.
 * It uses {@link ItemView} with a single `install` phase.
 */
export class CssView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-CssView'
    public readonly tag = 'div'
    public readonly class = CssView.CssSelector
    public readonly children: ChildrenLike

    constructor({
        name,
        version,
        target,
        url,
        state,
    }: {
        name: string
        version: string
        target: string
        url: string
        state: EventsManager
    }) {
        const itemEvent$ = state.cssEvent$.pipe(
            filter((ev) => ev.targetName === name && ev.version === version),
            shareReplay({ refCount: true }),
        )
        const installEvent$ = itemEvent$.pipe(
            filter((ev) => {
                return ev.url === url
            }),
            map((ev) => {
                const step = ev.step
                const mapper: Record<typeof step, PhaseStatus> = {
                    CssLoadingEvent: 'started',
                    CssParsedEvent: 'succeeded',
                    UrlNotFoundEvent: 'failed404',
                    UnauthorizedEvent: 'failed401',
                }
                return mapper[step]
            }),
        )
        const phases: Phase[] = [
            {
                source$: installEvent$,
                icon: 'fab fa-css3',
            },
        ]
        this.children = [
            new ItemView({ name, topic: 'CSS', version, target, phases }),
        ]
    }
}
