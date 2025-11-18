import {
    attr$,
    AttributeLike,
    child$,
    ChildrenLike,
    CSSAttribute,
    RenderingUpdate,
    RxHTMLElement,
    sync$,
    VirtualDOM,
} from 'rx-vdom'
import {
    parseMd,
    isResolvedTarget,
    ContextTrait,
    MdParsingOptions,
    Contextual,
} from 'mkdocs-ts'
import {
    BehaviorSubject,
    combineLatest,
    delay,
    filter,
    from,
    map,
    Observable,
    of,
    skip,
    Subject,
    take,
} from 'rxjs'
import {
    cellFingerprint,
    CellTrait,
    NotebookStateParameters,
    State,
} from './state'
import { SnippetEditorView } from './cell-views'
import { NotebookOptions, NotebookViewParameters } from './notebook-page'

export class EditableState extends State {
    constructor(
        params: NotebookStateParameters & {
            parent?: { state: State; cellId: string }
        },
        ctx?: ContextTrait,
    ) {
        super(params, ctx)
    }

    @Contextual()
    sync({ cellIds }: { cellIds: string[] }, ctx?: ContextTrait) {
        // TODO: cellIds.length == 0
        ctx?.info('Sync cells', {
            newCellIds: cellIds,
            oldCellIds: [...this.ids],
        })

        const oldIds = [...this.ids]
        const deletedIds = this.ids.filter((id) => !cellIds.includes(id))
        const newCells = cellIds
            .map((cellId) => {
                const cell = this.cells.find((c) => c.cellId === cellId)
                return cell
            })
            .filter((c) => c !== undefined)

        this.ids.splice(0, this.ids.length, ...cellIds)
        this.cells.splice(0, this.cells.length, ...newCells)

        let lastSyncedCellId = this.ids.find(
            (cellId) => this.cellsStatus$[cellId].value === 'ready',
        )

        if (this.ids[0] !== oldIds[0]) {
            this.scopes$[this.ids[0]].next(this.initialScope)
            lastSyncedCellId = this.ids[0]
        }
        let broken = false
        const preservedEnteringScopes: Record<string, unknown> = {}
        for (let i = 0; i < this.ids.length - 1; i++) {
            const cellId = this.ids[i]
            const nextCellId = this.ids[i + 1]
            if (broken) {
                ctx?.info(`Cell ${cellId}#${i} out-of-date`, {
                    lastSyncedCellId,
                    preservedEnteringScopes,
                })
                this.scopes$[this.ids[i]].next(undefined)
                continue
            }
            const outputScope =
                i < oldIds.length - 1
                    ? this.exitScopes$[cellId].value
                    : undefined

            if (cellId === oldIds[i]) {
                ctx?.info(`Cell ${cellId}#${i} up-to-date`, {
                    nextCell: this.ids[i + 1],
                    nextCellScope: outputScope,
                })
                preservedEnteringScopes[nextCellId] = outputScope
                this.scopes$[nextCellId].next(outputScope)
            }
            if (this.ids[i] !== oldIds[i]) {
                ctx?.info(`First out-of-date cell: ${this.ids[i]}#${i}`)
                broken = true
                lastSyncedCellId = this.ids[i]
            }
        }
        if (lastSyncedCellId) {
            this.unreadyCells({ afterCellId: lastSyncedCellId })
        }
        ctx?.info('Sync Summary', { lastSyncedCellId, preservedEnteringScopes })
        deletedIds.forEach((cellId) => {
            delete this.cellsStatus$[cellId]
            delete this.outputs$[cellId]
            delete this.errors$[cellId]
            delete this.executing$[cellId]
            delete this.src$[cellId]
            delete this.exitScopes$[cellId]
            delete this.scopes$[cellId]
        })
        ctx?.info('State', this)
    }
}

export class EditableNotebookPage implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    /**
     * Options provided to the `constructor`.
     */
    public readonly options?: NotebookOptions
    public readonly url: string
    public readonly context?: ContextTrait

    public readonly state: EditableState
    public readonly mode$ = new BehaviorSubject<'edit' | 'display'>('display')
    /**
     * Constructs the page.
     *
     * @param params The parameters, see {@link NotebookViewParameters}.
     * @param ctx Execution context used for logging and tracing.
     */
    constructor(params: NotebookViewParameters, ctx?: ContextTrait) {
        Object.assign(this, params)
        const initialContent$ =
            params.src === undefined
                ? from(
                      fetch(params.url as string).then((resp) => resp.text()),
                  ).pipe(take(1))
                : of(params.src)
        const content$ = new Subject<string>()
        initialContent$.subscribe((c) => content$.next(c))
        this.state = new EditableState(
            {
                router: params.router,
                displayFactory: params.displayFactory,
                initialScope: params.initialScope,
            },
            ctx,
        )
        this.options = params.options
        this.context = ctx

        this.plugKeyboardEvents()

        const style$ = this.getStyle$()

        this.children = [
            {
                tag: 'div',
                class: 'd-flex w-100',
                style: {
                    overflow: 'hidden',
                },
                children: [
                    new MdEditor(
                        {
                            content$,
                            mode$: this.mode$,
                            style$,
                        },
                        this.context,
                    ),
                    new ReactiveNotebookPage(
                        {
                            state: this.state,
                            content$,
                            style$,
                            options: params.options,
                        },
                        this.context,
                    ),
                ],
            },
        ]
    }

    private plugKeyboardEvents() {
        // Attach key listener
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ctrl/Cmd
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key === 'ArrowRight'
            ) {
                event.preventDefault()
                this.mode$.next('display')
            }

            // Ctrl/Cmd + ArrowLeft
            if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowLeft') {
                event.preventDefault()
                this.mode$.next('edit')
            }
        }
        window.addEventListener('keydown', handleKeyDown)
    }

    private getStyle$() {
        return attr$({
            source$: this.mode$,
            vdomMap: (mode) =>
                mode === 'display'
                    ? {
                          transform: 'translate(-100%)',
                          minWidth: '100%',
                      }
                    : {
                          transform: 'translate(-0%)',
                      },
            wrapper: (d) => ({
                ...d,
                transition: 'transform 0.2s ease-in-out',
                minWidth: '100%',
            }),
        })
    }
}

