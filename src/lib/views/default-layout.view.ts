import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { Router } from '../router'
import { ImmutableTree } from '@youwol/rx-tree-views'
import { NavigationHeader } from './navigation.view'
import { PageFooterView, PageView } from './page.view'
import { combineLatest, debounceTime, from, mergeMap, of } from 'rxjs'

export class DefaultLayoutView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: AnyVirtualDOM[]
    public readonly class = 'd-flex flex-column h-100 w-100 overflow-auto'

    public readonly style = {
        fontFamily: 'Lexend, sans-serif',
    }
    constructor({
        router,
        topBanner,
    }: {
        router: Router
        topBanner: AnyVirtualDOM
    }) {
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
            topBanner,
            {
                tag: 'div',
                class: 'flex-grow-1 w-100 overflow-auto',
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
                        style: {
                            position: 'relative',
                        },
                        children: [
                            {
                                ...wrapperSideNav('left'),
                                children: [new NavigationView({ router })],
                            },
                            {
                                tag: 'div',
                                style: {
                                    maxWidth: '40rem',
                                    height: 'fit-content',
                                    minHeight: '100%',
                                    position: 'relative',
                                },
                                children: [new PageView({ router: router })],
                            },
                            {
                                ...wrapperSideNav('right'),
                                children: [new TocWrapperView({ router })],
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

export class NavigationView implements VirtualDOM<'div'> {
    public readonly router: Router

    public readonly tag = 'div'
    public readonly class = 'h-100 overflow-auto mr-3'
    public readonly children: ChildrenLike

    constructor(params: { router: Router }) {
        Object.assign(this, params)

        this.children = [
            new ImmutableTree.View({
                state: this.router.explorerState,
                headerView: (state, node) => {
                    return new NavigationHeader({
                        node,
                        router: this.router,
                    })
                },
            }),
        ]
    }
}

export class TocWrapperView implements VirtualDOM<'div'> {
    public readonly router: Router

    public readonly tag = 'div'
    public readonly class = 'h-100 px-1  scrollbar-on-hover '

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
