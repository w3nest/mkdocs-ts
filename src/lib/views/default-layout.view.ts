import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { NavigationView } from './navigation.view'
import { Router } from '../router'
import { PageFooterView, PageView } from './page.view'
import {
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

export class DefaultLayoutView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: AnyVirtualDOM[]
    public readonly class = 'd-flex flex-column h-100 w-100 overflow-y-auto'

    public readonly displayModeNav = new Subject<DisplayMode>()
    public readonly displayModeToc = new Subject<DisplayMode>()

    public readonly style = {
        fontFamily: 'Lexend, sans-serif',
    }
    constructor({ router, name }: { router: Router; name: string }) {
        const wrapperSideNav = (side: 'left' | 'right') => ({
            tag: 'div' as const,
            class: 'mkdocs-ts-side-nav',
            style: {
                marginRight: side == 'left' ? '3rem' : '0rem',
                marginLeft: side == 'right' ? '3rem' : '0rem',
                maxHeight: '80vh',
                position: 'sticky' as const,
                top: '0px',
                width: '16rem',
            },
        })
        this.children = [
            new TopBannerView({
                name,
                displayModeNav$: this.displayModeNav,
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
                            this.displayModeNav.next('Minimized')
                            this.displayModeToc.next('Minimized')
                            return
                        }
                        if (width < 1100) {
                            this.displayModeNav.next('Minimized')
                            this.displayModeToc.next('Full')
                            return
                        }
                        this.displayModeNav.next('Full')
                        this.displayModeToc.next('Full')
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
                                source$: this.displayModeNav.pipe(
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
                                    maxWidth: '40rem',
                                    height: 'fit-content',
                                    minHeight: '100%',
                                    position: 'relative',
                                },
                                children: [new PageView({ router: router })],
                            },
                            {
                                source$: this.displayModeToc.pipe(
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
                        children: [new PageFooterView()],
                    },
                ],
            },
        ]
    }
}

export class TocWrapperView implements VirtualDOM<'div'> {
    public readonly router: Router

    public readonly tag = 'div'
    public readonly class = 'w-100 scrollbar-on-hover '
    public readonly style = {
        maxHeight: '100%',
    }
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
