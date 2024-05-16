/**
 * This file gathers various views used when rendering the {@link NotebookPage}.
 *
 *
 */
import {
    AnyVirtualDOM,
    ChildrenLike,
    CSSAttribute,
    VirtualDOM,
} from '@youwol/rx-vdom'
import { BehaviorSubject, filter, Observable, take } from 'rxjs'
import { CellStatus, Output, State } from './state'
import { CodeSnippetView } from '../md-widgets'
import { CellCommonAttributes } from './notebook-page'
import { MdCellAttributes } from './md-cell-view'
import { JsCellAttributes } from './js-cell-view'

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
     */
    constructor(params: {
        editorView: SnippetEditorView
        cellId: string
        language: string
        state: State
        cellAttributes: MdCellAttributes | JsCellAttributes
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
        editorView: SnippetEditorView
        cellAttributes: MdCellAttributes | JsCellAttributes
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
     * @param params.language Cell's owning state.
     * @param params.attributes Cell attributes.
     */
    constructor(params: {
        cellStatus$: Observable<CellStatus>
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
                class: params.cellAttributes['reactive']
                    ? 'fas fa-bolt mr-1'
                    : '',
            },
            {
                tag: 'div',
                class: 'text-secondary',
                innerText: lang[params.language],
            },
        ]
    }
}

type OutputMode = 'normal' | 'fullscreen'
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
 * Represents a deported output view (instantiated from `cell-output` element).
 */
export class DeportedOutputsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    /**
     * Classes associated to the view.
     */
    public readonly class: string = 'mknb-DeportedOutputsView'
    public readonly children: ChildrenLike
    public readonly output$: Observable<Output>

    public readonly style: CSSAttribute
    public readonly fullScreen: boolean
    public readonly mode$ = new BehaviorSubject<OutputMode>('normal')

    /**
     *
     * @param params
     * @param params.output$ Observable over the outputs to display.
     * @param params.fullScreen Whether to add a menu to allow expanding the output.
     * @param params.style Style to apply to this element.
     * @param params.classList Classes added to this element.
     */
    constructor(params: {
        output$: Observable<Output>
        fullScreen?: boolean
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
        const content: ChildrenLike = {
            source$: outputs$,
            policy: 'sync',
            vdomMap: (output: AnyVirtualDOM) => output,
        }
        this.children = [
            {
                source$: outputs$,
                vdomMap: (outputs: AnyVirtualDOM[]) => {
                    if (!this.fullScreen || outputs.length === 0) {
                        return { tag: 'div' }
                    }
                    return {
                        tag: 'div',
                        class: 'w-100 d-flex',
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
            },
            {
                tag: 'div',
                class: 'd-flex flex-column justify-content-center mkdocs-bg-info',
                style: {
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
                },
                children: [
                    {
                        tag: 'div' as const,
                        style: {
                            backgroundColor: 'rgb(255,255,255)',
                        },
                        class: {
                            source$: this.mode$,
                            vdomMap: (mode: OutputMode) =>
                                mode === 'normal'
                                    ? ''
                                    : 'p-2 border rounded h-75 w-75 mx-auto',
                        },
                        children: content,
                        onclick: (ev) => ev.stopPropagation(),
                    },
                ],
                onclick: () => this.mode$.next('normal'),
            },
        ]
    }
}
