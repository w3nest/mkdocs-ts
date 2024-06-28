/**
 * This file gathers various views used when rendering the {@link NotebookPage}.
 *
 *
 */
import {
    AnyVirtualDOM,
    AttributeLike,
    ChildLike,
    ChildrenLike,
    CSSAttribute,
    VirtualDOM,
} from '@youwol/rx-vdom'
import { BehaviorSubject, combineLatest, filter, Observable, take } from 'rxjs'
import { CellStatus, Output, State } from './state'
import { CodeSnippetView } from '../md-widgets'
import { CellCommonAttributes } from './notebook-page'
import { MdCellAttributes } from './md-cell-view'
import { JsCellAttributes } from './js-cell-view'
import { parseMd } from '../markdown'
import { parseStyle } from './display-utils'

/**
 * Represents the view of a cell that will render once the associated cell is registered in the {@link State}.
 * Upon registration, this container includes one child of type {@link CellView}.
 */
export class FutureCellView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-FutureCellView'

    public readonly children: ChildrenLike

    /**
     *
     * @param params
     * @param params.editorView The code editor view to encapsulate.
     * @param params.cellId The cell unique ID.
     * @param params.language The language of the cell.
     * @param params.state The state managing the cell.
     * @param params.attributes The cell's attributes.
     * @param params.reactive$ Whether the cell is reactive (in some circumstances it is only known when running
     * the cell).
     */
    constructor(params: {
        editorView: AnyVirtualDOM
        cellId: string
        language: string
        state: State
        cellAttributes: MdCellAttributes | JsCellAttributes
        reactive$: Observable<boolean>
    }) {
        this.children = [
            {
                source$: params.state.cellIds$.pipe(
                    filter((cellIds) => cellIds.includes(params.cellId)),
                    take(1),
                ),
                vdomMap: (): AnyVirtualDOM => {
                    return new CellView(params)
                },
            },
        ]
    }
}

/**
 * Represents the view of a cell.
 * It includes:
 * *  An {@link CellHeaderView | header}.
 * *  The {@link SnippetEditorView | code editor}.
 * *  The {@link OutputsView | outputs container}.
 */
export class CellView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-CellView border-left pl-1'

    public readonly cellId: string
    public readonly state: State
    public readonly options: MdCellAttributes | JsCellAttributes
    /**
     *
     * @param params
     * @param params.editorView The code editor view to encapsulate.
     * @param params.cellId The cell unique ID.
     * @param params.language The language of the cell.
     * @param params.state The state managing the cell.
     * @param params.attributes The cell's attributes.
     */
    constructor(params: {
        cellId: string
        language: string
        editorView: AnyVirtualDOM
        cellAttributes: MdCellAttributes | JsCellAttributes
        reactive$: Observable<boolean>
        state: State
    }) {
        Object.assign(this, params)
        const backgrounds: Record<CellStatus, string> = {
            ready: 'mkdocs-bg-info',
            pending: 'mkdocs-bg-info',
            executing: 'mkdocs-bg-info',
            success: 'mkdocs-bg-success',
            error: 'mkdocs-bg-danger',
            unready: '',
        }

        const class$ = {
            source$: this.state.cellsStatus$[this.cellId],
            vdomMap: (status: CellStatus) => backgrounds[status],
            wrapper: (d) => `pl-1 ${d}`,
        }
        const style$ = {
            source$: this.state.cellsStatus$[this.cellId],
            vdomMap: (status: CellStatus) => {
                return ['unready', 'pending'].includes(status)
                    ? { opacity: 0.4 }
                    : { opacity: 1 }
            },
            wrapper: (d) => ({
                ...d,
                position: 'relative',
            }),
        }
        const editorView = {
            tag: 'div' as const,
            style: style$,
            class: class$,
            children: [
                params.editorView,
                new CellTagsView({
                    cellStatus$: this.state.cellsStatus$[this.cellId],
                    reactive$: params.reactive$,
                    language: params.language,
                    cellAttributes: params.cellAttributes,
                }),
            ],
        }
        const outputsView = {
            source$: this.state.executing$[this.cellId].pipe(
                filter(
                    (executing) =>
                        !this.state.deportedOutputsViews.includes(
                            this.cellId,
                        ) && executing,
                ),
            ),
            vdomMap: () => {
                return new OutputsView({
                    output$: this.state.outputs$[this.cellId],
                })
            },
        }
        this.children = [
            new CellHeaderView({
                state: this.state,
                cellId: this.cellId,
            }),
            editorView,
            outputsView,
        ]
    }
}

