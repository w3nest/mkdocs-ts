import { distinctUntilChanged, Subject } from 'rxjs'
import { DisplayMode } from './default-layout.view'
import { ModalNavigationView } from './navigation.view'
import { Router } from '../router'
import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'

/**
 * Simple top banner definition, including:
 * *  Eventually a dropdown menu to expand the {@link ModalNavigationView} (on small screen)
 * *  A title
 *
 */
export class TopBannerView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class =
        'mkdocs-TopBannerView fv-text-primary fv-bg-background'
    public readonly children: ChildrenLike

    constructor({
        name,
        displayModeNav$,
        displayModeToc$,
        router,
    }: {
        name: string | AnyVirtualDOM
        displayModeNav$: Subject<DisplayMode>
        displayModeToc$: Subject<DisplayMode>
        router: Router
    }) {
        const title: AnyVirtualDOM =
            typeof name === 'string'
                ? {
                      tag: 'div',
                      class: 'd-flex align-items-center',
                      style: {
                          width: '12.1em',
                          padding: '1.2em 0 1.2em 0',
                      },
                      children: [
                          {
                              tag: 'a',
                              class: 'fas fa-book-reader',
                          },
                          {
                              tag: 'div',
                              class: 'mx-3',
                          },
                          {
                              tag: 'div',
                              innerText: name,
                              style: {
                                  fontWeight: 700,
                                  fontSize: '1.2em',
                              },
                          },
                      ],
                  }
                : name
        this.children = [
            {
                tag: 'div',
                class: 'd-flex flex-column justify-content-center h-100',
                children: [
                    {
                        tag: 'div',
                        class: 'd-flex mx-auto align-items-center justify-content-center px-5',
                        children: [
                            {
                                source$: displayModeNav$.pipe(
                                    distinctUntilChanged(),
                                ),
                                vdomMap: (mode: DisplayMode) => {
                                    return mode === 'Full'
                                        ? { tag: 'div' }
                                        : new ModalNavigationView({
                                              router,
                                              displayModeToc$: displayModeToc$,
                                          })
                                },
                            },
                            {
                                tag: 'div',
                                class: 'mx-3',
                            },
                            title,
                            {
                                tag: 'div',
                                style: {
                                    width: '800px',
                                },
                            },
                            {
                                tag: 'div',
                                style: {
                                    width: '12.1em',
                                    padding: '1.2em 0 1.2em 0',
                                },
                            },
                        ],
                    },
                ],
            },
        ]
    }
}
