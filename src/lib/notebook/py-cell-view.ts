import { ChildrenLike, VirtualDOM } from 'rx-vdom'
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
            pyNamespace: this.state.getPyNamespace(window['pyodide']),
        })
    }
}

/**
 *
 * Represents a Python cell (running in browser) within a {@link NotebookPage}.
 *
 * They are typically included from a DOM definition with tag name `py-cell` in MarkDown content,
 * see {@link PyCellView.FromDom}.
 */
export class PyCellView extends PyCellExecutor implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Classes associated with the view.
     */
    public readonly class = 'mknb-PyCellView'
    public readonly children: ChildrenLike

    /**
     * The encapsulated code editor view.
     */
    public readonly editorView: CodeSnippetView

    /**
     * Defines the methods to retrieve constructor's arguments from the DOM element `py-cell` within
     * MarkDown content.
     *
     * <note level='warning'>
     * Be mindful of the conversion from `camelCase` to `kebab-case`.
     * </note>
     */
    static readonly FromDomAttributes = {
        cellId: (e: HTMLElement) =>
            e.getAttribute('cell-id') || e.getAttribute('id'),
        content: (e: HTMLElement) => e.textContent,
        readOnly: (e: HTMLElement) => e.getAttribute('read-only') === 'true',
        lineNumber: (e: HTMLElement) =>
            e.getAttribute('line-number') === 'true',
    }

    /**
     * Initialize an instance of {@link PyCellView} from a DOM element `py-cell` in MarkDown content
     *  (the parameter `state` is automatically provided).
     *
     * <note level="hint" label="Constructor's attributes mapping">
     *  The static property {@link PyCellView.FromDomAttributes | FromDomAttributes}
     *  defines the mapping between the DOM element and the constructor's attributes.
     * </note>
     *
     * @param _p
     * @param _p.elem The DOM element.
     * @param _p.state The page state.
     */
    static FromDom({ elem, state }: { elem: HTMLElement; state: State }) {
        const params = {
            cellId: PyCellView.FromDomAttributes.cellId(elem),
            content: PyCellView.FromDomAttributes.content(elem),
            cellAttributes: {
                readOnly: PyCellView.FromDomAttributes.readOnly(elem),
                lineNumber: PyCellView.FromDomAttributes.lineNumber(elem),
            },
        }
        return new PyCellView({ ...params, state })
    }

    /**
     * Initialize a new instance.
     *
     * @param params
     * @param params.cellId The cell's ID.
     * @param params.content The cell's content.
     * @param params.state The page's state.
     * @param params.cellAttributes Cell's attributes.
     */
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
