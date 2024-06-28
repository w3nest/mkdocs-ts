import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { CodeSnippetView } from '../md-widgets'
import { BehaviorSubject, filter, Observable, of } from 'rxjs'
import { SnippetEditorView, FutureCellView } from './cell-views'
import { CellTrait, ExecArgs, Scope, State } from './state'
import { CellCommonAttributes } from './notebook-page'
import { executeJs } from './js-execution'

/**
 * All attributes available for a javascript cell: the common ones + 'reactive'.
 */
export type JsCellAttributes = CellCommonAttributes & {
    /**
     * If the cell is reactive, Observables & Promises referenced are automatically resolved.
     * It uses a 'combineLatest' policy.
     */
    reactive: boolean
}

/**
 *
 * Represents the execution side of a Javascript cell within a {@link NotebookPage}.
 *
 * This implementation does not provide the views (editor, outputs), it is used as it is when loading separated notebook
 * pages to retrieve exported symbols.
 * However, this implementation is typically inherited from {@link JsCellView} to provide the regular views of
 * a javascript cell.
 */
export class JsCellExecutor implements CellTrait {
    public readonly cellId: string
    /**
     * Initial source code.
     */
    public readonly content: string

    /**
     * Emit when the cell is invalidated.
     */
    public readonly invalidated$: Observable<unknown>
    /**
     * State manager, owned by the parent {@link NotebookPage}.
     */
    public readonly state: State

    public readonly cellAttributes: JsCellAttributes

    /**
     * Observable over the source content of the cell.
     */
    public readonly content$: BehaviorSubject<string>

    constructor(params: {
        cellId: string
        content$: BehaviorSubject<string>
        state: State
        cellAttributes: JsCellAttributes
    }) {
        Object.assign(this, params)
        this.invalidated$ = this.state.invalidated$.pipe(
            filter((cellId) => cellId === this.cellId),
        )
    }

    /**
     * Execute the cell. See {@link execute}.
     *
     * @param args See {@link ExecArgs}.
     */
    async execute(args: ExecArgs): Promise<Scope> {
        return await executeJs({
            ...args,
            reactive: this.cellAttributes.reactive,
            invalidated$: this.invalidated$,
        })
    }
}

/**
 *
 * Represents a Javascript cell within a {@link NotebookPage}.
 *
 * They are typically included from a DOM definition with tag name `js-cell`, in this case
 * associated attributes are provided as DOM attributes; see {@link JsCellAttributes}.
 */
export class JsCellView extends JsCellExecutor implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-JsCellView'
    public readonly children: ChildrenLike

    public readonly editorView: CodeSnippetView

    constructor(params: {
        cellId: string
        content: string
        state: State
        cellAttributes: JsCellAttributes
    }) {
        const editorView = new SnippetEditorView({
            language: 'javascript',
            readOnly: params.cellAttributes.readOnly,
            content: params.content,
            lineNumbers: params.cellAttributes.lineNumbers,
            onExecute: () => this.state.execute(this.cellId).then(() => {}),
        })

        super({ ...params, content$: editorView.content$ })
        this.editorView = editorView

        this.children = [
            new FutureCellView({
                language: 'javascript',
                cellId: this.cellId,
                state: this.state,
                editorView: this.editorView,
                cellAttributes: this.cellAttributes,
                reactive$: of(this.cellAttributes.reactive),
            }),
        ]
    }
}
