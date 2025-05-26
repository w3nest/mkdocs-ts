import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { BehaviorSubject, filter, Observable, of } from 'rxjs'
import { SnippetEditorView, FutureCellView } from './cell-views'
import { CellTrait, ExecArgs, getCellUid, Scope, State } from './state'
import { CellCommonAttributes } from './notebook-page'
import { executePy, Pyodide } from './py-execution'
import { ContextTrait, Contextual } from 'mkdocs-ts'

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
     * @param ctx Execution context used for logging and tracing.
     */
    @Contextual({ async: true, key: (args: ExecArgs) => args.cellId })
    async execute(args: ExecArgs, ctx?: ContextTrait): Promise<Scope> {
        const pyodide = (window as unknown as { pyodide?: Pyodide }).pyodide
        if (!pyodide) {
            throw Error(
                'No `window.pyodide` available to run the python cell. You can use `install({pyodide:...})' +
                    ' to provide a pyodide runtime.',
            )
        }
        return await executePy(
            {
                ...args,
                invalidated$: this.invalidated$,
                pyNamespace: this.state.getPyNamespace(pyodide),
            },
            ctx,
        )
    }
}

/**
 *
 * Represents a Python cell (running in browser) within a {@link NotebookPage}.
 *
 * They are typically included from a DOM definition with tag name `py-cell` in Markdown content,
 * see {@link PyCellView.FromDom}.
 *
 * Details regarding the execution are provided in the documentation of {@link executePy}.
 *
 * <note level='warning'>
 * An instance of Pyodide runtime should be available through `window.pyodide` with expected python modules installed.
 * </note>
 *
 */
export class PyCellView extends PyCellExecutor implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-PyCellView'
    public readonly tag = 'div'
    /**
     * Classes associated with the view.
     */
    public readonly class = PyCellView.CssSelector
    public readonly children: ChildrenLike

    /**
     * The encapsulated code editor view.
     */
    public readonly editorView: SnippetEditorView

    /**
     * Defines the methods to retrieve constructor's arguments from the DOM element `py-cell` within
     * Markdown content.
     *
     * <note level='warning'>
     * Be mindful of the conversion from `camelCase` to `kebab-case`.
     * </note>
     */
    static readonly FromDomAttributes = {
        cellId: (e: HTMLElement) =>
            e.getAttribute('cell-id') ?? e.getAttribute('id') ?? getCellUid(),
        content: (e: HTMLElement) => e.textContent ?? '',
        readOnly: (e: HTMLElement) => e.getAttribute('read-only') === 'true',
        lineNumber: (e: HTMLElement) =>
            e.getAttribute('line-number') === 'true',
    }

    /**
     * Initialize an instance of {@link PyCellView} from a DOM element `py-cell` in Markdown content
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
            readOnly: params.cellAttributes.readOnly ?? false,
            content: params.content,
            lineNumbers: params.cellAttributes.lineNumbers ?? false,
            onExecute: () => {
                this.state.execute(this.cellId).then(
                    () => {
                        /*No OP*/
                    },
                    () => {
                        throw Error(`Failed to execute cell ${this.cellId}`)
                    },
                )
            },
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
