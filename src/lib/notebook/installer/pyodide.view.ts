import { child$, ChildrenLike, sync$, VirtualDOM } from 'rx-vdom'
import { EventsManager } from './events-manager'
import { filter, map, take } from 'rxjs'
import { shareReplay } from 'rxjs/operators'
import { ItemView, Phase } from './common.view'
/**
 * Represents the view gathering events w/ pyodide installation; each event being displayed using {@link PyModuleView}.
 */
export class PyEventsView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-PyEventsView'
    public readonly tag = 'div'
    public readonly class = PyEventsView.CssSelector
    public readonly children: ChildrenLike

    constructor(state: EventsManager) {
        const trigger$ = state.pyRuntimeEvent$.pipe(
            take(1),
            map((e) => ({ name: 'Pyodide', version: e.pyodideVersion })),
        )
        const runtimePhases: Phase[] = [
            {
                source$: state.pyRuntimeEvent$.pipe(
                    filter(
                        (ev) =>
                            ev.step === 'FetchPyRuntimeEvent' ||
                            ev.step === 'FetchedPyRuntimeEvent',
                    ),
                    map((ev) => {
                        return ev.step === 'FetchedPyRuntimeEvent'
                            ? 'succeeded'
                            : 'started'
                    }),
                ),
                icon: 'fas fa-download',
            },
            {
                source$: state.pyRuntimeEvent$.pipe(
                    filter(
                        (ev) =>
                            ev.step === 'StartPyRuntimeEvent' ||
                            ev.step === 'PyRuntimeReadyEvent',
                    ),
                    map((ev) => {
                        return ev.step === 'PyRuntimeReadyEvent'
                            ? 'succeeded'
                            : 'started'
                    }),
                ),
                icon: 'fas fa-play',
            },
        ]

        this.children = [
            child$({
                source$: trigger$,
                vdomMap: ({ name, version }) =>
                    new ItemView({
                        name,
                        topic: 'Python',
                        version,
                        phases: runtimePhases,
                    }),
            }),
            {
                tag: 'div',
                children: sync$({
                    policy: 'sync',
                    source$: state.pyModulesStore$,
                    vdomMap: (name) => {
                        return new PyModuleView({
                            name,
                            state,
                        })
                    },
                }),
            },
        ]
    }
}
/**
 * The view for pyodide events targeting a specific module.
 * It uses {@link ItemView} with a single `install` phase.
 */
class PyModuleView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-PyModuleView'
    public readonly tag = 'div'
    public readonly class = PyModuleView.CssSelector
    public readonly children: ChildrenLike

    constructor({ name, state }: { name: string; state: EventsManager }) {
        const itemEvent$ = state.pyModuleEvent$.pipe(
            filter((ev) => ev.name === name),
            shareReplay({ refCount: true }),
        )
        const phases: Phase[] = [
            {
                source$: itemEvent$.pipe(
                    map((ev) => {
                        return ev.step === 'PyModuleLoadedEvent'
                            ? 'succeeded'
                            : 'started'
                    }),
                ),
                icon: 'fas fa-cog',
            },
        ]
        this.children = [
            child$({
                source$: itemEvent$,
                vdomMap: () => {
                    return new ItemView({ name, topic: 'Python', phases })
                },
            }),
        ]
    }
}
