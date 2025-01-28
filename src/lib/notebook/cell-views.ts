/**
 * This file gathers various views used when rendering the {@link NotebookPage}.
 *
 *
 */
import {
    AnyVirtualDOM,
    attr$,
    child$,
    ChildrenLike,
    CSSAttribute,
    sync$,
    VirtualDOM,
    EmptyDiv,
} from 'rx-vdom'
import { BehaviorSubject, filter, Observable, take } from 'rxjs'
import {
    AstParsingError,
    CellStatus,
    ExecCellError,
    Output,
    RunTimeError,
    State,
} from './state'
import { CodeSnippetView } from '../md-widgets'
import { CellCommonAttributes } from './notebook-page'
import { MdCellAttributes } from './md-cell-view'
import { JsCellAttributes } from './js-cell-view'
import { Dependencies } from '.'
import { ObjectJs } from '@w3nest/rx-tree-views'

/**
 * Accepted language.
 */
type Language = 'javascript' | 'markdown' | 'python' | 'unknown'

/**
 * Represents the view of a cell that will render once the associated cell is registered in the {@link State}.
 * Upon registration, this container includes one child of type {@link CellView}.
 */
export class FutureCellView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-FutureCellView'
    public readonly tag = 'div'

    /**
     * Classes associated to the view.
     */
    public readonly class = FutureCellView.CssSelector

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
        language: Language
        state: State
        cellAttributes: MdCellAttributes | JsCellAttributes
        reactive$: Observable<boolean>
    }) {
        this.children = [
            child$({
                source$: params.state.cellIds$.pipe(
                    filter((cellIds) => cellIds.includes(params.cellId)),
                    take(1),
                ),
                vdomMap: (): AnyVirtualDOM => {
                    return new CellView(params)
                },
            }),
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
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-CellView'
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    /**
     * Classes associated to the view.
     */
    public readonly class = `${CellView.CssSelector} border-start ps-1`

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
        language: Language
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

        const class$ = attr$({
            source$: this.state.cellsStatus$[this.cellId],
            vdomMap: (status) => backgrounds[status],
            wrapper: (d) => `ps-1 ${d}`,
        })
        const style$ = attr$({
            source$: this.state.cellsStatus$[this.cellId],
            vdomMap: (status) => {
                return ['unready', 'pending'].includes(status)
                    ? { opacity: 0.4 }
                    : { opacity: 1 }
            },
            wrapper: (d) => ({
                ...d,
                position: 'relative',
            }),
        })
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
        const outputsView = child$({
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
        })
        const errorsView = child$({
            source$: this.state.errors$[this.cellId],
            vdomMap: (error) => {
                return error ? new ErrorView({ error }) : EmptyDiv
            },
        })

        this.children = [
            new CellHeaderView({
                state: this.state,
                cellId: this.cellId,
            }),
            editorView,
            errorsView,
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
        language: 'markdown' | 'javascript' | 'python' | 'unknown'
        readOnly?: boolean
        lineNumbers?: boolean
        onExecute: () => void
    }) {
        super({
            content,
            language,
            cmConfig: {
                lineNumbers: lineNumbers ?? false,
                lineWrapping: false,
                indentUnit: 4,
                readOnly: readOnly ?? false,
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
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-CellHeaderView'
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = `${CellHeaderView.CssSelector} pb-1`
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
            child$({
                source$: this.state.cellsStatus$[this.cellId],
                vdomMap: (s) => {
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
            }),
        ]
    }
}

/**
 * Represents the tag of a {@link CellView} (read-only or not, the language, *etc.*).
 */
export class CellTagsView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-CellTagsView'
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = `${CellTagsView.CssSelector} px-2 text-secondary d-flex align-items-center`

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
        language: Language
        cellAttributes: CellCommonAttributes
    }) {
        const lang: Record<Language, string> = {
            javascript: 'js',
            markdown: 'md',
            python: 'py',
            unknown: '?',
        }
        this.children = [
            {
                tag: 'i',
                class: attr$({
                    source$: params.cellStatus$,
                    vdomMap: (status) => {
                        switch (status) {
                            case 'pending':
                                return 'fas fa-clock me-1'
                            case 'executing':
                                return 'fas fa-cog fa-spin me-1'
                            default:
                                return ''
                        }
                    },
                }),
            },
            {
                tag: 'div',
                class: params.cellAttributes.readOnly
                    ? 'fas fa-lock me-1'
                    : 'fas fa-pen me-1',
            },
            {
                tag: 'div',
                class: attr$({
                    source$: params.reactive$,
                    vdomMap: (reactive) => (reactive ? 'fas fa-bolt me-1' : ''),
                }),
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
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-OutputsView'
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class: string = OutputsView.CssSelector
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
        this.class = `${this.class} ${params.classList ?? ''}`
        const outputs$ = new BehaviorSubject<Output[]>([])
        this.output$.subscribe((out: Output) => {
            if (out === undefined) {
                outputs$.next([])
                return
            }
            outputs$.next([...outputs$.value, out])
        })
        this.children = sync$({
            source$: outputs$,
            policy: 'sync',
            vdomMap: (output: AnyVirtualDOM) => output,
        })
    }
}

/**
 * The view of an {@link ExecCellError}.
 */
export class ErrorView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-ErrorView'
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class: string = ErrorView.CssSelector
    public readonly children: ChildrenLike
    public readonly error: ExecCellError
    /**
     *
     * @param params
     * @param params.error The error to display.
     */
    constructor(params: { error: ExecCellError }) {
        Object.assign(this, params)
        const line = this.error.line - 1 // highlightedLines first index is 0
        const startLine = Math.max(0, line - 5)
        const endLine = Math.min(this.error.src.length - 1, line + 5)
        const lines = this.error.src
            .slice(startLine, endLine)
            .reduce((acc, e) => `${acc}${e}\n`, '')

        const content = `
**${this.error.description}**

<code-snippet highlightedLines="${String(line - startLine)}">
${lines}
</code-snippet>

<scope-in></scope-in>

**Refer to your browser's debug console for more information**. 
        `

        const scopeIn = (): AnyVirtualDOM => {
            if (!(this.error instanceof RunTimeError)) {
                return EmptyDiv
            }
            return {
                tag: 'div',
                class: 'cm-s-default',
                children: [
                    {
                        tag: 'div',
                        innerText:
                            'Below is displayed the available scope from the precious cells:',
                    },
                    new ObjectJs.View({
                        state: new ObjectJs.State({
                            title: '',
                            data: this.error.scopeIn,
                        }),
                    }),
                ],
            }
        }

        this.children = [
            new Dependencies.MdWidgets.NoteView({
                level: 'bug' as const,
                content,
                parsingArgs: {
                    views: {
                        'scope-in': scopeIn,
                    },
                },
                label:
                    this.error instanceof AstParsingError
                        ? 'AST parsing failed'
                        : 'Execution error',
            }),
        ]
    }
}
