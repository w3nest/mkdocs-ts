import {
    AnyVirtualDOM,
    child$,
    ChildrenLike,
    CSSAttribute,
    VirtualDOM,
    AttributeLike,
    attr$,
    RxHTMLElement,
    ChildLike,
    EmptyDiv,
} from 'rx-vdom'
import { NavHeader, NavigationView } from './navigation.view'
import { Router } from '../router'
import { PageView, WrapperPageView } from './page.view'
import {
    BehaviorSubject,
    combineLatest,
    distinctUntilChanged,
    map,
    Observable,
    ReplaySubject,
    Subject,
    take,
} from 'rxjs'

import { ExpandableNavColumn, ExpandableTocColumn } from './small-screen.view'
import { TocWrapperView } from './toc.view'
import { AnyView, Resolvable } from '../navigation.node'
import { ContextTrait, NoContext } from '../context'
import { EmptyTopBanner, TopBanner, TopBannerSpec } from './top-banner.view'
import { FooterWrapper } from './footer.view'

/**
 * Represents the display mode for UI components, controlling their visibility and behavior.
 *
 * **Possible Values**:
 *
 * - `'pined'`:
 *   The component remains fixed and always visible, regardless of user interaction.
 *
 * - `'hidden'`:
 *   The component is not visible and does not occupy space in the layout.
 *
 * - `'expanded'`:
 *   The component is fully visible and occupies its allocated space, often as a primary focus.
 *
 * This type is typically used to configure the visibility states of side panel elements.
 */
export type DisplayMode = 'pined' | 'hidden' | 'expanded' | 'removed'

/**
 * Hints regarding sizing of the main elements on the page.
 *
 * The 'page' element refers to the text-content area.
 *
 * See {@link defaultDisplayOptions}.
 *
 * @typeParam T Extra display options that can be used for other kind of layout based on the default layout.
 */
export type DisplayOptions<
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    ExtraDisplayOption extends Record<string, unknown> = {},
> = {
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
     * The maximum width constraint for the favorites column.
     * Accepts any valid CSS width value (e.g., '10rem', '80vw', 'max-content').
     */
    favoritesMaxWidth: string
    /**
     * Page's width.
     */
    pageWidth: string
    /**
     * Page's vertical padding.
     */
    pageVertPadding: string
    /**
     * Translation duration for panels in ms.
     */
    translationTime: number

    /**
     * If defined, force the TOC display mode to this value.
     */
    forceTocDisplayMode: DisplayMode | undefined

    /**
     * If defined, force the Nav display mode to this value.
     */
    forceNavDisplayMode: DisplayMode | undefined
} & ExtraDisplayOption

/**
 * Default values of {@link DisplayOptions}.
 */
export const defaultDisplayOptions: DisplayOptions = {
    toggleTocWidth: 1600,
    tocMinWidth: 250,
    tocMaxWidth: 400,
    favoritesMaxWidth: '5rem',
    toggleNavWidth: 1300,
    navMaxWidth: 500,
    navMinWidth: 300,
    pageWidth: '35rem',
    translationTime: 400,
    pageVertPadding: '3rem',
    forceTocDisplayMode: undefined,
    forceNavDisplayMode: undefined,
}

/**
 * Represents a function that defines the structure and behavior of a layout
 * element view. This type allows customization of layout components.
 *
 * @typeParam TView The target type of view.
 */
