import { AnyVirtualDOM, VirtualDOM } from '@youwol/rx-vdom'
import { leftColumnWidth, middleColumnWidth, Router } from '../router'
import { ImmutableTree } from '@youwol/rx-tree-views'
import { NavigationHeader } from '../navigation.node'
import { PageView } from './page.view'
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
        this.children = [
            topBanner,
            {
                tag: 'div',
                class: 'flex-grow-1 d-flex justify-content-center p-5 w-100',
                style: {
                    marginTop: '1.5rem',
                    minHeight: '0px',
                },
                children: [
                    {
                        tag: 'div',
                        class: 'flex-grow-1 d-flex justify-content-end',
                        style: {
                            minWidth: '0px',
                        },
                        children: [
                            {
                                tag: 'div',
                                class: 'h-100 overflow-auto mr-3',
                                style: {
                                    minWidth: leftColumnWidth,
                                    maxWidth: leftColumnWidth,
                                    fontSize: '0.9rem',
                                },
                                children: [
                                    new ImmutableTree.View({
                                        state: router.explorerState,
                                        headerView: (state, node) => {
                                            return new NavigationHeader({
                                                node,
                                                router: router,
                                            })
                                        },
                                    }),
                                ],
                            },
                        ],
                    },
                    {
                        tag: 'div',
                        style: {
                            maxWidth: middleColumnWidth,
                            minWidth: middleColumnWidth,
                        },
                        children: [new PageView({ router: router })],
                    },
                    {
                        tag: 'div',
                        class: 'flex-grow-1 d-flex justify-content-left',
                        style: {
                            minWidth: '0px',
                        },
                        children: [
                            {
                                tag: 'div',
                                class: 'h-100 px-1  scrollbar-on-hover ',
                                children: [
                                    {
                                        source$: combineLatest([
                                            router.currentNode$,
                                            router.currentHtml$,
                                        ]).pipe(
                                            debounceTime(200),
                                            mergeMap(([node, elem]) => {
                                                return node.tableOfContent
                                                    ? from(
                                                          node.tableOfContent({
                                                              html: elem,
                                                              router: router,
                                                          }),
                                                      )
                                                    : of(undefined)
                                            }),
                                        ),
                                        vdomMap: (
                                            toc?: AnyVirtualDOM,
                                        ): AnyVirtualDOM => {
                                            return toc || { tag: 'div' }
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ]
    }
}
