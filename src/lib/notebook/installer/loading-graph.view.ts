import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { EventsManager } from './events-manager'
import { map, take } from 'rxjs'
import { ItemView, Phase, PhaseStatus } from './common.view'

/**
 * Represents the view gathering events w/ loading graph installation.
 *
 * It uses {@link ItemView} with a single `resolution` phase.
 *
 */
export class LoadingGraphEventsView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-LoadingGraphEventsView'
    public readonly tag = 'div'
    public readonly class = LoadingGraphEventsView.CssSelector
    public readonly children: ChildrenLike

    constructor(state: EventsManager) {
        const phases: Phase[] = [
            {
                source$: state.loadingGraphEvent$.pipe(
                    map((ev) => {
                        const step = ev.step
                        const mapper: Record<typeof step, PhaseStatus> = {
                            CdnLoadingGraphQueryEvent: 'started',
                            CdnLoadingGraphResolvedEvent: 'succeeded',
                            CdnLoadingGraphErrorEvent: 'failed',
                        }
                        return mapper[step]
                    }),
                ),
                icon: 'fas fa-search',
            },
        ]
        this.children = [
            child$({
                source$: state.loadingGraphEvent$.pipe(take(1)),
                vdomMap: () =>
                    new ItemView({
                        name: 'Dependencies tree',
                        topic: 'LoadingGraph',
                        phases,
                    }),
            }),
        ]
    }
}
