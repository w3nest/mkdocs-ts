import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { CodeSnippetView } from '../md-widgets'
import { BehaviorSubject, filter, Observable, of } from 'rxjs'
import { SnippetEditorView, FutureCellView } from './cell-views'
import { CellTrait, ExecArgs, Scope, State } from './state'
import { CellCommonAttributes } from './notebook-page'
import { executePy } from './py-execution'

/**
 * All attributes available for a python cell are the common ones for now.
 */
export type PyCellAttributes = CellCommonAttributes

/**
 *
 * Represents the execution side of a Python cell within a {@link NotebookPage}.
 *
 * This implementation does not provide the views (editor, outputs), it is used as it is when loading separated notebook
 * pages to retrieve exported symbols.
 * However, this implementation is typically inherited from {@link PyCellView} to provide the regular views of
 * a python cell.
 */
export class PyCellExecutor implements CellTrait {
    /**
     * Cell ID.
     */
    public readonly cellId: string

    /**
     * Emit when the cell is invalidated.
     */
    public readonly invalidated$: Observable<unknown>
    /**
     * State manager, owned by the parent {@link NotebookPage}.
     */
    public readonly state: State

    /**
     * The provided attributes.
     */
    public readonly cellAttributes: PyCellAttributes

    /**
     * Observable over the source content of the cell.
     */
    public readonly content$: BehaviorSubject<string>

    constructor(params: {
        cellId: string
        content$: BehaviorSubject<string>
        state: State
        cellAttributes: PyCellAttributes
    }) {
        Object.assign(this, params)
        this.invalidated$ = this.state.invalidated$.pipe(
            filter((cellId) => cellId === this.cellId),
        )
    }

    /**
     * Execute the cell. See {@link executePy}.
     *
     * @param args See {@link ExecArgs}.
     */
    async execute(args: ExecArgs): Promise<Scope> {
        return await executePy({
            ...args,
            invalidated$: this.invalidated$,
        })
    }
}

/**
 *
 * Represents a Python cell within a {@link NotebookPage}.
 *
 * They are typically included from a DOM definition with tag name `py-cell`, in this case
 * associated attributes are provided as DOM attributes; see {@link PyCellAttributes}.
 */
export class PyCellView extends PyCellExecutor implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-JsCellView'
    public readonly children: ChildrenLike

    /**
     * The encapsulated code editor view.
     */
    public readonly editorView: CodeSnippetView

    constructor(params: {
        cellId: string
        content: string
        state: State
        cellAttributes: PyCellAttributes
    }) {
        const editorView = new SnippetEditorView({
            language: 'python',
            readOnly: params.cellAttributes.readOnly,
            content: params.content,
            lineNumbers: params.cellAttributes.lineNumbers,
            onExecute: () => this.state.execute(this.cellId).then(() => {}),
        })

        super({ ...params, content$: editorView.content$ })
        this.editorView = editorView

        this.children = [
            new FutureCellView({
                language: 'python',
                cellId: this.cellId,
                state: this.state,
                editorView: this.editorView,
                cellAttributes: this.cellAttributes,
                reactive$: of(false),
            }),
        ]
    }
}