class MdEditor implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100'
    public readonly style: AttributeLike<CSSAttribute>
    public readonly children: ChildrenLike

    constructor(
        {
            content$,
            mode$,
            style$,
        }: {
            content$: Subject<string>
            mode$: Observable<'edit' | 'display'>
            style$: AttributeLike<CSSAttribute>
        },
        ctx?: ContextTrait,
    ) {
        this.style = style$
        this.children = [
            child$({
                source$: content$.pipe(take(1)),
                vdomMap: (content: string) => {
                    const editor = new SnippetEditorView({
                        language: 'markdown',
                        content,
                    })
                    combineLatest([editor.content$, mode$])
                        .pipe(
                            filter(([_, mode]) => mode === 'display'),
                            skip(1),
                        )
                        .subscribe(([c]) => {
                            ctx?.info('Markdown source Updated')
                            content$.next(c)
                        })
                    return editor
                },
            }),
        ]
    }
}

class ReactiveNotebookPage implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 d-flex flex-column'
    public readonly style: AttributeLike<CSSAttribute>
    public readonly children: ChildrenLike

    public readonly scrollToDelay = 200

    public readonly connectedCallback?: (element: RxHTMLElement<'div'>) => void

    public readonly state: EditableState

    constructor(
        {
            state,
            content$,
            style$,
            options,
        }: {
            state: EditableState
            content$: Subject<string>
            style$: AttributeLike<CSSAttribute>
            options?: NotebookOptions
        },
        ctx?: ContextTrait,
    ) {
        this.state = state
        this.style = style$
        const cellsFactory = (
            state: State,
            cells: Record<string, CellTrait>,
        ) => {
            const deportedOutput = (elem: HTMLElement) => {
                return state.createDeportedOutputsView(elem)
            }
            const factory = Object.entries(State.CellsFactory).reduce(
                (acc, [k, v]) => {
                    const fct = (
                        elem: HTMLElement,
                        parserOptions: MdParsingOptions,
                    ) => {
                        const cell = v({ state, elem, parserOptions })
                        const fp = cellFingerprint(cell)
                        cells[fp] = cell
                        const sameCell = this.state.cells.find(
                            (existingCell) =>
                                cellFingerprint(existingCell) === fp,
                        )
                        if (!sameCell) {
                            this.state.appendCell(cell)
                        }
                        if (sameCell) {
                            cells[fp] = sameCell
                        }
                        return cell
                    }
                    return { ...acc, [k]: fct }
                },
                {
                    'cell-output': deportedOutput,
                },
            )
            return factory
        }
        this.connectedCallback = () => {
            const state = this.state
            state.router.target$
                .pipe(
                    take(1),
                    filter((page) => isResolvedTarget(page)),
                    filter((page) => page.sectionId !== undefined),
                    delay(this.scrollToDelay),
                )
                .subscribe((page) => {
                    state.router.scrollTo(page.sectionId)
                })
        }

        let cells: Record<string, CellTrait> = {}
        const blocks$ = content$.pipe(
            map((content) => {
                const state = this.state
                cells = {}
                const parsed = parseMd({
                    src: content,
                    router: state.router,
                    ...(options?.markdown ?? {}),
                    annotations: {
                        fingerprint: true,
                        processedContent: true,
                    },
                    views: {
                        ...(options?.markdown?.views ?? {}),
                        ...cellsFactory(state, cells),
                    },
                })
                if (!parsed.children) {
                    return []
                }
                const root = parsed.children[0] as HTMLElement
                const blocks = root.children
                return Array.from(blocks)
            }),
        )
        this.children = sync$({
            policy: 'sync',
            source$: blocks$,
            vdomMap: (block: HTMLElement) => {
                return { tag: 'div', children: [block] }
            },
            comparisonOperator: (a: HTMLElement, b: HTMLElement) =>
                a.dataset.fingerprint === b.dataset.fingerprint,
            orderOperator: (d0, d1, update) => {
                return update.indexOf(d0) - update.indexOf(d1)
            },
            sideEffects: (_, updates) => {
                this.syncState({ cells, updates }, ctx)
            },
        })
    }

    @Contextual()
    syncState(
        {
            cells,
            updates,
        }: {
            updates: RenderingUpdate<Element>
            cells: Record<string, CellTrait>
        },
        ctx?: ContextTrait,
    ) {
        ctx?.info('vDOM updates', updates)
        ctx?.info('New cells w/ FP', cells)

        this.state.sync(
            { cellIds: Object.values(cells).map((c) => c.cellId) },
            ctx,
        )
    }
}
