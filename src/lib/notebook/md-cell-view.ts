import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { CodeSnippetView } from '../md-widgets'
import { CellCommonAttributes, notebookViews } from './notebook-page'
import { CellTrait, ExecArgs, Output, Scope, State } from './state'
import { SnippetEditorView, FutureCellView } from './cell-views'
import { BehaviorSubject, filter, Observable, ReplaySubject } from 'rxjs'
import { parseMd, MdParsingOptions } from '../markdown'
import { JsCellAttributes } from './js-cell-view'
import { executeJsStatement } from './js-execution'

/**
 * All attributes available for a Markdown cell are the common ones for now.
 */
export type MdCellAttributes = CellCommonAttributes

export class InlinedCode implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly style = {
        display: 'inline-block' as const,
    }
    public readonly src: string
    public readonly scope: Scope
    public readonly children: ChildrenLike
    public readonly invalidated$: Observable<unknown>

    constructor(params: {
        src: string
        scope: Scope
        invalidated$: Observable<unknown>
    }) {
        Object.assign(this, params)
        const output$ = new ReplaySubject<Output>()

        executeJsStatement({
            src: this.src,
            scope: this.scope,
            output$,
            invalidated$: this.invalidated$,
        })
        this.children = [
            {
                source$: output$.pipe(filter((d) => d != undefined)),
                vdomMap: (vDom: AnyVirtualDOM) => vDom,
            },
        ]
    }
}
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

    public readonly parserOptions: MdParsingOptions
    public readonly invalidated$: Observable<unknown>

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
    async execute({
        scope,
        owningState,
        cellId,
        src,
        output$,
    }: ExecArgs): Promise<Scope> {
        const state = new State({
            initialScope: scope,
            parent: { state: owningState, cellId },
        })
        const patchSrc = src
            .replace(/\${/g, '<js-inlined>')
            .replace(/}\$/g, '</js-inlined>')

        const vdom = parseMd({
            src: patchSrc,
            ...this.parserOptions,
            views: {
                'js-inlined': (elem) => {
                    return new InlinedCode({
                        src: elem.textContent,
                        scope,
                        invalidated$: this.invalidated$,
                    })
                },
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
