import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import type { MdParsingOptions, ViewGenerator } from '../markdown'
import { Router } from '../router'
import { from, of, take } from 'rxjs'
import { Scope, State } from './state'
import { DisplayFactory } from './display-utils'
import { Dependencies } from './index'

/**
 * The common set for attributes of a notebook cell.
 *
 * When provided from a DOM element in the markdown source, they are defined using kebab case:
 * ```
 * <some-cell line-numbers='true' read-only='false'></some-cell>
 * ```
 */
export type CellCommonAttributes = {
    /**
     * Whether to display line numbers on cell.
     */
    lineNumbers?: boolean
    /**
     * Whether the cell is readonly.
     */
    readOnly?: boolean
}

/**
 * Default values for {@link CellCommonAttributes}.
 */
export const defaultCellAttributes: CellCommonAttributes = {
    lineNumbers: false,
    readOnly: false,
}

/**
 * Global options for a {@link NotebookPage}.
 */
export type NotebookOptions = {
    /**
     * Whether to run all the cells of a notebook page when loaded.
     */
    runAtStart?: boolean
    /**
     * The default values for cell's attribute.
     */
    defaultCellAttributes?: CellCommonAttributes

    /**
     * Options for markdown parsing.
     */
    markdown?: MdParsingOptions
}

export const notebookViews = ({ state }: { state: State }) => {
    return {
        'cell-output': (elem: HTMLElement) => {
            return state.createDeportedOutputsView(elem)
        },
        'js-cell': (elem: HTMLElement) => {
            return state.createJsCell(elem)
        },
        'md-cell': (elem: HTMLElement, parserOptions: MdParsingOptions) => {
            return state.createMdCell(elem, parserOptions)
        },
        'py-cell': (elem: HTMLElement) => {
            return state.createPyCell(elem)
        },
        'interpreter-cell': (elem: HTMLElement) => {
            return state.createInterpreterCell(elem)
        },
        'worker-cell': (elem: HTMLElement) => {
            return state.createWorkerCell(elem)
        },
    }
}

/**
 * Represents a page of a notebook.
 *
 * A notebook page is a markdown content including definition of executable cells
 * (*e.g.* {@link JsCellView}, {@link MdCellView}) as well as other related components.
 *
 * Cells run in the order of inclusion, and share their top level scope.
 */
export class NotebookPage implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-NotebookPage'
    public readonly url: string
    public readonly views: { [k: string]: ViewGenerator }
    public readonly router: Router
    public readonly children: ChildrenLike = []

    /**
     * State manager.
     */
    public readonly state: State

    public readonly options: NotebookOptions

    /**
     * Constructs the page.
     *
     * @param params The parameters
     * @param params.url Url pointing to the markdown content, only used if the `src` attribute is not provided.
     * @param params.src Markdown source content. To fetch from a URL leave it empty & provide instead
     * the `url` attribute.
     * @param params.router Application's router.
     * @param params.initialScope Initial scope provided to the first executing cell.
     * @param params.displayFactory Additional custom {@link DisplayFactory} invoked when `display` is used.
     * @param params.options Global options for the page, in particular defined the default attribute for the various
     * cells.
     */
    constructor(params: {
        url?: string
        src?: string
        router: Router
        initialScope?: Partial<Scope>
        displayFactory?: DisplayFactory
        options?: NotebookOptions
    }) {
        Object.assign(this, params)
        if (params.src === undefined && params.url === undefined) {
            console.error(
                'Neither url or src parameter provided to the notebook page.',
            )
            return
        }
        this.state = new State({
            router: this.router,
            displayFactory: params.displayFactory,
            initialScope: params.initialScope,
        })

        const source$ =
            params.src !== undefined
                ? of(params.src)
                : from(fetch(this.url).then((resp) => resp.text())).pipe(
                      take(1),
                  )

        this.children = [
            {
                source$,
                vdomMap: (src: string) => {
                    const vdom = Dependencies.parseMd({
                        src,
                        router: this.router,
                        ...(this.options?.markdown || {}),
                        views: {
                            ...(this.options?.markdown?.views || {}),
                            ...notebookViews({
                                state: this.state,
                            }),
                        },
                    })
                    if (params?.options?.runAtStart) {
                        this.state.execute(this.state.ids.slice(-1)[0]).then()
                    }
                    return vdom
                },
            },
        ]
    }
}
