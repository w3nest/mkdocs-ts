import { AnyVirtualDOM, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { CodeSnippetView } from '../md-widgets'
import { CellCommonAttributes } from './notebook-page'
import { CellTrait, ExecArgs, Scope, State } from './state'
import { SnippetEditorView, FutureCellView } from './cell-views'
import { BehaviorSubject, filter, from, Observable } from 'rxjs'
import { install } from '@w3nest/webpm-client'
import {
    BackendClient,
    executeInterpreter,
    executeInterpreter$,
} from './interpreter-execution'

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
    language: 'javascript' | 'python'
    /**
     * Captured variable name forwarded to the interpreter as input.
     * In the `interpreter-cell` DOM element, it is the attribute `captured-in` with
     * value defining the name of captured variables separated by space.
     */
    capturedIn?: string[]
    /**
     * Captured variable name forwarded from the interpreter as output.
     * In the `interpreter-cell` DOM element, it is the attribute `captured-out` with
     * value defining the name of captured variables separated by space.
     */
    capturedOut?: string[]
}

/**
 *
 * Represents a cell that runs using a dedicated backend interpreter within a {@link NotebookPage}.
 *
 * They are typically included from a DOM definition with tag name `interpreter-cell` in MarkDown content,
 * see {@link InterpreterCellView.FromDom}.
 */
export class InterpreterCellView implements VirtualDOM<'div'>, CellTrait {
    public readonly tag = 'div'
    /**
     * Classes associated with the view.
     */
    public readonly class = 'mknb-InterpreterCellView'
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

    public readonly editorView: CodeSnippetView
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
            e.getAttribute('cell-id') || e.getAttribute('id'),
        content: (e: HTMLElement) => e.textContent,
        readOnly: (e: HTMLElement) => e.getAttribute('read-only') === 'true',
        lineNumber: (e: HTMLElement) =>
            e.getAttribute('line-number') === 'true',
        interpreter: (e: HTMLElement) => e.getAttribute('interpreter'),
        language: (e: HTMLElement) =>
            e.getAttribute('language') as unknown as 'javascript' | 'python',
        capturedIn: (e: HTMLElement) =>
            (e.getAttribute('captured-in') || '')
                .split(' ')
                .filter((c) => c !== ''),
        capturedOut: (e: HTMLElement) =>
            (e.getAttribute('captured-out') || '')
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
            cellId: InterpreterCellView.FromDomAttributes.cellId(elem),
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
            lineNumbers: this.cellAttributes.lineNumbers,
            onExecute: () => {
                this.state.execute(this.cellId).then(
                    () => {},
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
    async execute({ scope, src, output$ }: ExecArgs): Promise<Scope> {
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
        const interpreter = window[
            this.cellAttributes.interpreter
        ] as unknown as BackendClient
        if (isReactive) {
            return executeInterpreter$({
                body,
                interpreter,
                scope,
                output$,
                invalidated$: this.invalidated$,
            })
        }
        return executeInterpreter({
            body,
            interpreter,
            scope,
            output$,
        })
    }

    private headerView(): AnyVirtualDOM {
        const title: AnyVirtualDOM = {
            tag: 'div',
            class: 'd-flex align-items-center px-2',
            children: [
                {
                    tag: 'i',
                    class: 'fas fa-network-wired',
                },
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
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = 'dropdown d-flex flex-column justify-content-center'
    public readonly style = {
        fontSize: 'small',
    }
    constructor(params: { mode: 'in' | 'out'; variables: string[] }) {
        if (params.variables.filter((v) => v !== '').length === 0) {
            return
        }
        const icons = {
            in: 'fa-sign-in-alt',
            out: 'fa-sign-out-alt',
        }
        this.children = [
            {
                tag: 'button',
                id: 'dropdownMenuButton',
                class: `btn btn-sm py-0 btn-secondary dropdown-toggle d-flex align-items-center`,
                type: 'button',
                customAttributes: {
                    dataToggle: 'dropdown',
                    ariaHaspopup: 'true',
                    ariaExpanded: 'false',
                },
                children: [
                    params.mode === 'in' && {
                        tag: 'div',
                        innerText: 'In',
                        class: 'mx-1',
                    },
                    {
                        tag: 'i',
                        class: `fas ${icons[params.mode]} mx-1`,
                    },
                    params.mode === 'out' && {
                        tag: 'div',
                        innerText: 'Out',
                        class: 'mx-1',
                    },
                ],
            },
            child$({
                source$: from(install({ modules: ['bootstrap#^4.4.1'] })),
                vdomMap: () => ({
                    tag: 'div',
                    class: 'dropdown-menu py-1',
                    customAttributes: {
                        ariaLabelledBy: 'dropdownMenuButton',
                    },
                    style: {
                        lineHeight: '0.8rem',
                    },
                    children: params.variables.map((v) => ({
                        tag: 'div',
                        class: 'dropdown-item d-flex align-items-center',
                        children: [
                            {
                                tag: 'i',
                                class: 'fas fa-dot-circle',
                            },
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
                }),
            }),
        ]
    }
}
