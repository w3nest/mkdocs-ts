import { child$, ChildrenLike, RxHTMLElement, VirtualDOM } from 'rx-vdom'
import {
    parseMd,
    isResolvedTarget,
    Router,
    ContextTrait,
    NoContext,
    MdParsingOptions,
    ViewGenerator,
} from 'mkdocs-ts'
import { delay, filter, from, of, take } from 'rxjs'
import { NotebookStateParameters, State } from './state'
import { faIconTyped } from './fa-icons'

/**
 * The common set for attributes of a notebook cell.
 *
 * When provided from a DOM element in the markdown source, they are defined using kebab case:
 * ```
 * <some-cell line-numbers='true' read-only='false'></some-cell>
 * ```
 */
export interface CellCommonAttributes {
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
export interface NotebookOptions {
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

/**
 * Parameters to instantiate a notebook view - either a whole page as ({@link NotebookPage}), or a single section
 * ({@link NotebookSection}).
 */
export type NotebookViewParameters = NotebookStateParameters & {
    /**
     * Url pointing to the markdown content, only used if the `src` attribute is not provided.
     */
    url?: string
    /**
     * Markdown source content. To fetch from a URL leave it empty & provide instead
     * the `url` attribute.
     */
    src?: string
    /**
     * Global options for the page, in particular defined the default attribute for the various
     */
    options?: NotebookOptions
}
/**
 * Represents a section of a page included notebook cells.
 *
 * A notebook page is a markdown content including definition of executable cells
 * (*e.g.* {@link JsCellView}, {@link MdCellView}) as well as other related components.
 *
 * Cells run in the order of inclusion, and share their top level scope.
 */
export class NotebookSection implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-NotebookSection'
    public readonly scrollToDelay = 200

    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = NotebookSection.CssSelector
    public readonly url: string
    public readonly views: Record<string, ViewGenerator>
    public readonly router: Router
    public readonly children: ChildrenLike = []

    /**
     * State manager.
     */
    public readonly state: State

    /**
     * Options provided to the `constructor`.
     */
    public readonly options?: NotebookOptions

    public readonly context?: ContextTrait
    /**
     * Constructs the page.
     *
     * @param params The parameters, see {@link NotebookViewParameters}.
     * @param params.onDisplayed Callback triggered when the view has been displayed
     * cells.
     * @param ctx Execution context used for logging and tracing.
     */
    constructor(
        params: NotebookViewParameters & {
            onDisplayed?: (elem: RxHTMLElement<'div'>) => void
        },
        ctx?: ContextTrait,
    ) {
        Object.assign(this, params)
        this.context = ctx ?? new NoContext()
        const context = this.context.start('new NotebookPage', ['Notebook'])

        if (params.src === undefined && params.url === undefined) {
            console.error(
                'Neither url or src parameter provided to the notebook page.',
            )
            return
        }
        this.state = new State(
            {
                router: this.router,
                displayFactory: params.displayFactory,
                initialScope: params.initialScope,
            },
            context,
        )

        const source$ =
            params.src === undefined
                ? from(fetch(this.url).then((resp) => resp.text())).pipe(
                      take(1),
                  )
                : of(params.src)

        this.children = [
            child$({
                source$,
                untilFirst: faIconTyped('fa-spinner', { spin: true }),
                vdomMap: (src) => {
                    const start = Date.now()
                    const vdom = parseMd({
                        src,
                        router: this.router,
                        ...(this.options?.markdown ?? {}),
                        views: {
                            ...(this.options?.markdown?.views ?? {}),
                            ...this.state.getCellsFactory(context),
                        },
                    })
                    const end = Date.now()
                    context.info(
                        `Markdown parsed in: ${String(end - start)} ms`,
                    )
                    return {
                        ...vdom,
                        connectedCallback: (elem: RxHTMLElement<'div'>) => {
                            context.info(
                                `View added in viewport (took ${String(Date.now() - end)} ms)`,
                            )
                            vdom.connectedCallback?.(elem)
                            if (params.onDisplayed) {
                                params.onDisplayed(elem)
                            }

                            if (params.options?.runAtStart) {
                                const lastCellId = this.state.ids.slice(-1)[0]
                                context.info(
                                    `Trigger page execution from cell ${lastCellId}`,
                                    {
                                        options: params.options,
                                        cellIds: [...this.state.ids],
                                    },
                                )
                                const start = Date.now()
                                this.state
                                    .execute(lastCellId, true, context)
                                    .then(
                                        (scope) => {
                                            const end = Date.now()
                                            context.info(
                                                `Notebook execution time: ${String(end - start)} ms`,
                                                { scope },
                                            )
                                        },
                                        (e: unknown) => {
                                            console.error(
                                                `Failed to run notebook.`,
                                                e,
                                            )
                                        },
                                    )
                            }
                        },
                        disconnectedCallback: () => {
                            this.state.dispose()
                        },
                    }
                },
            }),
        ]
        context.exit()
    }
}

/**
 * Represents a {@link NotebookSection} that actually defines the whole page content of a document.
 */
export class NotebookPage extends NotebookSection {
    public readonly scrollToDelay = 200

    /**
     * Constructs the page.
     *
     * @param params The parameters, see {@link NotebookViewParameters}.
     * @param ctx Execution context used for logging and tracing.
     */
    constructor(params: NotebookViewParameters, ctx?: ContextTrait) {
        super(
            {
                ...params,
                onDisplayed: () => {
                    this.router.target$
                        .pipe(
                            take(1),
                            filter((page) => isResolvedTarget(page)),
                            filter((page) => page.sectionId !== undefined),
                            delay(this.scrollToDelay),
                        )
                        .subscribe((page) => {
                            this.router.scrollTo(page.sectionId)
                        })
                },
            },
            ctx,
        )
    }
}
