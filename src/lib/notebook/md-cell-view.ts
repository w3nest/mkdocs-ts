import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { CodeSnippetView } from '../md-widgets'
import { CellCommonAttributes, notebookViews } from './notebook-page'
import { CellTrait, ExecArgs, State } from './state'
import { SnippetEditorView, FutureCellView } from './cell-views'
import { BehaviorSubject } from 'rxjs'
import { parseMd, ParsingArguments } from '../markdown'
import { JsCellAttributes } from './js-cell-view'

/**
 * All attributes available for a Markdown cell are the common ones for now.
 */
export type MdCellAttributes = CellCommonAttributes

/**
 *
 * Represents a Markdown cell within a {@link NotebookPage}.
 *
 * They are typically included from a DOM definition with tag name `md-cell`, in this case
 * associated attributes are provided as DOM attributes; see {@link CellCommonAttributes}.
 */
export class MdCellView implements VirtualDOM<'div'>, CellTrait {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-MdCellView'
    public readonly children: ChildrenLike
    public readonly cellId: string
    public readonly cellAttributes: JsCellAttributes
    /**
     * State manager, owned by the parent {@link NotebookPage}.
     */
    public readonly state: State

    public readonly editorView: CodeSnippetView
    /**
     * Observable over the source content of the cell.
     */
    public readonly content$: BehaviorSubject<string>

    constructor(params: {
        cellId: string
        content: string
        state: State
        parserOptions: ParsingArguments
        cellAttributes: MdCellAttributes
    }) {
        Object.assign(this, params)
        this.editorView = new SnippetEditorView({
            language: 'markdown',
            readOnly: false,
            content: params.content,
            lineNumbers: this.cellAttributes.lineNumbers,
            onExecute: () => this.state.execute(this.cellId).then(() => {}),
        })
        this.content$ = this.editorView.content$
        this.children = [
            new FutureCellView({
                language: 'markdown',
                cellId: this.cellId,
                state: this.state,
                editorView: this.editorView,
                cellAttributes: this.cellAttributes,
            }),
        ]
    }

    /**
     * Execute the cell. Because markdown cell can include other cells, this function own a dedicated {@link State}).
     *
     * @param args See {@link ExecArgs}.
     */
    async execute({ scope, owningState, cellId, src, output$ }: ExecArgs) {
        const state = new State({
            initialScope: scope,
            parent: { state: owningState, cellId },
        })
        const vdom = parseMd({
            src: src,
            views: {
                ...notebookViews({
                    state: state,
                    cellOptions: {
                        readOnly: true,
                        lineNumbers: false,
                    },
                }),
            },
        })
        output$.next(vdom)
        return await state.execute(state.ids.slice(-1)[0])
    }
}