/**
 *  View that displays code snippet in edition mode.
 */
export class SnippetEditorView extends CodeSnippetView {
    /**
     *
     * @param params
     * @param params.readOnly Whether the code is read-only.
     * @param params.content The editor initial content.
     * @param params.language The language of the cell.
     * @param params.lineNumbers Whether to display line numbers.
     * @param params.onExecute The action triggered upon execution (on 'Ctrl-Enter').
     */
    constructor({
        language,
        readOnly,
        content,
        lineNumbers,
        onExecute,
    }: {
        content: string
        language: 'markdown' | 'javascript' | 'python'
        readOnly: boolean
        lineNumbers: boolean
        onExecute: () => void
    }) {
        super({
            content,
            language,
            cmConfig: {
                lineNumbers,
                lineWrapping: false,
                indentUnit: 4,
                readOnly,
                extraKeys: {
                    'Ctrl-Enter': onExecute,
                },
            },
        })
    }
}

/**
 * Represents the view of a cell's header.
 */
export class CellHeaderView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-CellHeaderView'
    public readonly children: ChildrenLike
    public readonly cellId: string
    public readonly state: State

    /**
     *
     * @param params
     * @param params.state Cell's owning state.
     * @param params.cellId Cell unique ID.
     */
    constructor(params: { state: State; cellId: string }) {
        Object.assign(this, params)
        this.children = [
            {
                source$: this.state.cellsStatus$[this.cellId],
                vdomMap: (s: CellStatus) => {
                    if (['success', 'pending', 'executing'].includes(s)) {
                        return { tag: 'div' }
                    }
                    const classList =
                        s === 'ready' ? 'fa-play' : 'fa-fast-forward'
                    return {
                        tag: 'div',
                        class: `fas  text-success fv-pointer ${classList}`,
                        onclick: () => this.state.execute(this.cellId),
                    }
                },
            },
        ]
    }
}

/**
 * Represents the tag of a {@link CellView} (read-only or not, the language, *etc.*).
 */
export class CellTagsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class =
        'mknb-CellTagsView px-2 text-secondary d-flex align-items-center'

    public readonly children: ChildrenLike
    /**
     * Style associated to the view.
     */
    public readonly style = {
        position: 'absolute' as const,
        top: '0px',
        right: '0px',
    }

    /**
     *
     * @param params
     * @param params.cellStatus$ Current cell status.
     * @param params.reactive$ Whether the cell is reactive.
     * @param params.language Cell's owning state.
     * @param params.attributes Cell attributes.
     */
    constructor(params: {
        cellStatus$: Observable<CellStatus>
        reactive$: Observable<boolean>
        language: string
        cellAttributes: CellCommonAttributes
    }) {
        const lang = {
            javascript: 'js',
            markdown: 'md',
            python: 'py',
        }
        this.children = [
            {
                tag: 'i',
                class: {
                    source$: params.cellStatus$,
                    vdomMap: (status: CellStatus) => {
                        switch (status) {
                            case 'pending':
                                return 'fas fa-clock mr-1'
                            case 'executing':
                                return 'fas fa-cog fa-spin mr-1'
                            default:
                                return ''
                        }
                    },
                },
            },
            {
                tag: 'div',
                class: params.cellAttributes.readOnly
                    ? 'fas fa-lock mr-1'
                    : 'fas fa-pen mr-1',
            },
            {
                tag: 'div',
                class: {
                    source$: params.reactive$,
                    vdomMap: (reactive: boolean) =>
                        reactive ? 'fas fa-bolt mr-1' : '',
                },
            },
            {
                tag: 'div',
                class: 'text-secondary',
                innerText: lang[params.language],
            },
        ]
    }
}

