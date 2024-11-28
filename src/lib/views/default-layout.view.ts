import {
    AnyVirtualDOM,
    attr$,
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
    combineLatest,
    debounceTime,
    from,
    mergeMap,
    Observable,
    of,
    Subject,
} from 'rxjs'
import { FavoritesView } from './favorites.view'

export type DisplayMode = 'pined' | 'hidden' | 'expanded'

/**
 * Hints regarding sizing of the main elements on the page.
 *
 * The 'page' element refers to the text-content area.
 *
 * See {@link defaultLayoutOptions}.
 */
export type LayoutOptions = {
    /**
     * Screen size in pixel transitioning from pined Navigation panel, to
     * collapsable one.
     */
    toggleNavWidth: number
    /**
     * Page's width.
     */
    pageWidth: string
    /**
     * Page's maximum width.
     */
    pageMaxWidth: string
}

/**
 * Default layout options.
 */
export const defaultLayoutOptions = () => {
    return {
        toggleNavWidth: 1300,
        pageWidth: '95%',
        pageMaxWidth: '47em',
        tocWidth: '350px',
    }
}

export type LayoutElementView = ({
    title,
    router,
    displayModeNav$,
    displayModeToc$,
    layoutOptions,
}: {
    title: string | AnyVirtualDOM
    router: Router
    displayModeNav$: Subject<DisplayMode>
    displayModeToc$: Subject<DisplayMode>
    layoutOptions: LayoutOptions
}) => AnyVirtualDOM
/**
 * Defines the default layout:
 * *  A top banner at the top.
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
    public readonly children: AnyVirtualDOM[]
    public readonly class =
        'mkdocs-DefaultLayoutView d-flex flex-column h-100 w-100 overflow-y-auto'

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
     * @param _p.name The name of the application or a VirtualDOM to display instead as title.
     * If the parameter `topBanner` is provided, this name is forwarded as `title` parameter.
     * @param _p.topBanner Optional custom top-banner view to use, default to {@link TopBannerView}.
     * @param _p.footer Optional custom footer view to use, default to {@link FooterView}.
     * @param _p.layoutOptions Display options regarding sizing of the main elements in the page.
     * @param _p.bookmarks$ Subject emitting the `href` of the bookmarked pages.
     */
    constructor({
        router,
        name,
        topBanner,
        footer,
        layoutOptions,
        bookmarks$,
    }: {
        router: Router
        name: string | AnyVirtualDOM
        topBanner?: LayoutElementView
        footer?: LayoutElementView
        layoutOptions?: Partial<LayoutOptions>
        bookmarks$: BehaviorSubject<string[]>
    }) {
        this.layoutOptions = Object.assign(
            this.layoutOptions,
            layoutOptions || {},
        )
        this.connectedCallback = (e: HTMLElement) => {
            const resizeObserver = new ResizeObserver((entries) => {
                const width = entries[0].contentRect.width

                if (width < this.layoutOptions.toggleNavWidth) {
                    this.displayModeNav$.next('hidden')
                    return
                }
                this.displayModeNav$.next('pined')
            })
            resizeObserver.observe(e)
        }
        const viewInputs = {
            title: name,
            router,
            displayModeNav$: this.displayModeNav$,
            displayModeToc$: this.displayModeToc$,
            layoutOptions: this.layoutOptions,
        }
        const topBannerView = topBanner(viewInputs)
        const favoritesView = new StickyColumnContainer({
            type: 'favorites',
            content: new FavoritesView({
                router,
                bookmarks$,
                displayMode$: this.displayModeNav$,
            }),
            mode$: of('pined'),
            layoutOptions: this.layoutOptions,
        })
        const navView = new StickyColumnContainer({
            type: 'nav',
            content: new NavigationView({
                router,
                bookmarks$,
                displayMode$: this.displayModeNav$,
            }),
            mode$: this.displayModeNav$,
            layoutOptions: this.layoutOptions,
        })
        const tocView = new StickyColumnContainer({
            type: 'toc',
            content: new TocWrapperView({
                router,
            }),
            mode$: of('pined'),
            layoutOptions: this.layoutOptions,
        })
        const pageView = {
            tag: 'div' as const,
            class: `w-100 ${StickyColumnContainer.topStickyPadding}`,
            style: {
                maxWidth: this.layoutOptions.pageMaxWidth,
                height: 'fit-content',
                minHeight: '100vh',
            },
            children: [new PageView({ router: router })],
        }
        const footerView = {
            tag: 'footer' as const,
            style: {
                position: 'sticky' as const,
                top: '100%',
            },
            children: [footer ? footer(viewInputs) : new FooterView()],
        }
        const hSep = {
            tag: 'div' as const,
            class: 'flex-grow-1',
        }
        this.children = [
            topBannerView,
            {
                tag: 'div',
                class: 'w-100 overflow-auto',
                connectedCallback: (e) => {
                    router.scrollableElement = e
                },
                children: [
                    {
                        tag: 'div',
                        class: 'd-flex w-100',
                        children: [
                            favoritesView,
                            navView,
                            hSep,
                            pageView,
                            hSep,
                            tocView,
                            hSep,
                        ],
                    },
                    footerView,
                ],
            },
        ]
    }
}

