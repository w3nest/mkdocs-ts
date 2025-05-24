import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { CellCommonAttributes } from './notebook-page'
import {
    CellTrait,
    ExecArgs,
    ExecCellError,
    getCellUid,
    Output,
    Scope,
    State,
} from './state'
import { SnippetEditorView, FutureCellView } from './cell-views'
import {
    BehaviorSubject,
    filter,
    Observable,
    of,
    ReplaySubject,
    Subject,
} from 'rxjs'
import type { MdParsingOptions } from '../markdown'
import { executeJsStatement } from './js-execution'
import { DisplayFactory } from './display-utils'
import { Dependencies } from '.'
import { ContextTrait } from '../context'

/**
 * All attributes available for a Markdown cell are the common ones for now.
 */
export type MdCellAttributes = CellCommonAttributes

export class InlinedCode implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly style = {
        display: 'inline-block' as const,
    }
    public readonly cellId: string
    public readonly src: string
    public readonly displayFactory: DisplayFactory
    public readonly scope: Scope
    public readonly children: ChildrenLike
    public readonly invalidated$: Observable<unknown>

    constructor(params: {
        cellId: string
        src: string
        scope: Scope
        displayFactory: DisplayFactory
        invalidated$: Observable<unknown>
        error$: Subject<ExecCellError | undefined>
        load: (
            path: string,
            ctx: ContextTrait,
        ) => Promise<Record<string, unknown>>
    }) {
        Object.assign(this, params)
        const output$ = new ReplaySubject<Output>()

        executeJsStatement({
            cellId: this.cellId,
            src: this.src,
            scope: this.scope,
            output$,
            displayFactory: this.displayFactory,
            invalidated$: this.invalidated$,
            error$: params.error$,
            load: params.load,
        }).then(
            () => {
                /*No Op*/
            },
            () => {
                throw Error(
                    `InlinedCode failed to execute in markdown cell: ${this.src}`,
                )
            },
        )
        this.children = [
            child$({
                source$: output$.pipe(filter((d) => d !== undefined)),
                vdomMap: (vDom) => vDom,
            }),
        ]
    }
}
/**
 *
 * Represents a Markdown cell within a {@link NotebookPage}.
 *
 * They are typically included from a DOM definition with tag name `md-cell` in Markdown content,
 * see {@link MdCellView.FromDom}.
 */
export class MdCellView implements VirtualDOM<'div'>, CellTrait {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-MdCellView'
    public readonly tag = 'div'
    /**
     * Classes associated with the view.
     */
    public readonly class = MdCellView.CssSelector
    public readonly children: ChildrenLike
    /**
     * Cell's ID.
     */
    public readonly cellId: string
    /**
     * Cell's Attributes.
     */
    public readonly cellAttributes: MdCellAttributes
    /**
     * State manager, owned by the parent {@link NotebookPage}.
     */
    public readonly state: State
    /**
     * Encapsulated editor view.
     */
    public readonly editorView: SnippetEditorView
    /**
     * Observable over the source content of the cell.
     */
    public readonly content$: BehaviorSubject<string>

    /**
     * Options for parsing Markdown code.
     */
    public readonly parserOptions: MdParsingOptions
    /**
     * Emit when the cell is invalidated.
     */
    public readonly invalidated$: Observable<unknown>

    /**
     * Defines the methods to retrieve constructor's arguments from the DOM element `md-cell` within
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
     * Initialize an instance of {@link MdCellView} from a DOM element `md-cell` in Markdown content
     *  (the parameter `state` & `parserOptions` are automatically provided).
     *
     * <note level="hint" label="Constructor's attributes mapping">
     *  The static property {@link MdCellView.FromDomAttributes | FromDomAttributes}
     *  defines the mapping between the DOM element and the constructor's attributes.
     * </note>
     *
     * @param _p
     * @param _p.elem The DOM element.
     * @param _p.parserOptions Markdown parsing options.
     * @param _p.state The page state.
     */
    static FromDom({
        elem,
        parserOptions,
        state,
    }: {
        elem: HTMLElement
        parserOptions: MdParsingOptions
        state: State
    }) {
        const params = {
            cellId: MdCellView.FromDomAttributes.cellId(elem),
            content: MdCellView.FromDomAttributes.content(elem),
            cellAttributes: {
                readOnly: MdCellView.FromDomAttributes.readOnly(elem),
                lineNumber: MdCellView.FromDomAttributes.lineNumber(elem),
            },
        }
        return new MdCellView({ ...params, parserOptions, state })
    }
    /**
     * Initialize a new instance.
     *
     * @param params
     * @param params.cellId The cell's ID.
     * @param params.content The cell's content.
     * @param params.state The page's state.
     * @param params.parserOptions Markdown parsing options.
     * @param params.cellAttributes Cell's attributes.
     */
    constructor(params: {
        cellId: string
        content: string
        state: State
        parserOptions: MdParsingOptions
        cellAttributes: MdCellAttributes
    }) {
        Object.assign(this, params)
        this.invalidated$ = this.state.invalidated$.pipe(
            filter((cellId) => cellId === this.cellId),
        )
        this.editorView = new SnippetEditorView({
            language: 'markdown',
            readOnly: false,
            content: params.content,
            lineNumbers: this.cellAttributes.lineNumbers,
            onExecute: () => {
                this.state.execute(this.cellId).then(
                    () => {
                        /*No OP*/
                    },
                    () => {
                        throw Error(
                            `Failed to execute the Mardown cell with content: ${params.content}`,
                        )
                    },
                )
            },
        })
        this.content$ = this.editorView.content$
        this.children = [
            new FutureCellView({
                language: 'markdown',
                cellId: this.cellId,
                state: this.state,
                editorView: this.editorView,
                cellAttributes: this.cellAttributes,
                reactive$: of(false),
            }),
        ]
    }

    /**
     * Execute the cell. Because markdown cell can include other cells, this function own a dedicated {@link State}.
     *
     * @param args See {@link ExecArgs}.
     */
    async execute({
        scope,
        owningState,
        cellId,
        src,
        displayFactory,
        output$,
        error$,
        load,
    }: ExecArgs): Promise<Scope> {
        const state = new State({
            initialScope: scope,
            parent: { state: owningState, cellId },
            router: this.state.router,
        })
        const patchSrc = src
            .replace(/\${/g, '<js-inlined>')
            .replace(/}\$/g, '</js-inlined>')

        const vdom = Dependencies.parseMd({
            src: patchSrc,
            ...this.parserOptions,
            views: {
                'js-inlined': (elem) => {
                    return new InlinedCode({
                        cellId,
                        src: elem.textContent ?? '',
                        scope,
                        displayFactory,
                        invalidated$: this.invalidated$,
                        error$,
                        load,
                    })
                },
                ...state.getCellsFactory(),
            },
        })
        output$.next(vdom)
        return await state.execute(state.ids.slice(-1)[0])
    }
}
