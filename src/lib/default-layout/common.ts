import {
    AnyVirtualDOM,
    AttributeLike,
    child$,
    ChildLike,
    ChildrenLike,
    RxChild,
    RxHTMLElement,
    SupportedHTMLTags,
} from 'rx-vdom'
import { Router } from '../router'
import {
    BehaviorSubject,
    combineLatest,
    distinctUntilChanged,
    map,
    Observable,
    ReplaySubject,
    shareReplay,
    Subject,
    tap,
} from 'rxjs'
import { AnyView, Resolvable } from '../navigation.node'
import { ContextTrait, NoContext } from '../context'

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
}) => TView

/**
 * Defines attributes regarding the visual rendering of the node if the navigation view.
 */
export interface NavHeaderSpec {
    /**
     * Optional class added as wrapper to the HTML element representing the node.
     */
    wrapperClass?: AttributeLike<string>
    /**
     * Optional icon, inserted before the node's name.
     */
    icon?: ChildLike
    /**
     * Optional actions, inserted after the node's name.
     */
    actions?: ChildrenLike
}

export type NavHeader =
    | NavHeaderSpec
    | (({ router }: { router: Router }) => NavHeaderSpec)

/**
 * Defines the content and structure of the {@link TopBanner} component.
 */
export interface TopBannerSpec {
    /**
     * Define the logo of the application.
     */
    logo: {
        /**
         * Icon specification.
         * When a `string` is provided, it is interpreted as an URL.
         */
        icon: string | AnyView
        /**
         * Title of the logo.
         */
        title: string
    }
    /**
     * Optional top banner header.
     */
    header?: (p: {
        router: Router
        navigationBoundingBox$: Observable<BBox>
        tocBoundingBox$: Observable<BBox>
        pageScrollTop$: Observable<number>
    }) => AnyView
    /**
     * Optional top banner footer.
     */
    footer?: (p: {
        router: Router
        navigationBoundingBox$: Observable<BBox>
        tocBoundingBox$: Observable<BBox>
        pageScrollTop$: Observable<number>
    }) => AnyView

    /**
     * Optional content to display in the center of the banner in large-screen mode.
     */
    expandedContent?: AnyView | ((p: { router: Router }) => AnyView)
    /**
     * Optional badge or UI element displayed on the right side of the banner.
     * Often used to show status indicators or short links (e.g. GitHub, Profile link).
     */
    badge?: AnyView

    /**
     * Optional z-index associated to the top-banner style, default is `100`.
     */
    zIndex?: number
}

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
     * A custom footer.
     */
    footer?: AnyView
    /**
     * Whether to include a **Previous** / **Next** navigation banner in the footer.
     * See {@link NavFooterView}.
     *
     */
    navFooter?: boolean
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
 * Specification of a bounding box, used e.g. by {@link LayoutObserver}.
 */
export type BBox = Pick<DOMRect, 'width' | 'height'>

/**
 * Observable of {@link BBox}, see {@link LayoutObserver}.
 */
export type BBox$ = Observable<BBox>

/**
 * Structure used by the {@link LayoutObserver} regarding display mode.
 */
export type DisplayModeOptions = Pick<
    DisplayOptions,
    | 'forceTocDisplayMode'
    | 'toggleTocWidth'
    | 'toggleNavWidth'
    | 'forceNavDisplayMode'
>
/**
 * Observes layout dimensions and visibility as screen size or display mode changes.
 * Used to coordinate layout behaviors like navigation or TOC visibility and transitions.
 */
export class LayoutObserver {
    /**
     * Emits rounded layout bounding boxes whenever their dimensions change.
     * Shared replayed for efficient subscriptions.
     */
    public readonly boxes$: Observable<{
        page: BBox
        topBanner: BBox
        footer: BBox
        app: BBox
        nav: BBox
        toc: BBox
    }>
    /**
     * Represents the visible vertical area of the page content, taking banners and scroll position into account.
     */
    public readonly pageVisible$: Observable<{ top: number; height: number }>
    /**
     * Holds configuration for display mode toggling and force-mode settings.
     */
    public readonly displayModeOptions: DisplayModeOptions
    /**
     * Tracks the current display mode of the navigation panel. May be externally controlled or automatically updated.
     */
    public readonly displayModeNav$: BehaviorSubject<DisplayMode>
    /**
     * Tracks the current display mode of the TOC (Table of Contents) panel.
     */
    public readonly displayModeToc$: BehaviorSubject<DisplayMode>

