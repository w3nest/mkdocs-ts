import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { BehaviorSubject, filter, Observable, of } from 'rxjs'
import { SnippetEditorView, FutureCellView } from './cell-views'
import { CellTrait, ExecArgs, getCellUid, Scope, State } from './state'
import { CellCommonAttributes } from './notebook-page'
import { executeJs, executeJs$ } from './js-execution'
import { ContextTrait, Contextual } from '../context'

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
     * @param ctx Execution context used for logging and tracing.
     */
    @Contextual({ async: true, key: (args: ExecArgs) => args.cellId })
    async execute(args: ExecArgs, ctx?: ContextTrait): Promise<Scope> {
        if (this.cellAttributes.reactive) {
            return await executeJs$(
                {
                    ...args,
                    invalidated$: this.invalidated$,
                },
                ctx,
            )
        }
        return await executeJs(
            {
                ...args,
                invalidated$: this.invalidated$,
            },
            ctx,
        )
    }
}

/**
 *
 * Represents a Javascript cell within a {@link NotebookPage}.
 *
 * They are typically included from a DOM definition with tag name `js-cell` in MarkDown content,
 * see {@link JsCellView.FromDom}.
 *
 *
 * Details regarding the execution are provided in the documentation of {@link executeJs} for
 * non-reactive cells and {@link executeJs$} for reactive cells.
 */
export class JsCellView extends JsCellExecutor implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-JsCellView'
    public readonly tag = 'div'
    /**
     * Classes associated with the view.
     */
    public readonly class = JsCellView.CssSelector
    public readonly children: ChildrenLike

    /**
     * The encapsulated code editor view.
     */
    public readonly editorView: SnippetEditorView

    /**
     * Defines the methods to retrieve constructor's arguments from the DOM element `js-cell` within
     * MarkDown content.
     *
     * <note level='warning'>
     * Be mindful of the conversion from `camelCase` to `kebab-case`.
     * </note>
     */
    static readonly FromDomAttributes = {
        cellId: (e: HTMLElement) =>
            e.getAttribute('cell-id') ?? e.getAttribute('id'),
        content: (e: HTMLElement) => e.textContent ?? '',
        readOnly: (e: HTMLElement) => e.getAttribute('read-only') === 'true',
        lineNumber: (e: HTMLElement) =>
            e.getAttribute('line-number') === 'true',
        reactive: (e: HTMLElement) => e.getAttribute('reactive') === 'true',
    }

    /**
     * Initialize an instance of {@link JsCellView} from a DOM element `js-cell` in MarkDown content
     *  (the parameter `state` is automatically provided).
     *
     * <note level="hint" label="Constructor's attributes mapping">
     *  The static property {@link JsCellView.FromDomAttributes | FromDomAttributes}
     *  defines the mapping between the DOM element and the constructor's attributes.
     * </note>
     *
     * @param _p
     * @param _p.elem The DOM element.
     * @param _p.state The page state.
     */
    static FromDom({ elem, state }: { elem: HTMLElement; state: State }) {
        const params = {
            cellId: JsCellView.FromDomAttributes.cellId(elem) ?? getCellUid(),
            content: JsCellView.FromDomAttributes.content(elem),
            cellAttributes: {
                readOnly: JsCellView.FromDomAttributes.readOnly(elem),
                lineNumber: JsCellView.FromDomAttributes.lineNumber(elem),
                reactive: JsCellView.FromDomAttributes.reactive(elem),
            },
        }
        return new JsCellView({ ...params, state })
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
        cellAttributes: JsCellAttributes
    }) {
        const editorView = new SnippetEditorView({
            language: 'javascript',
            readOnly: params.cellAttributes.readOnly,
            content: params.content,
            lineNumbers: params.cellAttributes.lineNumbers,
            onExecute: () => {
                this.state.execute(this.cellId).then(
                    () => {
                        /*No OP*/
                    },
                    (e: unknown) => {
                        console.error(
                            `Failed to execute cell ${this.cellId}`,
                            e,
                        )
                    },
                )
            },
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
