import {
    AnyVirtualDOM,
    child$,
    ChildrenLike,
    CSSAttribute,
    VirtualDOM,
    AttributeLike,
} from 'rx-vdom'
import { NavHeader, NavigationView } from './navigation.view'
import { Router } from '../router'
import { FooterView, PageView } from './page.view'
import {
    BehaviorSubject,
    distinctUntilChanged,
    map,
    Observable,
    ReplaySubject,
    Subject,
} from 'rxjs'
import { FavoritesView } from './favorites.view'
import { ExpandableLeftSide, ExpandableRightSide } from './expandable.view'
import { TocWrapperView } from './toc.view'
import { AnyView, Resolvable } from '../navigation.node'

export type DisplayMode = 'pined' | 'hidden' | 'expanded'

/**
 * Hints regarding sizing of the side navigation panels on the page.
 *
 * See {@link defaultDisplayOptions}.
 */
export interface SidePanelLayoutOptions {
    /**
     * Top maximum padding of the left side panels, collapsing to `topStickyPaddingMin` when scrolling down.
     * If a navigation header is provided, the header should fit into it.
     */
    topStickyPaddingMax: string

    /**
     * Top minimum padding of the left side panels, extending to `topStickyPaddingMax` when scrolling up.
     */
    topStickyPaddingMin: string

    /**
     * Bottom maximum padding of the left side panels.
     * If a navigation footer is provided, the header should fit into it.
     */
    bottomStickyPaddingMax: string
}
/**
 * Hints regarding sizing of the main elements on the page.
 *
 * The 'page' element refers to the text-content area.
 *
 * See {@link defaultDisplayOptions}.
 *
 *
 * @typeParam T Extra display options that can be used for other kind of layout based on the default layout.
 */
export type DisplayOptions<
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    ExtraDisplayOption extends Record<string, unknown> = {},
> = SidePanelLayoutOptions & {
    /**
     * Screen size in pixel transitioning from pined Navigation panel, to
     * collapsable one.
     */
    toggleNavWidth: number
    /**
     * Screen size in pixel transitioning from pined TOC panel, to
     * collapsable one.
     */
    toggleTocWidth: number
    /**
     * Minimum width for the TOC panel in pixel.
     */
    tocMinWidth: number
    /**
     * Maximum width for the TOC panel in pixel.
     */
    tocMaxWidth: number
    /**
     * Minimum width for the navigation panel in pixel.
     */
    navMinWidth: number
    /**
     * Maximum width for the navigation panel in pixel.
     */
    navMaxWidth: number
    /**
     * Page's width.
     */
    pageWidth: string
    /**
     * Translation duration for panels in ms.
     */
    translationTime: number
} & ExtraDisplayOption

/**
 * Default values of {@link DisplayOptions}.
 */
export const defaultDisplayOptions: DisplayOptions = {
    toggleTocWidth: 1500,
    tocMinWidth: 250,
    tocMaxWidth: 400,
    toggleNavWidth: 1300,
    navMaxWidth: 500,
    navMinWidth: 300,
    pageWidth: '35rem',
    translationTime: 400,
    topStickyPaddingMax: '2rem',
    topStickyPaddingMin: '10px',
    bottomStickyPaddingMax: '2rem',
}

/**
 * Represents a function that defines the structure and behavior of a layout
 * element view. This type allows customization of layout components.
 *
 * @typeParam TView The target type of view.
 */
export type LayoutElementView<TView extends AnyView = AnyView> = ({
    router,
    displayModeNav$,
    displayModeToc$,
    layoutOptions,
}: {
    // Application's router
    router: Router
    // Current display mode regarding navigation.
    displayModeNav$: Subject<DisplayMode>
    // Current display mode regarding table of content.
    displayModeToc$: Subject<DisplayMode>
    // The layout options provided.
    layoutOptions: DisplayOptions
}) => TView

/**
 * Parameters to construct a new default layout {@link Layout} (also used by the layout {@link LayoutWithCompanion}).
 *
 * @typeParam T Extra display options that can be used for other kind of layout based on the default layout.
 */
export interface DefaultLayoutParams<
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    ExtraDisplayOption extends Record<string, unknown> = {},
> {
    /**
     * Application router.
     */
    router: Router<NavLayout, NavHeader>
    /**
     * An optional content generator for the page, defaulting to {@link PageView}.
     *
     * The provided type must emit itself as an `HTMLElement` through the `content$` observable
     * whenever it completes an update triggered by a change in the navigation path.
     */
    page?: LayoutElementView<AnyView & { content$: ReplaySubject<HTMLElement> }>
    /**
     * Optional custom header view to use at the top of the in navigation panel, empty if not provided.
     */
    sideNavHeader?: LayoutElementView
    /**
     * Optional custom header view to use at the bottom of the in navigation panel, empty if not provided.
     */
    sideNavFooter?: LayoutElementView
    /**
     * Display options, mostly regarding sizing of the main elements in the page. Values provided - if any -
     * are merged with {@link defaultDisplayOptions}.
     */
    displayOptions?: Partial<DisplayOptions<ExtraDisplayOption>>
    /**
     * If provided, include a {@link BookmarksView} column at the very left, as well as a
     * <button class='btn btn-sm btn-light fas fa-bookmark'></button> toggle button in the navigation node's header.
     * The consumer should provide this variable initialized with the URL for initial bookmarked pages.
     */
    bookmarks$?: BehaviorSubject<string[]>
}
/**
 * Dynamic options (defined in {@link Navigation}) for {@link Layout}.
 * Static options are provided in {@link Layout} constructor.
 */
