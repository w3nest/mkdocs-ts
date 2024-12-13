import {
    AnyVirtualDOM,
    child$,
    ChildrenLike,
    CSSAttribute,
    VirtualDOM,
    AttributeLike,
} from 'rx-vdom'
import { NavigationView } from './navigation.view'
import { Router } from '../router'
import { FooterView, PageView } from './page.view'
import {
    BehaviorSubject,
    distinctUntilChanged,
    map,
    Observable,
    Subject,
} from 'rxjs'
import { FavoritesView } from './favorites.view'
import { ExpandableLeftSide, ExpandableRightSide } from './expandable.view'
import { TocWrapperView } from './toc.view'

export type DisplayMode = 'pined' | 'hidden' | 'expanded'

/**
 * Hints regarding sizing of the side navigation panels on the page.
 *
 * See {@link defaultLayoutOptions}.
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
 * See {@link defaultLayoutOptions}.
 */
export type LayoutOptions = SidePanelLayoutOptions & {
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
     * Page's maximum width.
     */
    pageMaxWidth: string
    /**
     * Translation duration for panels in ms.
     */
    translationTime: number
}

/**
 * Default layout options.
 */
export const defaultLayoutOptions = (): LayoutOptions => {
    return {
        toggleTocWidth: 1500,
        tocMinWidth: 250,
        tocMaxWidth: 400,
        toggleNavWidth: 1300,
        navMaxWidth: 500,
        navMinWidth: 300,
        pageMaxWidth: '45rem',
        translationTime: 400,
        topStickyPaddingMax: '2rem',
        topStickyPaddingMin: '10px',
        bottomStickyPaddingMax: '0rem',
    }
}

export type LayoutElementView = ({
    router,
    displayModeNav$,
    displayModeToc$,
    layoutOptions,
}: {
    router: Router
    displayModeNav$: Subject<DisplayMode>
    displayModeToc$: Subject<DisplayMode>
    layoutOptions: LayoutOptions
}) => AnyVirtualDOM
/**
 * Defines the default layout:
 * *  Navigation on the left-side.
 * *  Page's html content as main content.
 * *  On the right the table of content.
 *
 * Depending on the screen size, the navigation and TOC can be collapsed into a top-banner menu.
 *
 */
export class DefaultLayoutView implements VirtualDOM<'div'> {
    public readonly layoutOptions: LayoutOptions = defaultLayoutOptions()

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
     * @param _p
     * @param _p.router The router.
     * @param _p.page Optional custom page to use, default to {@link PageView} .
     * @param _p.footer Optional custom footer view to use, default to {@link FooterView}.
     * @param _p.layoutOptions Display options regarding sizing of the main elements in the page.
     * @param _p.bookmarks$ Subject emitting the `href` of the bookmarked pages.
     */
    constructor({
        router,
        page,
        footer,
        layoutOptions,
        navHeader,
        bookmarks$,
    }: {
        router: Router
        page?: LayoutElementView
        footer?: LayoutElementView
        navHeader?: LayoutElementView
        layoutOptions?: Partial<LayoutOptions>
        bookmarks$: BehaviorSubject<string[]>
    }) {
        this.layoutOptions = Object.assign(
            this.layoutOptions,
            layoutOptions ?? {},
        )
        this.connectedCallback = (e: HTMLElement) => {
            this.plugResizer(e)
            router.scrollableElement = e
        }
        const viewInputs = {
            router,
            displayModeNav$: this.displayModeNav$,
            displayModeToc$: this.displayModeToc$,
            layoutOptions: this.layoutOptions,
        }
        const favoritesView = new FavoritesView({
            router,
            bookmarks$,
            displayMode$: this.displayModeNav$,
            topStickyPaddingMax: this.layoutOptions.topStickyPaddingMax,
            bottomStickyPaddingMax: this.layoutOptions.bottomStickyPaddingMax,
        })
        const navView = new NavigationView({
            router,
            bookmarks$,
            layoutOptions: this.layoutOptions,
        })
        const defaultNavHeader = {
            tag: 'div' as const,
            style: {
                height: this.layoutOptions.topStickyPaddingMax,
            },
        }
        const navHeaderView = navHeader?.(viewInputs) ?? defaultNavHeader
        const footerView = {
            tag: 'footer' as const,
            style: {
                position: 'sticky' as const,
                top: '100%',
            },
            children: [footer ? footer(viewInputs) : new FooterView()],
        }
        const leftSideNav = {
            tag: 'div' as const,
            class: 'd-flex flex-grow-1',
            children: [
                new StickyColumnContainer({
                    type: 'favorites',
                    content: favoritesView,
                    layoutOptions: this.layoutOptions,
                    header: defaultNavHeader,
                }),
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

        const pageView: AnyVirtualDOM = {
            tag: 'div' as const,
            class: `w-100 ${this.layoutOptions.topStickyPaddingMax} px-3`,
            style: {
                maxWidth: this.layoutOptions.pageMaxWidth,
                height: 'fit-content',
                minHeight: '100vh',
            },
            children: [
                defaultNavHeader,
                page ? page(viewInputs) : new PageView({ router: router }),
            ],
        }
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
    public readonly header?: AnyVirtualDOM
    public readonly content: AnyVirtualDOM
    public readonly footer?: AnyVirtualDOM
    public readonly type: Container

    constructor(params: {
        type: Container
        content: AnyVirtualDOM
        layoutOptions: Partial<SidePanelLayoutOptions>
        header?: AnyVirtualDOM
        footer?: AnyVirtualDOM
    }) {
        Object.assign(this, params)
        const layoutOptions = {
            ...defaultLayoutOptions(),
            ...this.layoutOptions,
        }
        const colors: Record<Container, string> = {
            favorites: 'mkdocs-bg-6 mkdocs-text-6',
            nav: 'mkdocs-bg-5 mkdocs-text-5',
            toc: 'mkdocs-bg-0 mkdocs-text-0',
        }
        this.content.style = {
            ...(this.content.style ?? {}),
            ...StickyColumnContainer.stickyStyle(layoutOptions),
        }
        const flexGrow = params.type === 'favorites' ? 0 : 1
        const stickyPadingTop = this.layoutOptions.topStickyPaddingMax
        const color = colors[this.type]
        this.class = `mkdocs-StickyColumnContainer flex-grow-${String(flexGrow)} ${color} ${stickyPadingTop ?? ''} d-flex flex-column`

        this.children = [this.header, this.content, this.footer]
    }

    static stickyStyle(layoutOptions: SidePanelLayoutOptions): CSSAttribute {
        return {
            position: 'sticky',
            top: layoutOptions.topStickyPaddingMin,
            height: `calc( 100vh - ${layoutOptions.topStickyPaddingMax} - ${layoutOptions.bottomStickyPaddingMax})`,
        }
    }
}
