import {
    ChildrenLike,
    VirtualDOM,
    AttributeLike,
    CSSAttribute,
    AnyVirtualDOM,
    child$,
    attr$,
} from 'rx-vdom'

import { Router, Navigation } from '..'
import { from, Subject } from 'rxjs'
import { DisplayMode, LayoutOptions } from './default-layout.view'
import { ModalNavigationView } from './navigation.view'

/**
 * Parameters for {@link TopBannerClassicView}.
 */
export type TopBannerClassicParams = {
    /**
     * Router, forwared when used within {@link DefaultLayoutView}.
     */
    router: Router
    /**
     * Emit the current display mode regarding navigation, forwared when used within {@link DefaultLayoutView}.
     */
    displayModeNav$: Subject<DisplayMode>
    /**
     * Emit the current display mode regarding TOC, forwared when used within {@link DefaultLayoutView}.
     */
    displayModeToc$: Subject<DisplayMode>
    /**
     * Layout sizing options, forwarded when used within {@link DefaultLayoutView}.
     */
    layoutOptions: LayoutOptions
    /**
     * The title, forwarded when used within {@link DefaultLayoutView}.
     */
    title: AnyVirtualDOM | string
    /**
     * The logo.
     */
    logo: AnyVirtualDOM
    /**
     * The badge.
     */
    badge: AnyVirtualDOM
}

/**
 * This tob banner includes a logo, a badge (displayed above the TOC view), and navigation short-cuts.
 *
 * It is usually used as `topBanner` parameters of {@link DefaultLayoutView}'s constructor.
 */
export class TopBannerClassicView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class =
        'mkdocs-TopBannerClassicView border-bottom w-100 mkdocs-bg-6 mkdocs-text-5 py-2 d-flex justify-content-center'
    public readonly children: ChildrenLike

    /**
     * Initializes a new instance.
     *
     * @param params Most of them are forwarded from {@link DefaultLayoutView}.
     */
    constructor(params: TopBannerClassicParams) {
        this.children = [
            new MainColumn(params),
            child$({
                source$: params.displayModeToc$,
                vdomMap: (mode: DisplayMode) =>
                    mode === 'Full' ? new RightColumn(params) : { tag: 'div' },
            }),
        ]
    }
}

export class MainColumn implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly id = 'LeftColumn'
    public readonly class = 'd-flex flex-column'
    public readonly children: ChildrenLike
    public readonly style: AttributeLike<CSSAttribute>
    public readonly connectedCallback
    constructor({
        displayModeNav$,
        displayModeToc$,
        layoutOptions,
        router,
        logo,
        title,
        badge,
    }: TopBannerClassicParams) {
        this.style = attr$({
            source$: displayModeNav$,
            vdomMap: (mode) => {
                if (mode === 'Full') {
                    return {
                        width: `calc( ${layoutOptions.navWidth} + ${layoutOptions.pageWidth} )`,
                        maxWidth: `calc( ${layoutOptions.navWidth} + ${layoutOptions.pageMaxWidth} )`,
                    }
                }
                return {
                    width: `calc( ${layoutOptions.pageWidth}`,
                    maxWidth: `calc( ${layoutOptions.pageMaxWidth})`,
                }
            },
        })
        const titleVDom: AnyVirtualDOM =
            typeof title === 'string'
                ? {
                      tag: 'div',
                      class: 'mkdocs-text-5',
                      style: {
                          fontSize: 'larger' as const,
                          fontWeight: 'bolder' as const,
                      },
                      innerText: title,
                  }
                : title
        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    child$({
                        source$: displayModeNav$,
                        vdomMap: (mode) => {
                            return mode === 'Full'
                                ? logo
                                : {
                                      tag: 'div',
                                      children: [
                                          new ModalNavigationView({
                                              router,
                                              displayModeToc$: displayModeToc$,
                                              footer: badge,
                                              bookmarks$: undefined,
                                          }),
                                      ],
                                  }
                        },
                    }),
                    {
                        tag: 'i',
                        class: 'mx-3',
                    },
                    titleVDom,
                ],
            },
        ]
    }
}
export class RightColumn implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly style: AttributeLike<CSSAttribute>

    constructor(params: TopBannerClassicParams) {
        this.style = {
            width: params.layoutOptions.tocWidth,
        }
        this.children = [params.badge]
    }
}

/**
 * A badge to encapsulate a link on an online repository of source code.
 */
export class SourcesLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly href: string
    public readonly target = '_blank'
    public readonly class =
        'd-flex align-items-center mkdocs-text-4 mkdocs-hover-text-5 fv-pointer'
    public readonly children: ChildrenLike

    /**
     * Initializes a new instance.
     *
     * @param _p
     * @param _p.href URL to the repo.
     * @param _p.name Displayed name.
     * @param _p.version Displayed version.
     */
    constructor({
        href,
        name,
        version,
    }: {
        href: string
        name: string
        version: string
    }) {
        this.href = href
        this.children = [
            {
                tag: 'div',
                class: 'my-auto',
                style: {
                    fontSize: 'larger',
                },
                children: [
                    {
                        tag: 'i',
                        class: 'fas fa-code-branch',
                    },
                ],
            },
            {
                tag: 'i',
                class: 'mx-1',
            },
            {
                tag: 'div',
                class: 'd-flex flex-column',
                style: {
                    fontSize: 'smaller',
                },
                children: [
                    {
                        tag: 'div',
                        innerText: name,
                    },
                    {
                        tag: 'div',
                        class: 'd-flex align-items-center',
                        style: {
                            fontSize: 'x-small',
                        },
                        children: [
                            {
                                tag: 'i',
                                class: 'fas fa-tag',
                            },
                            {
                                tag: 'i',
                                class: 'mx-1',
                            },
                            {
                                tag: 'div',
                                innerText: version,
                            },
                        ],
                    },
                ],
            },
        ]
    }
}