export type NavLayout =
    | {
          /**
           * This function represents the view of the table of content in the page.
           *
           * @param p arguments of the view generator:
           *   *  html : Content of the HTML page
           *   *  router : Router instance.
           * @returns A promise on the view
           */
          toc?: (p: { html: HTMLElement; router: Router }) => Promise<AnyView>
          /**
           * This function represents the view of the main content.
           *
           * @param router Router instance.
           * @returns A resolvable view
           */
          content: ({ router }: { router: Router }) => Resolvable<AnyView>
      }
    | (({ router }: { router: Router }) => Resolvable<AnyView>)

/**
 * Represents the default layout of the library.
 *
 * **Structure**
 *
 * This layout is organized into a column-based structure, proceeding from left to right:
 *
 * - {@link BookmarksView}:  An optional slim column dedicated to bookmarks. Users can dynamically
 *   add or remove bookmarks at runtime.
 *
 * - {@link NavigationView}: The navigation panel that provides access to the various underlying  {@link Navigation}'s
 * node.
 *
 * - {@link PageView}: The primary content area displaying the content of the selected navigation node.
 *
 * - {@link TOCView}: The table of contents view, offering quick access to structured content.
 *
 * **Responsive Behavior**
 *
 * On smaller screens, the navigation and TOC views may collapse into an expandable menu for better usability.
 *
 * Depending on the screen size, the navigation and TOC views can be collapsed into an expandable menu.
 *
 * **Configuration**
 *
 *  For detailed configuration options, see {@link DefaultLayoutParams}.
 */
export class Layout implements VirtualDOM<'div'> {
    public readonly layoutOptions: DisplayOptions = defaultDisplayOptions

    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class =
        'mkdocs-DefaultLayoutView d-flex flex-column h-100 w-100 overflow-y-auto overflow-x-hidden'

    /**
     * The display mode regarding the navigation panel.
     */
    public readonly displayModeNav$ = new BehaviorSubject<DisplayMode>('pined')
    /**
     * The display mode regarding the table of content.
     */
    public readonly displayModeToc$ = new BehaviorSubject<DisplayMode>('pined')

    public readonly connectedCallback: (e: HTMLElement) => undefined

    public readonly style = {
        position: 'relative' as const,
    }
    /**
     * Initializes a new instance.
     *
     * @param params See {@link DefaultLayoutParams}.
     */
    constructor(params: DefaultLayoutParams) {
        const {
            router,
            page,
            sideNavHeader,
            sideNavFooter,
            displayOptions,
            bookmarks$,
        } = params
        this.layoutOptions = Object.assign(
            this.layoutOptions,
            displayOptions ?? {},
        )
        this.connectedCallback = (e: HTMLElement) => {
            this.plugResizer(e)
            router.setScrollableElement(e)
        }
        const viewInputs = {
            router,
            displayModeNav$: this.displayModeNav$,
            displayModeToc$: this.displayModeToc$,
            layoutOptions: this.layoutOptions,
        }

        const defaultNavHeader = {
            tag: 'div' as const,
            style: {
                height: this.layoutOptions.topStickyPaddingMax,
            },
        }
        const contentView = page
            ? page(viewInputs)
            : new PageView({ router: router })
        const pageView: AnyVirtualDOM = {
            tag: 'div' as const,
            class: `flex-grow-1 ${this.layoutOptions.topStickyPaddingMax} px-3`,
            style: {
                width: this.layoutOptions.pageWidth,
                height: 'fit-content',
                minHeight: '100vh',
                minWidth: '0px',
            },
            children: [defaultNavHeader, contentView],
        }

        const favoritesView = new FavoritesView({
            router,
            bookmarks$: bookmarks$ ?? new BehaviorSubject([]),
            displayMode$: this.displayModeNav$,
            topStickyPaddingMax: this.layoutOptions.topStickyPaddingMax,
            bottomStickyPaddingMax: this.layoutOptions.bottomStickyPaddingMax,
        })
        const navView = new NavigationView({
            router,
            layoutOptions: this.layoutOptions,
            bookmarks$,
        })
        const navHeaderView = sideNavHeader?.(viewInputs) ?? defaultNavHeader
        const footerView = {
            tag: 'footer' as const,
            style: {
                position: 'sticky' as const,
                top: '100%',
            },
            children: [
                sideNavFooter ? sideNavFooter(viewInputs) : new FooterView(),
            ],
        }
        const leftSideNav = {
            tag: 'div' as const,
            class: 'd-flex flex-grow-1',
            children: [
                bookmarks$
                    ? new StickyColumnContainer({
                          type: 'favorites',
                          content: favoritesView,
                          layoutOptions: this.layoutOptions,
                          header: defaultNavHeader,
                      })
                    : undefined,
                new StickyColumnContainer({
                    type: 'nav',
                    content: navView,
                    layoutOptions: this.layoutOptions,
                    header: navHeaderView,
                    footer: footerView,
                }),
            ],
        }
        const expandableLeftSideNav = new ExpandableLeftSide({
            favoritesView,
            navView,
        })
        const tocView = new TocWrapperView({
            router,
            displayMode$: this.displayModeToc$,
            layoutOptions: this.layoutOptions,
            content$: contentView.content$,
        })
        const rightSideNav = new StickyColumnContainer({
            type: 'toc',
            content: tocView,
            layoutOptions: this.layoutOptions,
            header: defaultNavHeader,
        })
        const expandableRightSideNav = new ExpandableRightSide({
            tocView,
            layoutOptions: this.layoutOptions,
        })

        const hSep = {
            tag: 'div' as const,
            class: 'flex-grow-1',
        }
        const switchMode = (
            mode$: Observable<DisplayMode>,
            pined: AnyVirtualDOM,
            expandable: AnyVirtualDOM,
        ) =>
            child$({
                source$: mode$.pipe(
                    map((mode) => (mode === 'pined' ? 'pined' : 'expandable')),
                    distinctUntilChanged(),
                ),
                vdomMap: (mode: 'pined' | 'expandable') =>
                    mode === 'pined' ? pined : expandable,
            })

        this.children = [
            {
                tag: 'div',
                class: 'w-100',
                children: [
                    {
                        tag: 'div',
                        class: 'd-flex w-100',
                        children: [
                            switchMode(
                                this.displayModeNav$,
                                leftSideNav,
                                expandableLeftSideNav,
                            ),
                            hSep,
                            pageView,
                            hSep,
                            switchMode(
                                this.displayModeToc$,
                                rightSideNav,
                                expandableRightSideNav,
                            ),
                        ],
                    },
                ],
            },
        ]
    }