export class TocWrapperView implements VirtualDOM<'div'> {
    public readonly router: Router

    public readonly tag = 'div'
    public readonly class = 'mkdocs-TocWrapperView w-100 h-100'

    public readonly children: ChildrenLike

    constructor(params: { router: Router }) {
        Object.assign(this, params)

        this.children = [
            child$({
                source$: combineLatest([
                    this.router.currentNode$,
                    this.router.currentHtml$,
                ]).pipe(
                    debounceTime(200),
                    mergeMap(([node, elem]) => {
                        return node.tableOfContent
                            ? from(
                                  node.tableOfContent({
                                      html: elem,
                                      router: this.router,
                                  }),
                              )
                            : of(undefined)
                    }),
                ),
                vdomMap: (toc?): AnyVirtualDOM => {
                    return toc || { tag: 'div' }
                },
            }),
        ]
    }
}

type Container = 'favorites' | 'nav' | 'toc'

class StickyColumnContainer implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class: AttributeLike<string>
    public readonly style: AttributeLike<CSSAttribute>
    public readonly children: ChildrenLike
    public readonly layoutOptions: LayoutOptions
    public readonly content: AnyVirtualDOM
    public readonly type: Container

    static readonly topStickyPadding = 'pt-5'

    constructor(params: {
        type: Container
        content: AnyVirtualDOM
        layoutOptions: LayoutOptions
        mode$: Observable<DisplayMode>
    }) {
        Object.assign(this, params)
        const classes: Record<Container, string> = {
            favorites: 'for-FavoritesView mkdocs-bg-6 mkdocs-text-6',
            nav: 'for-NavigationView mkdocs-bg-5 mkdocs-text-5',
            toc: 'for-TocWrapperView mkdocs-bg-0 mkdocs-text-0',
        }
        this.content.style = {
            ...(this.content.style || {}),
            position: 'sticky',
            top: '10px',
            maxHeight: '85vh',
        }
        this.class = attr$({
            source$: params.mode$,
            vdomMap: (mode): string => {
                return mode
            },
            wrapper: (c) =>
                `mkdocs-WrapperSideNav ${c} ${classes[this.type]} ${StickyColumnContainer.topStickyPadding} d-flex`,
        })
        this.style = attr$({
            source$: params.mode$,
            vdomMap: (mode) => {
                if (this.type === 'favorites') {
                    return {}
                }
                if (mode === 'pined') {
                    return { position: 'unset', height: 'unset', flexGrow: 2 }
                }
                return {
                    position: 'absolute',
                    height: '100%',
                    transition: 'left 200ms',
                    left: mode === 'expanded' ? '0px' : '-100%',
                }
            },
        })
        this.children = [this.content]
    }
}
