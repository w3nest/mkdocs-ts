import {
    AnyVirtualDOM,
    attr$,
    ChildrenLike,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'
import { CellCommonAttributes } from './notebook-page'
import {
    CellTrait,
    ExecArgs,
    ExecCellError,
    getCellUid,
    Scope,
    State,
} from './state'
import { SnippetEditorView, FutureCellView } from './cell-views'
import { BehaviorSubject, filter, Observable } from 'rxjs'
import {
    BackendClient,
    executeInterpreter,
    executeInterpreter$,
} from './interpreter-execution'
import { faIconTyped } from './fa-icons'

/**
 * Defines the request and response structure for the `/run` endpoint
 * a backend should implement to be used as interpreter.
 */
export interface InterpreterApi {
    /**
     * API definition of the (single) `/run` endpoint to implement.
     */
    /**
     * Request payload.
     */
    body: {
        /**
         * Unique identifier for the executing cell.
         */
        cellId: string
        /**
         * Code snippet to be executed.
         */
        code: string
        /**
         * Key-value map of variables captured from the executing cell.
         *
         * **All values must be serializable.**
         */
        capturedIn: Record<string, unknown>
        /**
         * List of variable names to extract as output after execution.
         */
        capturedOut: string[]
    }

    /**
     * Expected response from the backend interpreter.
     */
    response: {
        /**
         * Standard output generated during execution.
         */
        output: string
        /**
         * Standard error output, if any.
         */
        error?: Omit<ExecCellError, 'scopeIn' | 'src'>
        /**
         * Key-value map of captured output variables.
         *
         * **All values must be serializable.**
         */
        capturedOut: Record<string, unknown>
    }
}

/**
 * All attributes available for a {@link InterpreterCellView}.
 */
export type InterpreterCellAttributes = CellCommonAttributes & {
    /**
     * Name (exported symbol) of the JavaScript HTTP client used as an interpreter.
     */
    interpreter: string
    /**
     * Language used for syntax highlighting in the editor.
     */
    language: 'javascript' | 'python' | 'unknown'
    /**
     * Captured variable name forwarded to the interpreter as input.
     * In the `interpreter-cell` DOM element, it is the attribute `captured-in` with
     * value defining the name of captured variables separated by space.
     */
    capturedIn: string[]
    /**
     * Captured variable name forwarded from the interpreter as output.
     * In the `interpreter-cell` DOM element, it is the attribute `captured-out` with
     * value defining the name of captured variables separated by space.
     */
    capturedOut: string[]
}

/**
 *
 * Represents a cell that runs using a dedicated backend interpreter within a {@link NotebookPage}.
 *
 * They are typically included from a DOM definition with tag name `interpreter-cell` in MarkDown content,
 * see {@link InterpreterCellView.FromDom}.
 */
export class InterpreterCellView implements VirtualDOM<'div'>, CellTrait {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-InterpreterCellView'
    public readonly tag = 'div'
    /**
     * Classes associated with the view.
     */
    public readonly class = InterpreterCellView.CssSelector
    public readonly children: ChildrenLike
    /**
     * Cell's ID.
     */
    public readonly cellId: string
    /**
     * Cell's attributes.
     */
    public readonly cellAttributes: InterpreterCellAttributes
    /**
     * State manager, owned by the parent {@link NotebookPage}.
     */
    public readonly state: State

    public readonly editorView: SnippetEditorView
    /**
     * Observable over the source content of the cell.
     */
    public readonly content$: BehaviorSubject<string>

    /**
     * Emit when the cell is invalidated.
     */
    public readonly invalidated$: Observable<unknown>

    /**
     * Current state regarding whether the cell is reactive.
     */
    public readonly reactive$ = new BehaviorSubject(false)

    /**
     * Defines the methods to retrieve constructor's arguments from the DOM element `interpreter-cell` within
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
        interpreter: (e: HTMLElement) => {
            const interpreter = e.getAttribute('interpreter')
            if (interpreter === null) {
                throw Error(
                    "An interpreter cell should define an 'interpreter'",
                )
            }
            return interpreter
        },
        language: (e: HTMLElement) =>
            (e.getAttribute('language') ?? 'unknown') as unknown as
                | 'javascript'
                | 'python'
                | 'unknown',
        capturedIn: (e: HTMLElement) =>
            (e.getAttribute('captured-in') ?? '')
                .split(' ')
                .filter((c) => c !== ''),
        capturedOut: (e: HTMLElement) =>
            (e.getAttribute('captured-out') ?? '')
                .split(' ')
                .filter((c) => c !== ''),
    }
    /**
     * Initialize an instance of {@link InterpreterCellView} from a DOM element `interpreter-cell` in MarkDown content
     *  (the parameter `state` is automatically provided).
     *
     * <note level="hint" label="Constructor's attributes mapping">
     *  The static property {@link InterpreterCellView.FromDomAttributes | FromDomAttributes}
     *  defines the mapping between the DOM element and the constructor's attributes.
     * </note>
     *
     * @param _p
     * @param _p.elem The DOM element.
     * @param _p.state The page state.
     */
    static FromDom({ elem, state }: { elem: HTMLElement; state: State }) {
        const params = {
            cellId:
                InterpreterCellView.FromDomAttributes.cellId(elem) ??
                getCellUid(),
            content: InterpreterCellView.FromDomAttributes.content(elem),
            cellAttributes: {
                readOnly: InterpreterCellView.FromDomAttributes.readOnly(elem),
                lineNumber:
                    InterpreterCellView.FromDomAttributes.lineNumber(elem),
                interpreter:
                    InterpreterCellView.FromDomAttributes.interpreter(elem),
                language: InterpreterCellView.FromDomAttributes.language(elem),
                capturedIn:
                    InterpreterCellView.FromDomAttributes.capturedIn(elem),
                capturedOut:
                    InterpreterCellView.FromDomAttributes.capturedOut(elem),
            },
        }
        return new InterpreterCellView({ ...params, state })
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
        cellAttributes: InterpreterCellAttributes
    }) {
        Object.assign(this, params)
        this.invalidated$ = this.state.invalidated$.pipe(
            filter((cellId) => cellId === this.cellId),
        )
        this.editorView = new SnippetEditorView({
            language: this.cellAttributes.language,
            readOnly: false,
            content: params.content,
            lineNumbers: this.cellAttributes.lineNumbers ?? false,
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
        this.content$ = this.editorView.content$
        this.children = [
            new FutureCellView({
                language: this.cellAttributes.language,
                cellId: this.cellId,
                state: this.state,
                editorView: {
                    tag: 'div',
                    children: [this.headerView(), this.editorView],
                },
                cellAttributes: this.cellAttributes,
                reactive$: this.reactive$,
            }),
        ]
    }

    /**
     * Execute the cell.
     *
     * @param args See {@link ExecArgs}.
     */
    async execute({ scope, src, output$, error$ }: ExecArgs): Promise<Scope> {
        const compatibleCells = this.state.cells
            .filter((cell) => cell instanceof InterpreterCellView)
            .filter(
                (cell: InterpreterCellView) =>
                    cell.cellAttributes.interpreter ===
                    this.cellAttributes.interpreter,
            )
        const currentIndex = compatibleCells.indexOf(this)
        const capturedIn = this.cellAttributes.capturedIn.reduce(
            (acc, name) => {
                return { ...acc, [name]: scope.const[name] || scope.let[name] }
            },
            {},
        )
        const isReactive =
            Object.values(capturedIn).find(
                (v) => v instanceof Observable || v instanceof Promise,
            ) !== undefined

        const body = {
            cellId: this.cellId,
            previousCellIds: compatibleCells
                .slice(0, currentIndex)
                .map((cell) => cell.cellId),
            code: src,
            capturedIn,
            capturedOut: this.cellAttributes.capturedOut,
        }
        this.reactive$.next(isReactive)
        const interpreter = scope.const[
            this.cellAttributes.interpreter
        ] as BackendClient
        if (isReactive) {
            return executeInterpreter$({
                body,
                interpreter,
                scope,
                output$,
                error$,
                invalidated$: this.invalidated$,
            })
        }
        return executeInterpreter({
            body,
            interpreter,
            scope,
            output$,
            error$,
        })
    }

    private headerView(): AnyVirtualDOM {
        const title: AnyVirtualDOM = {
            tag: 'div',
            class: 'd-flex align-items-center px-2',
            children: [
                faIconTyped('fa-network-wired'),
                {
                    tag: 'i',
                    class: 'px-2',
                },
                {
                    tag: 'div',
                    style: { fontWeight: 'bolder' },
                    innerText: this.cellAttributes.interpreter,
                },
            ],
        }
        const separator: AnyVirtualDOM = {
            tag: 'div',
            class: 'mx-2',
        }
        return {
            tag: 'div',
            class: 'd-flex align-items-center mkdocs-bg-info',
            children: [
                title,
                separator,
                new DropDownCaptureView({
                    mode: 'in',
                    variables: this.cellAttributes.capturedIn,
                }),
                separator,
                new DropDownCaptureView({
                    mode: 'out',
                    variables: this.cellAttributes.capturedOut,
                }),
            ],
        }
    }
}

export class DropDownCaptureView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-DropDownCaptureView'
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = `${DropDownCaptureView.CssSelector} d-flex flex-column justify-content-center`
    public readonly style = {
        fontSize: 'small',
        position: 'relative' as const,
    }

    public readonly onblur: () => void
    public readonly connectedCallback?: (element: RxHTMLElement<'div'>) => void
    public readonly disconnectedCallback?: (
        element: RxHTMLElement<'div'>,
    ) => void

    constructor(params: { mode: 'in' | 'out'; variables: string[] }) {
        if (params.variables.filter((v) => v !== '').length === 0) {
            return
        }
        const icons = {
            in: faIconTyped('fa-sign-in-alt', { withClass: 'mx-1' }),
            out: faIconTyped('fa-sign-out-alt', { withClass: 'mx-1' }),
        }
        const expanded$ = new BehaviorSubject(false)
        this.onblur = () => {
            expanded$.next(false)
        }
        const onOutsideClick = () => {
            expanded$.next(false)
        }
        this.connectedCallback = () => {
            document.addEventListener('click', onOutsideClick)
        }
        this.disconnectedCallback = () => {
            document.removeEventListener('click', onOutsideClick)
        }
        this.children = [
            {
                tag: 'button',
                class: `btn btn-sm py-0 btn-secondary  d-flex align-items-center`,
                type: 'button',
                children: [
                    params.mode === 'in'
                        ? {
                              tag: 'div',
                              innerText: 'In',
                              class: 'mx-1',
                          }
                        : undefined,
                    icons[params.mode],
                    params.mode === 'out'
                        ? {
                              tag: 'div',
                              innerText: 'Out',
                              class: 'mx-1',
                          }
                        : undefined,
                    {
                        tag: 'i',
                        class: 'mx-1',
                    },
                    faIconTyped('fa-caret-down'),
                ],
                onclick: (ev) => {
                    ev.stopPropagation()
                    expanded$.next(!expanded$.value)
                },
            },
            {
                tag: 'div',
                class: attr$({
                    source$: expanded$,
                    vdomMap: (e): string => (e ? '' : 'd-none'),
                    wrapper: (d) => `${d} p-1 px-2 mkdocs-bg-0 border rounded`,
                }),
                style: {
                    position: 'absolute',
                    top: '100%',
                    minWidth: '100%',
                    zIndex: 1,
                },
                children: params.variables.map((v) => ({
                    tag: 'div',
                    class: 'd-flex align-items-center',
                    children: [
                        faIconTyped('fa-dot-circle'),
                        {
                            tag: 'i',
                            class: 'mx-1',
                        },
                        {
                            tag: 'div',
                            innerText: v,
                        },
                    ],
                })),
            },
        ]
    }
}
