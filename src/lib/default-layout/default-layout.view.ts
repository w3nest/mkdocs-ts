import {
    AnyVirtualDOM,
    ChildrenLike,
    CSSAttribute,
    VirtualDOM,
    AttributeLike,
    attr$,
    RxHTMLElement,
    EmptyDiv,
} from 'rx-vdom'
import { NavigationView } from './navigation.view'
import { PageView, WrapperPageView } from './page.view'
import { BehaviorSubject, ReplaySubject, Subject, take } from 'rxjs'

import {
    EmptyToc,
    ExpandableNavColumn,
    ExpandableParams,
    ExpandableTocColumn,
} from './small-screen.view'
import { TocWrapperView } from './toc.view'
import { ContextTrait, NoContext } from '../context'
import { EmptyTopBanner, TopBanner } from './top-banner.view'
import { FooterWrapper } from './footer.view'
import {
    BBox,
    defaultDisplayOptions,
    DefaultLayoutParams,
    DisplayMode,
    DisplayOptions,
    LayoutObserver,
    plugBoundingBoxObserver,
} from './common'
import { AnyView } from '../navigation.node'
import { Router } from '../router'

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

    public readonly connectedCallback: (e: RxHTMLElement<'div'>) => void

    private readonly context?: ContextTrait

    public readonly pageScrollTop$ = new BehaviorSubject(0)

    public readonly layoutObserver: LayoutObserver

    private appBoundingBox$ = new ReplaySubject<DOMRect>(1)
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

        this.connectedCallback = this.getConnectedCallback(router)

        const viewInputs = {
            router,
            layoutOptions: this.displayOptions,
            bookmarks$,
        }

        const navigationBoundingBox$ = new ReplaySubject<DOMRect>(1)
        const tocBoundingBox$ = new ReplaySubject<DOMRect>(1)

        const topBannerView = topBanner
            ? new TopBanner({
                  router,
                  navigationBoundingBox$,
                  tocBoundingBox$,
                  navDisplayMode$: this.displayModeNav$,
                  spec: topBanner,
                  pageScrollTop$: this.pageScrollTop$,
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
            minHeight$: LayoutObserver.minPageHeight$(
                this.appBoundingBox$,
                topBannerView.boundingBox$,
                footerView.boundingBox$,
            ),
        })
        this.layoutObserver = new LayoutObserver(
            {
                boxes: {
                    pageBBox$: pageView.boundingBox$,
                    topBannerBBox$: topBannerView.boundingBox$,
                    footerBBox$: footerView.boundingBox$,
                    appBBox$: this.appBoundingBox$,
                    navBBox$: navigationBoundingBox$,
                    tocBBox$: tocBoundingBox$,
                },
                pageScrollTop$: this.pageScrollTop$,
                displayModeNav$: this.displayModeNav$,
                displayModeToc$: this.displayModeToc$,
                displayModeOptions: this.displayOptions,
            },
            context,
        )

        const navView = new NavigationView({
            router: router,
            displayOptions: this.displayOptions,
            bookmarks$: bookmarks$,
        })
        const { pined: pinedNav, expandable: expandableNav } = this.sideView(
            navView,
            this.displayModeNav$,
            navigationBoundingBox$,
            ExpandableNavColumn,
        )

        const tocView = new TocWrapperView({
            router,
            displayMode$: this.displayModeToc$,
            displayOptions: this.displayOptions,
            content$: contentView.content$,
        })
        const { pined: pinedToc, expandable: expandableToc } = this.sideView(
            tocView,
            this.displayModeToc$,
            tocBoundingBox$,
            ExpandableTocColumn,
        )

        const hSep = {
            tag: 'div' as const,
            class: 'flex-grow-1',
        }
        this.children = [
            topBannerView,
            {
                tag: 'div',
                class: 'd-flex w-100',
                children: [
                    this.layoutObserver.switchMode('nav', {
                        pined: pinedNav,
                        expandable: expandableNav,
                        removed: EmptyDiv,
                    }),
                    hSep,
                    pageView,
                    this.layoutObserver.switchMode('toc', {
                        pined: hSep,
                        expandable: EmptyDiv,
                        removed: hSep,
                    }),
                    this.layoutObserver.switchMode('toc', {
                        pined: pinedToc,
                        expandable: expandableToc,
                        removed: new EmptyToc(tocBoundingBox$),
                    }),
                ],
            },
            footerView,
        ]
        context.exit()
    }

    ctx(ctx?: ContextTrait) {
        if (ctx) {
            return ctx
        }
        return this.context ?? new NoContext()
    }

    private sideView<T extends TocWrapperView | NavigationView>(
        content: T,
        displayMode$: BehaviorSubject<DisplayMode>,
        bbox$: Subject<BBox>,
        Expandable: new (
            p: ExpandableParams<T>,
        ) => T extends TocWrapperView
            ? ExpandableTocColumn
            : ExpandableNavColumn,
    ): {
        pined: AnyVirtualDOM
        expandable: AnyVirtualDOM
    } {
        const pined = StickyColumnContainer.wrap(
            content,
            this.layoutObserver,
            bbox$,
        )
        const expandable = new Expandable({
            content,
            layoutObserver: this.layoutObserver,
            displayOptions: this.displayOptions,
            displayMode$,
            boundingBox$: bbox$,
        })
        return {
            pined,
            expandable,
        }
    }

    private getConnectedCallback(router: Router) {
        return (e: RxHTMLElement<'div'>) => {
            const patchScrollTo = ({ top, left, behavior }: ScrollToOptions) =>
                this.layoutObserver.boxes$
                    .pipe(take(1))
                    .subscribe(({ topBanner }) => {
                        e.scrollTo({
                            left,
                            behavior,
                            top: top ? top - topBanner.height : 0,
                        })
                    })

            router.setScrollableElement(e, patchScrollTo)
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
            plugBoundingBoxObserver(e, this.appBoundingBox$)
        }
    }
}

export class StickyColumnContainer implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-StickyColumnContainer'
    public readonly tag = 'div'
    public readonly class = `${StickyColumnContainer.CssSelector} flex-grow-1 d-flex flex-column`
    public readonly style: AttributeLike<CSSAttribute>
    public readonly children: ChildrenLike
    public readonly content: AnyVirtualDOM

    constructor(params: { content: AnyView; layoutObserver: LayoutObserver }) {
        Object.assign(this, params)
        this.style = attr$({
            source$: params.layoutObserver.boxes$,
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
        this.children = [
            {
                tag: 'div',
                class: 'overflow-auto mkdocs-thin-v-scroller',
                style: attr$({
                    source$: params.layoutObserver.pageVisible$,
                    vdomMap: ({ height }) => {
                        return {
                            minHeight: `${String(height)}px`,
                            maxHeight: `${String(height)}px`,
                        }
                    },
                }),
                children: [this.content],
            },
        ]
    }

    static wrap(
        content: AnyView,
        layoutObserver: LayoutObserver,
        bbox$: Subject<BBox>,
    ) {
        return {
            tag: 'div' as const,
            class: 'd-flex flex-grow-1',
            children: [
                new StickyColumnContainer({
                    content,
                    layoutObserver,
                }),
            ],
            connectedCallback: (e: RxHTMLElement<'div'>) => {
                plugBoundingBoxObserver(e, bbox$)
            },
        }
    }
}
