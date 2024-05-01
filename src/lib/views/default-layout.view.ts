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
} from 'rxjs'
import { TopBannerView } from './top-banner.view'

export type DisplayMode = 'Full' | 'Minimized'

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
    public readonly tag = 'div'
    public readonly children: AnyVirtualDOM[]
    public readonly class =
        'mkdocs-DefaultLayoutView d-flex flex-column h-100 w-100 overflow-y-auto'

    static displayModeNav = new BehaviorSubject<DisplayMode>('Full')
    static displayModeToc = new BehaviorSubject<DisplayMode>('Full')

    public readonly style = {
        fontFamily: 'Lexend, sans-serif',
    }

    /**
     *
     * @param router The router
     * @param name The name of the application
     * @param topBanner Optional custom top-banner view to use, default to {@link TopBannerView}.
     */
    constructor({
        router,
        name,
        topBanner,
    }: {
        router: Router
        name: string
        topBanner?: ({ displayMode$ }) => AnyVirtualDOM
    }) {
        const wrapperSideNav = (side: 'left' | 'right') => ({
            tag: 'div' as const,
            class: 'mkdocs-WrapperSideNav mkdocs-ts-side-nav',
            style: {
                marginRight: side == 'left' ? '3em' : '0em',
                marginLeft: side == 'right' ? '3em' : '0em',
                maxHeight: '80vh',
                position: 'sticky' as const,
                top: '0px',
                width: '16em',
            },
        })
        this.children = [
            topBanner
                ? topBanner({ displayMode$: DefaultLayoutView.displayModeNav })
                : new TopBannerView({
                      name,
                      displayModeNav$: DefaultLayoutView.displayModeNav,
                      router,
                  }),
            {
                tag: 'div',
                class: 'flex-grow-1 w-100 overflow-auto',
                style: {
                    minHeight: '0px',
                },
                connectedCallback: (e) => {
                    router.scrollableElement = e
                    const resizeObserver = new ResizeObserver((entries) => {
                        const width = entries[0].contentRect.width
                        document.documentElement.style.fontSize =
                            width < 1300 ? '14px' : '16px'

                        if (width < 850) {
                            DefaultLayoutView.displayModeNav.next('Minimized')
                            DefaultLayoutView.displayModeToc.next('Minimized')
                            return
                        }
                        if (width < 1100) {
                            DefaultLayoutView.displayModeNav.next('Minimized')
                            DefaultLayoutView.displayModeToc.next('Full')
                            return
                        }
                        DefaultLayoutView.displayModeNav.next('Full')
                        DefaultLayoutView.displayModeToc.next('Full')
                    })
                    resizeObserver.observe(e)
                },
                children: [
                    {
                        tag: 'div',
                        class: 'd-flex justify-content-center pt-5 w-100',
                        style: {
                            position: 'relative',
                        },
                        children: [
                            {
                                source$: DefaultLayoutView.displayModeNav.pipe(
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
                                    width: '75%',
                                    maxWidth: '40em',
                                    height: 'fit-content',
                                    minHeight: '100%',
                                    position: 'relative',
                                },
                                children: [new PageView({ router: router })],
                            },
                            {
                                source$: DefaultLayoutView.displayModeToc.pipe(
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
                        children: [new FooterView()],
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
