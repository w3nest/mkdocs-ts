import {
    AttributeLike,
    ChildrenLike,
    VirtualDOM,
    attr$,
    child$,
    EmptyDiv,
} from 'rx-vdom'
import { BehaviorSubject, delay, take } from 'rxjs'
import { EventsManager } from './events-manager'
import { PyEventsView } from './pyodide.view'
import { EsmEventsView } from './esm.view'
import { ToggleViewMode } from './common.view'
import { BackendEventsView } from './backend.view'
import { CssEventsView } from './css.view'
import { LogsView } from './logs.view'
import { LoadingGraphEventsView } from './loading-graph.view'

/**
 * A virtual DOM component that displays the installation process of various dependencies
 * (ESM, Pyodide, Backend, and CSS) with real-time updates.
 *
 * It is an expandable group with header defined by {@link InstallHeaderBar}, and content including (if applicable):
 *
 * *  {@link LoadingGraphEventsView}
 *
 * *  {@link EsmEventsView}
 *
 * *  {@link PyEventsView}
 *
 * *  {@link BackendEventsView}
 *
 * *  {@link CssEventsView}
 *
 * *  {@link FooterView}
 */
export class InstallView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-InstallView'
    public readonly tag = 'div'
    public readonly class = `${InstallView.CssSelector} border rounded w-100`
    public readonly children: ChildrenLike
    public readonly mode$ = new BehaviorSubject<'events' | 'logs'>('events')
    constructor(state: EventsManager) {
        const header = new InstallHeaderBar({ state, mode$: this.mode$ })
        this.children = [
            header,
            {
                tag: 'div',
                class: attr$({
                    source$: header.expanded$,
                    vdomMap: (expanded) => (expanded ? 'p-1' : 'd-none'),
                }),
                children: [
                    child$({
                        source$: this.mode$,
                        vdomMap: (mode) => {
                            if (mode === 'logs') {
                                return new LogsView({
                                    logEvent$: state.consoleEvent$,
                                })
                            }
                            return {
                                tag: 'div',
                                children: [
                                    new LoadingGraphEventsView(state),
                                    new EsmEventsView(state),
                                    new PyEventsView(state),
                                    new BackendEventsView(state),
                                    new CssEventsView(state),
                                    child$({
                                        source$: state.installDoneEvent$,
                                        vdomMap: (ev) => {
                                            const text =
                                                ev.step === 'InstallDoneEvent'
                                                    ? 'All set, environment ready.'
                                                    : 'Error occurred during installation.'
                                            return new FooterView({ text })
                                        },
                                    }),
                                ],
                            }
                        },
                    }),
                ],
            },
        ]
    }
}

/**
 * Header bar for {@link InstallView}.
 *
 */
export class InstallHeaderBar implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-InstallHeaderBar'

    public readonly tag = 'div'
    public readonly class: AttributeLike<string>
    public readonly children: ChildrenLike
    public readonly expanded$ = new BehaviorSubject(true)
    public readonly style = {
        fontWeight: 'bolder' as const,
    }
    constructor({
        state,
        mode$,
    }: {
        state: EventsManager
        mode$: BehaviorSubject<'events' | 'logs'>
    }) {
        const baseClass = `${InstallHeaderBar.CssSelector} p-1 w-100 d-flex border-bottom align-items-center`
        this.class = attr$({
            source$: state.installDoneEvent$,
            vdomMap: (ev) => {
                return ev.step === 'InstallDoneEvent'
                    ? 'mkdocs-bg-success'
                    : 'mkdocs-bg-failure'
            },
            untilFirst: 'mkdocs-bg-info',
            wrapper: (d) => `${d} ${baseClass}`,
        })

        state.installDoneEvent$.pipe(take(1), delay(1000)).subscribe((ev) => {
            if (ev.step === 'InstallDoneEvent') {
                this.expanded$.next(false)
            }
        })
        this.children = [
            {
                tag: 'i',
                class: attr$({
                    source$: state.installDoneEvent$,
                    vdomMap: (ev) =>
                        ev.step === 'InstallDoneEvent'
                            ? 'fas fa-check text-success'
                            : `fas fa-times text-danger`,
                    untilFirst: 'fas fa-cog fa-spin',
                }),
            },
            { tag: 'div', class: 'mx-1' },
            {
                tag: 'div',
                innerText: attr$({
                    source$: state.installDoneEvent$,
                    vdomMap: (ev) =>
                        ev.step === 'InstallDoneEvent'
                            ? `Installation successful`
                            : `Installation failed`,
                    untilFirst: 'Installing...',
                }),
            },
            { tag: 'div', class: 'flex-grow-1' },
            child$({
                source$: this.expanded$,
                vdomMap: (expanded) =>
                    expanded ? new ToggleViewMode({ mode$ }) : EmptyDiv,
            }),
            { tag: 'div', class: 'mx-1' },
            {
                tag: 'button',
                onclick: () => {
                    this.expanded$.next(!this.expanded$.value)
                },
                class: attr$({
                    source$: this.expanded$,
                    vdomMap: (expanded): string =>
                        expanded ? 'fa-chevron-down' : 'fa-chevron-right',
                    wrapper: (d) => `fas ${d} btn btn-sm btn-light`,
                }),
            },
        ]
    }
}

/**
 * Footer view for {@link InstallView} displaying a given message.
 */
export class FooterView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-FooterView'
    public readonly tag = 'div'
    public readonly class = `${FooterView.CssSelector} my-2`
    public readonly children: ChildrenLike
    public readonly style = { fontWeight: 'bold' as const }
    constructor({ text }: { text: string }) {
        this.children = [
            {
                tag: 'div',
                innerText: text,
            },
        ]
    }
}
