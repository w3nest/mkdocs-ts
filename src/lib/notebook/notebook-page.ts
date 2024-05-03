import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { parseMd, MdParsingOptions, ViewGenerator } from '../markdown'
import { Router } from '../router'
import { from, of, take } from 'rxjs'
import { emptyScope, State } from './state'
import { JsCellView } from './js-cell-view'
import { MdCellView } from './md-cell-view'

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

function getCellOptions(
    elem: HTMLElement,
    overrides: CellCommonAttributes,
): CellCommonAttributes {
    const lineNumbers = elem.getAttribute('line-numbers')
    const readOnly = elem.getAttribute('read-only')

    return {
        ...defaultCellAttributes,
        ...(lineNumbers !== undefined
            ? { lineNumbers: lineNumbers === 'true' }
            : {}),
        ...(readOnly !== undefined ? { readOnly: readOnly === 'true' } : {}),
        ...overrides,
    }
}
export const notebookViews = ({
    state,
    cellOptions,
}: {
    state: State
    cellOptions: CellCommonAttributes
}) => {
    return {
        'cell-output': (elem) => {
            const cellId = elem.getAttribute('cell-id')
            const style = parseStyle(elem.getAttribute('style'))
            const classList = elem.getAttribute('class') || ''
            return state.registerDeportedOutputsView({
                cellId,
                style,
                classList,
            })
        },
        'js-cell': (elem) => {
            const id = elem.getAttribute('cell-id') || elem.getAttribute('id')
            const reactive = elem.getAttribute('reactive')
            const cell = new JsCellView({
                cellId: id,
                content: elem.textContent,
                state: state,
                cellAttributes: {
                    ...getCellOptions(elem, cellOptions),
                    reactive,
                },
            })
            state.appendCell(cell)
            return cell
        },
        'md-cell': (elem, parserOptions) => {
            const id = elem.getAttribute('cell-id') || elem.getAttribute('id')
            const cell = new MdCellView({
                cellId: id,
                content: elem.textContent,
                state: state,
                parserOptions,
                cellAttributes: getCellOptions(elem, cellOptions),
            })
            state.appendCell(cell)
            return cell
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
    public readonly state: State = new State({ initialScope: emptyScope })

    public readonly options: NotebookOptions

    /**
     * Constructs the page.
     *
     * @param params The parameters
     * @param params.url Url pointing to the markdown content, only used if the `src` attribute is not provided.
     * @param params.src Markdown source content. To fetch from a URL leave it empty & provide instead
     * the `url` attribute.
     * @param params.router Application's router.
     * @param params.parsingArguments Markdown parsing arguments.
     * @param params.options Global options for the page, in particular defined the default attribute for the various
     * cells.
     */
    constructor(params: {
        url?: string
        src?: string
        router: Router
        options?: NotebookOptions
    }) {
        Object.assign(this, params)
        if (params.src === undefined && params.url === undefined) {
            console.error(
                'Neither url or src parameter provided to the notebook page.',
            )
            return
        }
        const source$ =
            params.src !== undefined
                ? of(params.src)
                : from(fetch(this.url).then((resp) => resp.text())).pipe(
                      take(1),
                  )
        const cellOptions = {
            ...defaultCellAttributes,
            ...(params.options?.defaultCellAttributes || {}),
        }
        this.children = [
            {
                source$,
                vdomMap: (src: string) => {
                    const vdom = parseMd({
                        src,
                        router: this.router,
                        ...(this.options?.markdown || {}),
                        views: {
                            ...(this.options?.markdown?.views || {}),
                            ...notebookViews({
                                state: this.state,
                                cellOptions,
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
function parseStyle(styleString: string): { [k: string]: string } {
    if (!styleString) {
        return {}
    }
    const stylePairs = styleString.split(';')
    const styleObject = {}

    stylePairs.forEach((pair) => {
        const [property, value] = pair.split(':').map((s) => s.trim())
        if (property && value) {
            styleObject[property] = value
        }
    })

    return styleObject
}
