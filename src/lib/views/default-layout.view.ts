import {
    AnyVirtualDOM,
    child$,
    ChildrenLike,
    CSSAttribute,
    VirtualDOM,
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
    of,
    Subject,
} from 'rxjs'
import { BookmarksView } from './bookmarks.view'

export type DisplayMode = 'Full' | 'Minimized'

/**
 * Hints regarding sizing of the main elements on the page.
 *
 * The 'page' element refers to the text-content area.
 *
 * See {@link defaultLayoutOptions}.
 */
export type LayoutOptions = {
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
        navWidth: '450px',
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
    public readonly displayModeNav$ = new BehaviorSubject<DisplayMode>('Full')
    /**
     * The display mode regarding the table of content.
     */
    public readonly displayModeToc$ = new BehaviorSubject<DisplayMode>('Full')

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
                e.classList.remove(
                    'mkdocs-DefaultLayoutView',
                    'mkdocs-DefaultLayoutView-s',
                    'mkdocs-DefaultLayoutView-xs',
                    'mkdocs-DefaultLayoutView-xxs',
                )

                if (width < 1300) {
                    e.classList.add('mkdocs-DefaultLayoutView-s')
                }

                if (width < 1000) {
                    e.classList.add('mkdocs-DefaultLayoutView-xxs')
                    this.displayModeNav$.next('Minimized')
                    this.displayModeToc$.next('Minimized')
                    return
                }
                if (width < 1300) {
                    e.classList.add('mkdocs-DefaultLayoutView-xs')
                    this.displayModeNav$.next('Minimized')
                    this.displayModeToc$.next('Full')
                    return
                }
                e.classList.add('mkdocs-DefaultLayoutView')
                this.displayModeNav$.next('Full')
                this.displayModeToc$.next('Full')
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
            content: new BookmarksView({ router, bookmarks$ }),
            layoutOptions: this.layoutOptions,
        })
        const navView = new StickyColumnContainer({
            type: 'nav',
            content: new NavigationView({
                router,
                bookmarks$,
            }),
            layoutOptions: this.layoutOptions,
        })
        const tocView = new StickyColumnContainer({
            type: 'toc',
            content: new TocWrapperView({
                router,
            }),
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
    public readonly class: string
    public readonly style: CSSAttribute
    public readonly children: ChildrenLike
    public readonly layoutOptions: LayoutOptions
    public readonly content: AnyVirtualDOM
    public readonly type: Container

    static readonly topStickyPadding = 'pt-5'

    constructor(params: {
        type: Container
        content: AnyVirtualDOM
        layoutOptions: LayoutOptions
    }) {
        Object.assign(this, params)
        const classes: Record<Container, string> = {
            favorites: 'mkdocs-bg-6 mkdocs-text-6',
            nav: 'mkdocs-bg-5 mkdocs-text-5',
            toc: 'mkdocs-bg-0 mkdocs-text-0',
        }
        this.content.style = {
            ...(this.content.style || {}),
            position: 'sticky',
            top: '10px',
            maxHeight: '85vh',
        }
        this.class = `mkdocs-WrapperSideNav ${classes[this.type]} ${StickyColumnContainer.topStickyPadding} d-flex`
        this.style = {
            flexGrow: this.type === 'favorites' ? 0 : 2,
        }
        this.children = [this.content]
    }
}
