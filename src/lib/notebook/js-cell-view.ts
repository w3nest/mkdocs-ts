import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { CodeSnippetView } from '../md-widgets'
import { BehaviorSubject, filter, Observable } from 'rxjs'
import { SnippetEditorView, FutureCellView } from './cell-views'
import { CellTrait, ExecArgs, Scope, State } from './state'
import { CellCommonAttributes } from './notebook-page'
import { executeJs } from './js-execution'

/**
 * All attributes available for a javascript cell are the common ones for now.
 */
export type JsCellAttributes = CellCommonAttributes & {
    /**
     * If the cell is reactive, Observables & Promises referenced are automatically resolved.
     * It uses a 'combineLatest' policy.
     */
    reactive: true
}

/**
 *
 * Represents a Javascript cell within a {@link NotebookPage}.
 *
 * They are typically included from a DOM definition with tag name `js-cell`, in this case
 * associated attributes are provided as DOM attributes; see {@link CellCommonAttributes}.
 */
export class JsCellView implements VirtualDOM<'div'>, CellTrait {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-JsCellView'
    public readonly children: ChildrenLike
    public readonly cellId: string
    public readonly cellAttributes: JsCellAttributes
    /**
     * State manager, owned by the parent {@link NotebookPage}.
     */
    public readonly state: State
    public readonly content: string
    public readonly editorView: CodeSnippetView
    /**
     * Observable over the source content of the cell.
     */
    public readonly content$: BehaviorSubject<string>
    public readonly invalidated$: Observable<unknown>

    constructor(params: {
        cellId: string
        content: string
        state: State
        cellAttributes: JsCellAttributes
    }) {
        Object.assign(this, params)
        this.invalidated$ = this.state.invalidated$.pipe(
            filter((cellId) => cellId === this.cellId),
        )
        this.editorView = new SnippetEditorView({
            language: 'javascript',
            readOnly: this.cellAttributes.readOnly,
            content: this.content,
            lineNumbers: this.cellAttributes.lineNumbers,
            onExecute: () => this.state.execute(this.cellId).then(() => {}),
        })
        this.content$ = this.editorView.content$
        this.children = [
            new FutureCellView({
                language: 'javascript',
                cellId: this.cellId,
                state: this.state,
                editorView: this.editorView,
                cellAttributes: this.cellAttributes,
            }),
        ]
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
