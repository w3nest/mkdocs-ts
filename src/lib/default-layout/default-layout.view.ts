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
import {
    BehaviorSubject,
    combineLatest,
    map,
    ReplaySubject,
    Subject,
    take,
} from 'rxjs'

import {
    EmptyToc,
    ExpandableNavColumn,
    ExpandableTocColumn,
} from './small-screen.view'
import { TocWrapperView } from './toc.view'
import { ContextTrait, NoContext } from '../context'
import { EmptyTopBanner, TopBanner } from './top-banner.view'
import { FooterWrapper } from './footer.view'
import {
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
        if (this.displayOptions.forceNavDisplayMode) {
            this.displayModeNav$.next(this.displayOptions.forceNavDisplayMode)
        }
        if (this.displayOptions.forceTocDisplayMode) {
            this.displayModeToc$.next(this.displayOptions.forceTocDisplayMode)
        }

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
                this.appBoundingBox$,
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
                    layoutSizes$: this.layoutObserver,
                }),
            ],
            connectedCallback: (e: RxHTMLElement<'div'>) => {
                plugBoundingBoxObserver(e, bbox$)
            },
        })
        const leftSideNav = wrapperSideNav(
            'nav',
            navView,
            navigationBoundingBox$,
        )
        const expandableLeftSideNav = new ExpandableNavColumn({
            navView,
            layoutSizes$: this.layoutObserver,
            displayOptions: this.displayOptions,
            displayMode$: this.displayModeNav$,
            boundingBox$: navigationBoundingBox$,
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
            layoutSizes$: this.layoutObserver,
            displayMode$: this.displayModeToc$,
            boundingBox$: tocBoundingBox$,
        })
        const hSep = {
            tag: 'div' as const,
            class: 'flex-grow-1',
        }
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
                            this.layoutObserver.switchMode('nav', {
                                pined: leftSideNav,
                                expandable: expandableLeftSideNav,
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
                                pined: rightSideNav,
                                expandable: expandableRightSideNav,
                                removed: new EmptyToc(tocBoundingBox$),
                            }),
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
        layoutSizes$: LayoutObserver
    }) {
        Object.assign(this, params)
        const colors: Record<Container, string> = {
            favorites: 'mkdocs-bg-6 mkdocs-text-6',
            nav: 'mkdocs-bg-5 mkdocs-text-5',
            toc: 'mkdocs-bg-0 mkdocs-text-0',
        }
        this.style = attr$({
            source$: params.layoutSizes$.boxes$,
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
                    source$: params.layoutSizes$.pageVisible$,
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
}
