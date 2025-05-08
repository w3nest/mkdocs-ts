import {
    AnyVirtualDOM,
    child$,
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
    distinctUntilChanged,
    map,
    Observable,
    ReplaySubject,
    Subject,
    take,
} from 'rxjs'

import { ExpandableNavColumn, ExpandableTocColumn } from './small-screen.view'
import { TocWrapperView } from './toc.view'
import { ContextTrait, NoContext } from '../context'
import { EmptyTopBanner, TopBanner } from './top-banner.view'
import { FooterWrapper } from './footer.view'
import {
    defaultDisplayOptions,
    DefaultLayoutParams,
    DisplayMode,
    DisplayOptions,
    plugBoundingBoxObserver,
    Sizings,
} from './common'
import { AnyView } from '../navigation.node'

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
            plugBoundingBoxObserver(e, appBoundingBox$)
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

    private plugResizer(thisElement: RxHTMLElement<'div'>) {
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
            thisElement.hookOnDisconnected(() => {
                resizeObserver.disconnect()
            })
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
