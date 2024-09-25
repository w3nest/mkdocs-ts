import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { NavigationView } from './navigation.view'
import { Router } from '../router'
import { FooterView, PageView } from './page.view'
import {
    BehaviorSubject,
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    from,
    mergeMap,
    of,
    Subject,
} from 'rxjs'
import { TopBannerView } from './top-banner.view'

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
     * Navigation panel's width.
     */
    navWidth: string
    /**
     * Page's width.
     */
    pageWidth: string
    /**
     * Page's maximum width.
     */
    pageMaxWidth: string
    /**
     * Horizontal padding of the main page.
     */
    pageXPadding: string
    /**
     * TOC panel's width.
     */
    tocWidth: string
}

/**
 * Default layout options.
 */
export const defaultLayoutOptions = () => {
    return {
        navWidth: '250px',
        pageWidth: '95%',
        pageMaxWidth: '47em',
        tocWidth: '250px',
        pageXPadding: '3em',
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
     */
    constructor({
        router,
        name,
        topBanner,
        footer,
        layoutOptions,
    }: {
        router: Router
        name: string | AnyVirtualDOM
        topBanner?: LayoutElementView
        footer?: LayoutElementView
        layoutOptions?: Partial<LayoutOptions>
    }) {
        this.layoutOptions = Object.assign(
            this.layoutOptions,
            layoutOptions || {},
        )
        const wrapperSideNav = (side: 'left' | 'right') => ({
            tag: 'div' as const,
            class: 'mkdocs-WrapperSideNav',
            style: {
                width:
                    side === 'left'
                        ? this.layoutOptions.navWidth
                        : this.layoutOptions.tocWidth,
            },
        })
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
        const topBannerView = topBanner
            ? topBanner(viewInputs)
            : new TopBannerView({
                  name,
                  displayModeNav$: this.displayModeNav$,
                  displayModeToc$: this.displayModeToc$,
                  router,
              })
        const footerView = footer ? footer(viewInputs) : new FooterView()
        this.children = [
            topBannerView,
            {
                tag: 'div',
                class: 'flex-grow-1 w-100 overflow-auto pt-2',
                style: {
                    minHeight: '0px',
                },
                connectedCallback: (e) => {
                    router.scrollableElement = e
                },
                children: [
                    {
                        tag: 'div',
                        class: 'd-flex justify-content-center pt-5 w-100',
                        children: [
                            {
                                source$: this.displayModeNav$.pipe(
                                    distinctUntilChanged(),
                                ),
                                vdomMap: (mode: DisplayMode): AnyVirtualDOM => {
                                    return mode === 'Minimized'
                                        ? { tag: 'div' }
                                        : {
                                              ...wrapperSideNav('left'),
                                              children: [
                                                  new NavigationView({
                                                      router,
                                                  }),
                                              ],
                                          }
                                },
                            },
                            {
                                tag: 'div',
                                style: {
                                    width: this.layoutOptions.pageWidth,
                                    maxWidth: this.layoutOptions.pageMaxWidth,
                                    height: 'fit-content',
                                    minHeight: '100%',
                                },
                                children: [
                                    {
                                        tag: 'div',
                                        class: `w-100`,
                                        style: {
                                            paddingLeft:
                                                this.layoutOptions.pageXPadding,
                                            paddingRight:
                                                this.layoutOptions.pageXPadding,
                                        },
                                        children: [
                                            new PageView({ router: router }),
                                        ],
                                    },
                                ],
                            },
                            {
                                source$: this.displayModeToc$.pipe(
                                    distinctUntilChanged(),
                                ),
                                vdomMap: (mode: DisplayMode): AnyVirtualDOM => {
                                    return mode === 'Minimized'
                                        ? { tag: 'div' }
                                        : {
                                              ...wrapperSideNav('right'),
                                              children: [
                                                  new TocWrapperView({
                                                      router,
                                                  }),
                                              ],
                                          }
                                },
                            },
                        ],
                    },
                    {
                        tag: 'footer',
                        style: {
                            position: 'sticky' as const,
                            top: '100%',
                        },
                        children: [footerView],
                    },
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
            {
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
                vdomMap: (toc?: AnyVirtualDOM): AnyVirtualDOM => {
                    return toc || { tag: 'div' }
                },
            },
        ]
    }
}