/**
 * Display mode for {@link DeportedOutputsView | deported outputs}.
 */
export type OutputMode = 'normal' | 'fullscreen'
/**
 * Represents the output view of a cell (when using *e.g.* the `display` function).
 */
export class OutputsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class: string = 'mknb-OutputsView'
    public readonly children: ChildrenLike
    public readonly output$: Observable<Output>

    public readonly style: CSSAttribute
    /**
     *
     * @param params
     * @param params.output$ Observable over the outputs to display.
     * @param params.style Style to apply to this element.
     * @param params.classList Classes added to this element.
     */
    constructor(params: {
        output$: Observable<Output>
        style?: CSSAttribute
        classList?: string
    }) {
        Object.assign(this, params)
        this.class = `${this.class} ${params.classList}`
        const outputs$ = new BehaviorSubject([])
        this.output$.subscribe((out: Output) => {
            if (out === undefined) {
                outputs$.next([])
                return
            }
            outputs$.next([...outputs$.value, out])
        })
        this.children = {
            source$: outputs$,
            policy: 'sync',
            vdomMap: (output: AnyVirtualDOM) => output,
        }
    }
}

/**
 * Represents deported outputs view.
 *
 * They are typically included from a DOM definition with tag name `cell-output` in MarkDown content,
 * see {@link DeportedOutputsView.FromDom}.
 */
