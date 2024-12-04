import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { CodeSnippetView } from '../md-widgets'
import { BehaviorSubject, filter, Observable } from 'rxjs'
import { SnippetEditorView, FutureCellView } from './cell-views'
import { CellTrait, ExecArgs, getCellUid, Scope, State } from './state'
import { CellCommonAttributes } from './notebook-page'
import { DropDownCaptureView } from './interpreter-cell-view'
import { executeWorkersPool, executeWorkersPool$ } from './worker-execution'
import type { WorkersPoolTypes } from '@w3nest/webpm-client'

/**
 * All attributes available for a 'worker' cell.
 */
export type WorkerCellAttributes = CellCommonAttributes & {
    /**
     * Name (exported symbol) of the worker's pool used to execute the code.
     */
    workersPool: string
    /**
     * Whether to interpret code as JavaScript or Python (pyodide) snippet.
     */
    mode: 'javascript' | 'python'
    /**
     * The names of the captured variables forwarded to the worker along with the processing task.
     */
    capturedIn: string[]
    /**
     * The names of the captured variable name forwarded to the main-thread from the worker.
     */
    capturedOut: string[]
}

/**
 *
 * Represents a worker cell within a {@link NotebookPage}.
 *
 * They are typically included from a DOM definition with tag name `worker-cell` in Markdown content,
 * see {@link WorkerCellView.FromDom}.
 */
export class WorkerCellView implements VirtualDOM<'div'>, CellTrait {
    public readonly tag = 'div'
    /**
     * Classes associated with the view.
     */
    public readonly class = 'mknb-JsCellView'
    public readonly children: ChildrenLike
    /**
     * Cell's ID.
     */
    public readonly cellId: string
    /**
     * Cell's attributes.
     */
    public readonly cellAttributes: WorkerCellAttributes
    /**
     * State manager, owned by the parent {@link NotebookPage}.
     */
    public readonly state: State

    /**
     * The encapsulated code editor view.
     */
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
     * Defines the methods to retrieve constructor's arguments from the DOM element `worker-cell` within
     * MarkDown content.
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
        workersPool: (e: HTMLElement) => {
            const wp = e.getAttribute('workers-pool')
            if (!wp) {
                throw Error('No worker pool has been bound to the cell')
            }
            return wp
        },
        mode: (e: HTMLElement) =>
            e.getAttribute('mode') as unknown as 'javascript' | 'python',
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
     * Initialize an instance of {@link WorkerCellView} from a DOM element `worker-cell` in Markdown content
     *  (the parameter `state` is automatically provided).
     *
     * <note level="hint" label="Constructor's attributes mapping">
     *  The static property {@link WorkerCellView.FromDomAttributes | FromDomAttributes}
     *  defines the mapping between the DOM element and the constructor's attributes.
     * </note>
     *
     * @param _p
     * @param _p.elem The DOM element.
     * @param _p.state The page state.
     */
    static FromDom({ elem, state }: { elem: HTMLElement; state: State }) {
        const params = {
            cellId: WorkerCellView.FromDomAttributes.cellId(elem),
            content: WorkerCellView.FromDomAttributes.content(elem),
            cellAttributes: {
                readOnly: WorkerCellView.FromDomAttributes.readOnly(elem),
                lineNumber: WorkerCellView.FromDomAttributes.lineNumber(elem),
                workersPool: WorkerCellView.FromDomAttributes.workersPool(elem),
                mode: WorkerCellView.FromDomAttributes.mode(elem),
                capturedIn: WorkerCellView.FromDomAttributes.capturedIn(elem),
                capturedOut: WorkerCellView.FromDomAttributes.capturedOut(elem),
            },
        }
        return new WorkerCellView({ ...params, state })
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
        cellAttributes: WorkerCellAttributes
    }) {
        Object.assign(this, params)
        this.invalidated$ = this.state.invalidated$.pipe(
            filter((cellId) => cellId === this.cellId),
        )
        this.editorView = new SnippetEditorView({
            language: this.cellAttributes.mode,
            readOnly: false,
            content: params.content,
            lineNumbers: this.cellAttributes.lineNumbers ?? false,
            onExecute: () => {
                this.state.execute(this.cellId).then(
                    () => {
                        /*No OP*/
                    },
                    () => {
                        console.error(`Failed to executed ${this.cellId}`)
                    },
                )
            },
        })
        this.content$ = this.editorView.content$
        this.children = [
            new FutureCellView({
                language: this.cellAttributes.mode,
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
    async execute({ scope, src }: ExecArgs): Promise<Scope> {
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
        this.reactive$.next(isReactive)
        const workersPool = { ...scope.let, ...scope.const }[
            this.cellAttributes.workersPool
        ] as WorkersPoolTypes.WorkersPool
        if (isReactive) {
            return executeWorkersPool$({
                src,
                mode: this.cellAttributes.mode,
                workersPool,
                scope,
                invalidated$: this.invalidated$,
                capturedIn,
                capturedOut: this.cellAttributes.capturedOut,
            })
        }

        return executeWorkersPool({
            src,
            mode: this.cellAttributes.mode,
            workersPool,
            scope,
            capturedIn,
            capturedOut: this.cellAttributes.capturedOut,
        })
    }

    private headerView(): AnyVirtualDOM {
        const title: AnyVirtualDOM = {
            tag: 'div',
            class: 'd-flex align-items-center px-2',
            children: [
                {
                    tag: 'i',
                    class: 'fas fa-cog',
                },
                {
                    tag: 'i',
                    class: 'px-2',
                },
                {
                    tag: 'div',
                    style: { fontWeight: 'bolder' },
                    innerText: this.cellAttributes.workersPool,
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