    private plugResizer(thisElement: HTMLElement) {
        const switcher = (
            width: number,
            treshold: number,
            displayMode$: BehaviorSubject<DisplayMode>,
        ) => {
            if (width > treshold) {
                displayMode$.next('pined')
            }
            if (width <= treshold && displayMode$.value === 'pined') {
                displayMode$.next('hidden')
            }
        }
        const resizeObserver = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width
            switcher(
                width,
                this.layoutOptions.toggleTocWidth,
                this.displayModeToc$,
            )
            switcher(
                width,
                this.layoutOptions.toggleNavWidth,
                this.displayModeNav$,
            )
        })
        resizeObserver.observe(thisElement)
    }
}

type Container = 'favorites' | 'nav' | 'toc'

export class StickyColumnContainer implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class: AttributeLike<string>
    public readonly style: AttributeLike<CSSAttribute>
    public readonly children: ChildrenLike
    public readonly layoutOptions: Partial<SidePanelLayoutOptions>
    public readonly header?: AnyView
    public readonly content: AnyView
    public readonly footer?: AnyView
    public readonly type: Container

    constructor(params: {
        type: Container
        content: AnyView
        layoutOptions: Partial<SidePanelLayoutOptions>
        header?: AnyView
        footer?: AnyView
    }) {
        Object.assign(this, params)
        const layoutOptions = {
            ...defaultDisplayOptions,
            ...this.layoutOptions,
        }
        const colors: Record<Container, string> = {
            favorites: 'mkdocs-bg-6 mkdocs-text-6',
            nav: 'mkdocs-bg-5 mkdocs-text-5',
            toc: 'mkdocs-bg-0 mkdocs-text-0',
        }
        const stickyStyle = StickyColumnContainer.stickyStyle(layoutOptions)
        if (this.content instanceof HTMLElement) {
            for (const [key, value] of Object.entries(stickyStyle)) {
                this.content.style[key] = value as unknown as string
            }
        } else {
            this.content.style = {
                ...(this.content.style ?? {}),
                ...StickyColumnContainer.stickyStyle(layoutOptions),
            }
        }
        const flexGrow = params.type === 'favorites' ? 0 : 1
        const stickyPadingTop = this.layoutOptions.topStickyPaddingMax
        const color = colors[this.type]
        this.class = `mkdocs-StickyColumnContainer flex-grow-${String(flexGrow)} ${color} ${stickyPadingTop ?? ''} d-flex flex-column`

        this.children = [this.header, this.content, this.footer]
    }

    static stickyStyle(layoutOptions: SidePanelLayoutOptions): CSSAttribute {
        const height = `calc( 100vh - ${layoutOptions.topStickyPaddingMax} - ${layoutOptions.bottomStickyPaddingMax})`
        return {
            position: 'sticky',
            top: layoutOptions.topStickyPaddingMin,
            height,
            maxHeight: height,
        }
    }
}