export class DeportedOutputsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    /**
     * Classes associated to the view.
     */
    public readonly class: string = 'mknb-DeportedOutputsView'
    public readonly children: ChildrenLike

    /**
     * The channel in which views are emitted when running the associated cell.
     */
    public readonly output$: Observable<Output>

    public readonly style: CSSAttribute

    /**
     * The current display mode.
     */
    public readonly mode$ = new BehaviorSubject<OutputMode>('normal')

    /**
     * Defines the methods to retrieve constructor's arguments from the DOM element `cell-output` within
     * MarkDown content.
     *
     * <note level='warning'>
     * Be mindful of the conversion from `camelCase` to `kebab-case`.
     * </note>
     */
    static readonly FromDomAttributes = {
        cellId: (e: HTMLElement) => e.getAttribute('cell-id'),
        defaultContent: (e: HTMLElement) => e.textContent,
        fullScreen: (e: HTMLElement) =>
            e.getAttribute('full-screen') === 'true',
        style: (e: HTMLElement) => parseStyle(e.getAttribute('style')),
        class: (e: HTMLElement) => e.getAttribute('class') || '',
        inlined: (e: HTMLElement) => e.getAttribute('inlined') === 'true',
    }

    /**
     * Initialize an instance of {@link DeportedOutputsView} from a DOM element `cell-output` in MarkDown content
     * (the parameter `output$` is automatically provided).
     *
     * <note level="hint" label="Constructor's attributes mapping">
     *  The static property {@link DeportedOutputsView.FromDomAttributes | FromDomAttributes}
     *  defines the mapping between the DOM element and the constructor's attributes.
     * </note>
     *
     * @param _p
     * @param _p.elem The DOM element.
     * @param _p.output$ The output views channel, automatically provided.
     */
    static FromDom({
        elem,
        output$,
    }: {
        elem: HTMLElement
        output$: Observable<Output>
    }) {
        const params = {
            cellId: DeportedOutputsView.FromDomAttributes.cellId(elem),
            defaultContent:
                DeportedOutputsView.FromDomAttributes.defaultContent(elem),
            style: DeportedOutputsView.FromDomAttributes.style(elem),
            class: DeportedOutputsView.FromDomAttributes.class(elem),
            inlined: DeportedOutputsView.FromDomAttributes.inlined(elem),
            fullScreen: DeportedOutputsView.FromDomAttributes.fullScreen(elem),
        }
        return new DeportedOutputsView({ ...params, output$ })
    }
    /**
     * Initialize a new instance.
     *
     * @param params
     * @param params.defaultContent The default content (as Markdown) displayed before an output is emitted from
     * `output$`.
     * @param params.output$ Observable over the outputs to display.
     * @param params.fullScreen Whether to add a menu to allow expanding the output.
     * @param params.style Style to apply to this element. It does not apply to the `defaultContent` view.
     * @param params.classList Classes added to this element. It does not apply to the `defaultContent` view.
     * @param params.inlined If `true`, adjust the display mode to fit as an inlined element within a text.
     * When inlined, the option `fullScreen` is not enabled.
     */
    constructor(params: {
        defaultContent: string
        output$: Observable<Output>
        fullScreen?: boolean
        style?: CSSAttribute
        class?: string
        inlined?: boolean
    }) {
        this.output$ = params.output$
        if (params.inlined) {
            this.style = { display: 'inline-block' }
        }
        const outputs$ = new BehaviorSubject<Output[]>([])
        this.output$.subscribe((out: Output) => {
            if (out === undefined) {
                outputs$.next([])
                return
            }
            outputs$.next([...outputs$.value, out])
        })
        const style$: AttributeLike<CSSAttribute> = {
            source$: outputs$,
            vdomMap: (outputs: Output[]): CSSAttribute => ({
                backgroundColor: 'rgb(255,255,255)',
                ...(outputs.length === 0 ? {} : params.style),
            }),
        }
        const class$: AttributeLike<string> = {
            source$: combineLatest([this.mode$, outputs$]),
            vdomMap: ([mode, outputs]: [OutputMode, Output[]]) => {
                if (outputs.length === 0) {
                    return ''
                }
                return mode === 'normal'
                    ? params.class
                    : `p-2 border rounded h-75 w-75 mx-auto ${params.class}`
            },
        }
        const contentView: VirtualDOM<'div'> = {
            tag: 'div' as const,
            style: style$,
            class: class$,
            children: {
                source$: outputs$,
                policy: 'sync',
                vdomMap: (output: AnyVirtualDOM) => output,
            },
            onclick: (ev) => ev.stopPropagation(),
        }
        if (params.inlined) {
            this.children = [contentView]
            return
        }

        const headerView: ChildLike = {
            source$: outputs$,
            vdomMap: (outputs: AnyVirtualDOM[]) => {
                if (!params.fullScreen || outputs.length === 0) {
                    return { tag: 'div' }
                }
                return {
                    tag: 'div',
                    class: 'w-100 d-flex pb-1',
                    children: [
                        { tag: 'div', class: 'flex-grow-1' },
                        {
                            tag: 'div',
                            class: 'fas fa-expand fv-pointer',
                            onclick: () => this.mode$.next('fullscreen'),
                        },
                    ],
                }
            },
        }
        const defaultView: ChildLike = {
            source$: outputs$,
            vdomMap: (outputs: Array<unknown>) =>
                outputs.length === 0
                    ? parseMd({ src: params.defaultContent })
                    : { tag: 'div' },
        }

        const displayModeStyle$: AttributeLike<CSSAttribute> = {
            source$: this.mode$,
            vdomMap: (mode: OutputMode) => {
                return mode === 'normal'
                    ? {
                          position: 'initial',
                          width: '100%',
                          height: 'auto',
                          backdropFilter: 'none',
                      }
                    : {
                          position: 'absolute',
                          top: '0vh',
                          left: '0vw',
                          width: '100vw',
                          height: '100vh',
                          zIndex: 10,
                          backdropFilter: 'blur(2px)',
                      }
            },
        }
        this.children = [
            headerView,
            {
                tag: 'div',
                class: 'd-flex flex-column justify-content-center mkdocs-bg-info',
                style: displayModeStyle$,
                children: [defaultView, contentView],
                onclick: () => this.mode$.next('normal'),
            },
        ]
    }
}