export type LayoutElementView<TView extends AnyView = AnyView> = (p: {
    // Application's router
    router: Router<NavLayout>
    // The layout options provided.
    layoutOptions: DisplayOptions
    // Current bookmarked URLs
    bookmarks$?: BehaviorSubject<string[]>
    // Sizings observable
    sizings$: Observable<Sizings>
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
     * Top banner specification.
     */
    topBanner?: TopBannerSpec
    /**
     * The page footer.
     */
    footer?: AnyView
    /**
     * An optional content generator for the page, replacing the default {@link PageView}.
     *
     * The provided type must emit itself as an `HTMLElement` through the `content$` observable
     * whenever it completes an update triggered by a change in the navigation path.
     */
    page?: LayoutElementView<AnyView & { content$: ReplaySubject<HTMLElement> }>
    /**
     * Display options, mostly regarding sizing of the main elements in the page. Values provided - if any -
     * are merged with {@link defaultDisplayOptions}.
     */
    displayOptions?: Partial<DisplayOptions<ExtraDisplayOption>>
    /**
     * Enables bookmarking functionality within navigation nodes.
     *
     * When provided, a <button class='btn btn-sm btn-light fas fa-bookmark'></button> toggle button
     * will appear in selected navigation node's header. This allows users to "pin" pages they want
     * to access quickly.
     *
     * It's typically used in conjunction with the {@link BookmarksView} component in the top banner,
     * which displays the list of bookmarks.
     *
     * The consumer should initialize this observable with the default list of bookmarked navigation paths.
     */
    bookmarks$?: BehaviorSubject<string[]>
}

/**
 * Types that can be used to define views in {@link NavLayout}.
 *
 * <note level="hint">
 * For scenario requiring reactivity of the view, an option is to use the `RxChild` type from `ChildLike`.
 * </note>
 */
export type NavLayoutView = Resolvable<AnyView> | ChildLike

/**
 * Defines the main content view of the page.
 * If a `string` is provided, its is interpreted as a URL from which a GET request is issued to retrieve some markdown
 * source that is then parsed using the {@link parseMd} function.
 *
 * @param params Parameters for generating the content view:
 * @param params.router The active Router instance.
 * @returns The content view.
 */
export type ClientContentView =
    | ((params: { router: Router<NavLayout> }) => NavLayoutView)
    | string

/**
 * Defines the view for the table of contents (TOC) within the page.
 *
 * @param params Parameters for generating the TOC view
 * @param params.html The main HTML content of the page, obtained from the `content` function.
 * @param params.router The active Router instance.
 * @returns The TOC view.
 */
export type ClientTocView = (params: {
    html: HTMLElement
    router: Router
}) => NavLayoutView

/**
 *  Marker for disabled TOC.
 */
export type DisabledTocMarker = 'disabled'
/**
 * Defines the `layout` structure for {@link Navigation} nodes, which determines how a page's content is rendered.
 *
 * These options apply to individual navigation nodes.
 * For global layout customizations, refer to the {@link Layout} constructor.
 */
export type NavLayout =
    | {
          /**
           * Defines the view for the table of contents (TOC) within the page.
           *
           * <note level="warning">
           * The function is invoked **only once** when the page content is first rendered.
           * If the TOC needs to be updated later due to content changes, this must be handled explicitly
           * (e.g., by using mutation observers).
           * </note>
           */
          toc?: DisabledTocMarker | ClientTocView

          /**
           * Defines the main content view of the page.
           */
          content: ClientContentView
      }
    | ClientContentView

export interface DisplayedRect {
    width: number
    height: number
}
/**
 */
export interface Sizings {
    app: DisplayedRect
    topBanner: DisplayedRect
    footer: DisplayedRect
    page: DisplayedRect
    scrollTop: number
    pageVisibleHeight: number
    navigation: DisplayedRect & { mode: DisplayMode }
    toc: DisplayedRect & { mode: DisplayMode }
}
/**
 * Represents the default layout of the library.
 *
 * **Structure**
 *
 * This layout is organized into a column-based structure, proceeding from left to right:
 *
 * - **Navigation Column**:
 *   The navigation panel provides access to the various  {@link Navigation} nodes, see {@link NavigationView}.
 *
 * - **Page Column**:
 *   Displays the content of the selected navigation node, by default using {@link PageView}.
 *   This column is customizable via {@link DefaultLayoutParams.page}.
 *
 * - **Table Of Content Column**:
 *   Provides quick access to structured content, by default using {@link TOCView}.
 *   Customization options are available through the `toc` attribute of {@link NavLayout},
 *   applicable to navigation nodes.
 *
 * The layout can optionally includes a top-banner and a footer.
 *
 * **Responsive Behavior**
 *
 * On smaller screens, the navigation and TOC columns collapse into an expandable menu for better usability.
 *
 * **Configuration**
 *
 *  For detailed configuration options, see {@link DefaultLayoutParams}.
 */
export class Layout implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-DefaultLayoutView'
    public readonly displayOptions: DisplayOptions = defaultDisplayOptions

    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = `${Layout.CssSelector} d-flex flex-column h-100 w-100 overflow-y-auto overflow-x-hidden`

    /**
     * The display mode regarding the navigation panel.
     */
    public readonly displayModeNav$ = new BehaviorSubject<DisplayMode>('pined')
    /**
     * The display mode regarding the table of content.
     */
    public readonly displayModeToc$ = new BehaviorSubject<DisplayMode>('pined')

    public readonly connectedCallback: (e: HTMLElement) => undefined

    private readonly context?: ContextTrait

    public readonly pageScrollTop$ = new BehaviorSubject(0)

    public readonly sizings$: Observable<Sizings>
    /**
     * Initializes a new instance.
     *
     * @param params See {@link DefaultLayoutParams}.
     * @param ctx Execution context used for logging and tracing.
     */
    constructor(params: DefaultLayoutParams, ctx?: ContextTrait) {
        this.context = ctx
        const context = this.ctx().start('new Layout', ['View'])
        const { router, page, topBanner, footer, displayOptions, bookmarks$ } =
            params
        this.displayOptions = Object.assign(
            this.displayOptions,
            displayOptions ?? {},
        )
        if (this.displayOptions.forceNavDisplayMode) {
            this.displayModeNav$.next(this.displayOptions.forceNavDisplayMode)
        }
        if (this.displayOptions.forceTocDisplayMode) {
            this.displayModeToc$.next(this.displayOptions.forceTocDisplayMode)
        }
        const appBoundingBox$ = new ReplaySubject<DOMRect>(1)
        this.connectedCallback = (e: RxHTMLElement<'div'>) => {
            this.plugResizer(e)
            router.setScrollableElement(e, ({ top, left, behavior }) =>
                this.sizings$.pipe(take(1)).subscribe((sizing) => {
                    e.scrollTo({
                        left,
                        behavior,
                        top: top ? top - sizing.topBanner.height : 0,
                    })
                }),
            )
            e.ownSubscriptions(
                router.path$.subscribe(() => {
                    if (this.displayModeNav$.value === 'expanded') {
                        this.displayModeNav$.next('hidden')
                    }
                }),
            )
            e.addEventListener('scroll', () => {
                this.pageScrollTop$.next(e.scrollTop)
            })
            const resizeObserver = new ResizeObserver(() => {
                appBoundingBox$.next(e.getBoundingClientRect())
            })
            resizeObserver.observe(e)
        }
        const viewInputs = {
            router,
            layoutOptions: this.displayOptions,
            bookmarks$,
            sizings$: this.sizings$,
        }

        const navigationBoundingBox$ = new ReplaySubject<DOMRect>(1)
        const tocBoundingBox$ = new ReplaySubject<DOMRect>(1)

        const topBannerView = topBanner
            ? new TopBanner({
                  router,
                  navigationBoundingBox$,
                  tocBoundingBox$,
                  displayMode$: this.displayModeNav$,
                  spec: topBanner,
              })
            : new EmptyTopBanner()

        const footerView = new FooterWrapper(footer)

        const contentView = page
            ? page(viewInputs)
            : new PageView({ router: router }, context)
        const pageView = new WrapperPageView({
            content: contentView,
            displayOptions: this.displayOptions,
            displayModeNav$: this.displayModeNav$,
            displayModeToc$: this.displayModeToc$,
            minHeight$: combineLatest([
                appBoundingBox$,
                topBannerView.boundingBox$,
                footerView.boundingBox$,
            ]).pipe(
                map(
                    ([appBB, topBB, footerBB]) =>
                        appBB.height - topBB.height - footerBB.height,
                ),
            ),
        })
        const navView = new NavigationView({
            router: router,
            displayOptions: this.displayOptions,
            bookmarks$: bookmarks$,
        })

        this.sizings$ = combineLatest([
            pageView.boundingBox$,
            topBannerView.boundingBox$,
            footerView.boundingBox$,
            appBoundingBox$,
            navigationBoundingBox$,
            tocBoundingBox$,
            this.pageScrollTop$,
            this.displayModeNav$,
            this.displayModeToc$,
        ]).pipe(
            map(
                ([
                    page,
                    topBanner,
                    footer,
                    app,
                    navigation,
                    toc,
                    t,
                    navMode,
                    tocMode,
                ]) => {
                    const remainingPageHeight = page.height - t
                    const pageVisibleHeight =
                        remainingPageHeight > app.height
                            ? app.height - topBanner.height
                            : remainingPageHeight
                    return {
                        app: { width: app.width, height: app.height },
                        page: { width: page.width, height: page.height },
                        scrollTop: t,
                        pageVisibleHeight,
                        topBanner: {
                            width: topBanner.width,
                            height: topBanner.height,
                        },
                        footer: {
                            width: footer.width,
                            height: footer.height,
                        },
                        navigation: {
                            width: navigation.width,
                            height: navigation.height,
                            mode: navMode,
                        },
                        toc: {
                            width: toc.width,
                            height: toc.height,
                            mode: tocMode,
                        },
                    }
                },
            ),
        )
        const wrapperSideNav = (
            type: 'nav' | 'toc',
            content: AnyVirtualDOM,
            bbox$: Subject<DOMRect>,
        ) => ({
            tag: 'div' as const,
            class: 'd-flex flex-grow-1',
            children: [
                new StickyColumnContainer({
                    type,
                    content,
                    sizings$: this.sizings$,
                }),
            ],
            connectedCallback: (e: HTMLElement) => {
                const resizeObserver = new ResizeObserver(() => {
                    bbox$.next(e.getBoundingClientRect())
                })
                resizeObserver.observe(e)
            },
        })
        const leftSideNav = wrapperSideNav(
            'nav',
            navView,
            navigationBoundingBox$,
        )
        const expandableLeftSideNav = new ExpandableNavColumn({
            navView,
            sizings$: this.sizings$,
            displayOptions: this.displayOptions,
            displayMode$: this.displayModeNav$,
        })
        const tocView = new TocWrapperView({
            router,
            displayMode$: this.displayModeToc$,
            displayOptions: this.displayOptions,
            content$: contentView.content$,
        })
        const rightSideNav = wrapperSideNav('toc', tocView, tocBoundingBox$)
        const expandableRightSideNav = new ExpandableTocColumn({
            tocView,
            displayOptions: this.displayOptions,
            sizings$: this.sizings$,
            displayMode$: this.displayModeToc$,
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
                    map((mode) => {
                        if (mode === 'removed') {
                            return 'removed'
                        }
                        return mode === 'pined' ? 'pined' : 'expandable'
                    }),
                    distinctUntilChanged(),
                ),
                vdomMap: (mode: 'pined' | 'expandable' | 'removed') => {
                    if (mode === 'removed') {
                        return EmptyDiv
                    }
                    return mode === 'pined' ? pined : expandable
                },
            })

        const displayModes$ = combineLatest([
            this.displayModeNav$,
            this.displayModeToc$,
        ])
        this.children = [
            {
                tag: 'div',
                class: 'w-100',
                children: [
                    topBannerView,
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
                            child$({
                                source$: displayModes$,
                                vdomMap: ([nav, toc]) => {
                                    return nav === toc || toc === 'removed'
                                        ? hSep
                                        : EmptyDiv
                                },
                            }),
                            switchMode(
                                this.displayModeToc$,
                                rightSideNav,
                                expandableRightSideNav,
                            ),
                        ],
                    },
                    footerView,
                ],
            },
        ]
        context.exit()
    }

    ctx(ctx?: ContextTrait) {
        if (ctx) {
            return ctx
        }
        return this.context ?? new NoContext()
    }

    private plugResizer(thisElement: HTMLElement) {
        const switcher = (
            width: number,
            treshold: number,
            removed: number,
            displayMode$: BehaviorSubject<DisplayMode>,
        ) => {
            if (width < removed) {
                displayMode$.next('removed')
                return
            }
            if (width > treshold) {
                displayMode$.next('pined')
            }
            if (width <= treshold && displayMode$.value === 'pined') {
                displayMode$.next('hidden')
            }
        }
        const resizeObserver = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width
            if (this.displayOptions.forceTocDisplayMode === undefined) {
                switcher(
                    width,
                    this.displayOptions.toggleTocWidth,
                    this.displayOptions.toggleNavWidth,
                    this.displayModeToc$,
                )
            }
            if (this.displayOptions.forceNavDisplayMode === undefined) {
                switcher(
                    width,
                    this.displayOptions.toggleNavWidth,
                    0,
                    this.displayModeNav$,
                )
            }
        })
        if (thisElement.parentElement) {
            resizeObserver.observe(thisElement.parentElement)
        }
    }
}
/**
 * The supported kinds wrapped by {@link StickyColumnContainer}.
 */