    /**
     * Creates a new instance to watch layout bounding boxes and display mode settings.
     *
     * @param p
     * @param p.boxes Various bounding box observables.
     * @param p.pageScrollTop$ Stream of vertical scroll position for the page.
     * @param p.displayModeNav$ Reactive subject controlling navigation display mode.
     * @param p.displayModeToc$ Reactive subject controlling TOC display mode.
     * @param p.displayModeOptions Configuration for display mode behaviors .
     * @param ctx Logging and debugging context provider.
     */
    constructor(
        p: {
            boxes: {
                pageBBox$: BBox$
                topBannerBBox$: BBox$
                footerBBox$: BBox$
                appBBox$: BBox$
                navBBox$: BBox$
                tocBBox$: BBox$
            }
            pageScrollTop$: Observable<number>
            displayModeNav$: BehaviorSubject<DisplayMode>
            displayModeToc$: BehaviorSubject<DisplayMode>
            displayModeOptions: DisplayModeOptions
        },
        ctx?: ContextTrait,
    ) {
        const context = (ctx ?? new NoContext()).start('new LayoutObserver', [
            'View',
        ])

        this.displayModeNav$ = p.displayModeNav$
        this.displayModeToc$ = p.displayModeToc$
        this.displayModeOptions = p.displayModeOptions
        const round = (rect: BBox): BBox => ({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
        })
        this.boxes$ = combineLatest([
            p.boxes.pageBBox$,
            p.boxes.topBannerBBox$,
            p.boxes.footerBBox$,
            p.boxes.appBBox$,
            p.boxes.navBBox$,
            p.boxes.tocBBox$,
        ]).pipe(
            map(([page, topBanner, footer, app, nav, toc]) => {
                return {
                    page: round(page),
                    topBanner: round(topBanner),
                    footer: round(footer),
                    app: round(app),
                    nav: round(nav),
                    toc: round(toc),
                }
            }),
            distinctUntilChanged(
                (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
            ),
            tap((boxes) => {
                context.info('BBox update', boxes)
                this.displayModeSwitcher(boxes.app, context)
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
        )
        this.pageVisible$ = combineLatest([this.boxes$, p.pageScrollTop$]).pipe(
            map(([{ page, topBanner, app }, scrollTop]) => {
                const remainingPageHeight = page.height - scrollTop
                const pageVisibleHeight =
                    remainingPageHeight > app.height
                        ? app.height - topBanner.height
                        : remainingPageHeight
                return {
                    top: topBanner.height,
                    height: pageVisibleHeight,
                }
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
        )

        if (this.displayModeOptions.forceNavDisplayMode) {
            this.displayModeNav$.next(
                this.displayModeOptions.forceNavDisplayMode,
            )
        }
        if (this.displayModeOptions.forceTocDisplayMode) {
            this.displayModeToc$.next(
                this.displayModeOptions.forceTocDisplayMode,
            )
        }
    }
    private displayModeSwitcher(bbox: BBox, context: ContextTrait) {
        const switcher = (
            elem: 'nav' | 'toc',
            width: number,
            treshold: number,
            removed: number,
            displayMode$: BehaviorSubject<DisplayMode>,
        ) => {
            let nextValue: DisplayMode | undefined = undefined
            if (
                width <= treshold &&
                ['removed', 'pined'].includes(displayMode$.value)
            ) {
                nextValue = 'hidden'
            }
            if (width < removed) {
                nextValue = 'removed'
            }
            if (width > treshold) {
                nextValue = 'pined'
            }

            if (nextValue && displayMode$.value !== nextValue) {
                context.info(`Switch mode for ${elem}`, {
                    old: displayMode$.value,
                    new: nextValue,
                })
                displayMode$.next(nextValue)
            }
        }
        if (this.displayModeOptions.forceTocDisplayMode === undefined) {
            switcher(
                'toc',
                bbox.width,
                this.displayModeOptions.toggleTocWidth,
                this.displayModeOptions.toggleNavWidth,
                this.displayModeToc$,
            )
        }
        if (this.displayModeOptions.forceNavDisplayMode === undefined) {
            switcher(
                'nav',
                bbox.width,
                this.displayModeOptions.toggleNavWidth,
                0,
                this.displayModeNav$,
            )
        }
    }

    switchMode(
        source: 'nav' | 'toc',
        mapTo: {
            pined: AnyVirtualDOM
            expandable: AnyVirtualDOM
            removed: AnyVirtualDOM
        },
    ): RxChild {
        const source$ =
            source === 'nav' ? this.displayModeNav$ : this.displayModeToc$
        return child$({
            source$: source$.pipe(
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
                    return mapTo.removed
                }
                return mode === 'pined' ? mapTo.pined : mapTo.expandable
            },
        })
    }

    static minPageHeight$(app$: BBox$, topBanner$: BBox$, footer$: BBox$) {
        return combineLatest([app$, topBanner$, footer$]).pipe(
            map(
                ([appBB, topBB, footerBB]) =>
                    appBB.height - topBB.height - footerBB.height,
            ),
        )
    }
}

/**
 * Intercepts and handles internal link clicks for in-app navigation (`href` starting with `@nav`).
 *
 * This function is typically used in an `onclick` handler on a top-level container element,
 * allowing it to catch and manage anchor clicks from any of its child elements.
 *
 * @param _p
 * @param _p.event The click event triggered on the document.
 * @param _p.router The application's router instance.
 */
export function handleInternalLinkClick({
    event,
    router,
}: {
    event: MouseEvent
    router: Router
}) {
    const target = event.target as HTMLElement
    const anchor = target.closest('a')
    if (anchor) {
        const baseURI = document.head.baseURI.split('?')[0]
        const href = anchor.href.replace(baseURI, '')
        if (href.startsWith('@nav')) {
            event.preventDefault()
            event.stopPropagation()
            router.fireNavigateTo(href.replace('@nav', '?nav='))
        }
    }
}

export function plugBoundingBoxObserver<Tag extends SupportedHTMLTags>(
    elem: RxHTMLElement<Tag>,
    boundingBox$: Subject<BBox>,
) {
    const resizeObserver = new ResizeObserver(() => {
        boundingBox$.next(elem.getBoundingClientRect())
    })
    resizeObserver.observe(elem)
    elem.hookOnDisconnected(() => {
        resizeObserver.disconnect()
    })
}
