import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { CodeSnippetView } from '../md-widgets'
import { CellCommonAttributes } from './notebook-page'
import { CellTrait, ExecArgs, Scope, State } from './state'
import { SnippetEditorView, FutureCellView } from './cell-views'
import { BehaviorSubject, filter, from, Observable } from 'rxjs'
import { install } from '@youwol/webpm-client'
import {
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
 * Represents a cell that runs using a dedicated backend interpreter.
 *
 * They are typically included from a DOM definition with tag name `interpreter-cell`, in this case
 * associated attributes are provided as DOM attributes; see {@link InterpreterCellAttributes}.
 */
export class InterpreterCellView implements VirtualDOM<'div'>, CellTrait {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-InterpreterCellView'
    public readonly children: ChildrenLike
    public readonly cellId: string
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

    public readonly invalidated$: Observable<unknown>

    public readonly reactive$ = new BehaviorSubject(false)

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
            onExecute: () => this.state.execute(this.cellId).then(() => {}),
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
        const fromCellId =
            currentIndex === 0
                ? undefined
                : compatibleCells[currentIndex - 1].cellId

        const isReactive =
            Object.values(capturedIn).find(
                (v) => v instanceof Observable || v instanceof Promise,
            ) !== undefined

        const body = {
            cellId: this.cellId,
            fromCellId,
            code: src,
            capturedIn,
            capturedOut: this.cellAttributes.capturedOut,
        }
        const interpreter = window[this.cellAttributes.interpreter]
        if (isReactive) {
            this.reactive$.next(true)
            return executeInterpreter$({
                body,
                interpreter,
                scope,
                output$,
                invalidated$: this.invalidated$,
            })
        }
        this.reactive$.next(false)
        return executeInterpreter({ body, interpreter, scope, output$ })
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
        if (params.variables.filter((v) => v !== '').length == 0) {
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
            {
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
            },
        ]
    }
}