export type Container = 'favorites' | 'nav' | 'toc'

export class StickyColumnContainer implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class: AttributeLike<string>
    public readonly style: AttributeLike<CSSAttribute>
    public readonly children: ChildrenLike
    public readonly content: AnyVirtualDOM
    public readonly type: Container

    constructor(params: {
        type: Container
        content: AnyView
        sizings$: Observable<Sizings>
    }) {
        Object.assign(this, params)
        const colors: Record<Container, string> = {
            favorites: 'mkdocs-bg-6 mkdocs-text-6',
            nav: 'mkdocs-bg-5 mkdocs-text-5',
            toc: 'mkdocs-bg-0 mkdocs-text-0',
        }
        this.style = attr$({
            source$: params.sizings$,
            vdomMap: ({ topBanner }) => {
                return {
                    height: `0px`,
                    position: 'sticky',
                    top: `${String(topBanner.height)}px`,
                    minWidth: 'fit-content',
                    overflow: 'visible',
                }
            },
        })
        const flexGrow = params.type === 'favorites' ? 0 : 1
        const color = colors[this.type]
        this.class = `mkdocs-StickyColumnContainer flex-grow-${String(flexGrow)} ${color} d-flex flex-column`
        this.children = [
            {
                tag: 'div',
                class: 'overflow-auto mkdocs-thin-v-scroller',
                style: attr$({
                    source$: params.sizings$,
                    vdomMap: ({ pageVisibleHeight }) => {
                        return {
                            minHeight: `${String(pageVisibleHeight)}px`,
                            maxHeight: `${String(pageVisibleHeight)}px`,
                        }
                    },
                }),
                children: [this.content],
            },
        ]
    }
}
