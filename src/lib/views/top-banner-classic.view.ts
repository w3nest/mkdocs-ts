import {
    ChildrenLike,
    VirtualDOM,
    AttributeLike,
    CSSAttribute,
    AnyVirtualDOM,
} from '@youwol/rx-vdom'

import { Router, Navigation } from '..'
import { Subject } from 'rxjs'
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
        'mkdocs-TopBannerClassicView w-100 mkdocs-bg-5 mkdocs-text-5 py-2 d-flex justify-content-center'
    public readonly children: ChildrenLike

    /**
     * Initializes a new instance.
     *
     * @param params Most of them are forwarded from {@link DefaultLayoutView}.
     */
    constructor(params: TopBannerClassicParams) {
        this.children = [
            new MainColumn(params),
            {
                source$: params.displayModeToc$,
                vdomMap: (mode: DisplayMode) =>
                    mode === 'Full' ? new RightColumn(params) : { tag: 'div' },
            },
        ]
    }
}

export class NavItemsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'mt-2 mb-1 d-flex justify-content-left'
    public readonly children: ChildrenLike
    constructor({ router }: { router: Router }) {
        const firstLayer = Object.entries(router.navigation).filter(([k]) =>
            k.startsWith('/'),
        )

        this.children = [
            new NavItem({ node: router.navigation, href: '/', router }),
            ...firstLayer.map(
                ([k, v]: [k: string, v: Navigation]) =>
                    new NavItem({
                        node: v,
                        href: k,
                        router,
                    }),
            ),
        ]
    }
}

export class NavItem implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'me-5'
    public readonly children: ChildrenLike
    constructor({
        node,
        href,
        router,
    }: {
        node: Navigation
        href: string
        router: Router
    }) {
        this.children = [
            {
                tag: 'div',
                class: node.decoration?.wrapperClass || '',
                children: [
                    {
                        tag: 'a',
                        class: {
                            source$: router.currentPath$,
                            vdomMap: (path: string) => {
                                if (href === '/') {
                                    return path === '/'
                                        ? 'mkdocs-text-5'
                                        : 'mkdocs-text-4'
                                }
                                return path.startsWith(href)
                                    ? 'mkdocs-text-5'
                                    : 'mkdocs-text-4'
                            },
                            wrapper: (d) =>
                                `${d} mkdocs-hover-text-5 d-flex align-items-center`,
                            untilFirst: 'mkdocs-text-4',
                        },
                        href: href,
                        children: [
                            node.decoration?.icon,
                            {
                                tag: 'div',
                                innerText: node.name,
                            },
                        ],
                        onclick: (ev) => {
                            ev.preventDefault()
                            router.navigateTo({ path: href })
                            if (href === '/') {
                                router.explorerState.expandedNodes$.next(['/'])
                                return
                            }
                            const expanded =
                                router.explorerState.expandedNodes$.value.filter(
                                    (n) => {
                                        return n.startsWith(href)
                                    },
                                )
                            router.explorerState.expandedNodes$.next([
                                '/',
                                ...expanded,
                            ])
                        },
                    },
                ],
            },
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
        this.style = {
            source$: displayModeNav$,
            vdomMap: (mode: DisplayMode) => {
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
        }
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
                    {
                        source$: displayModeNav$,
                        vdomMap: (mode: DisplayMode) => {
                            return mode === 'Full'
                                ? logo
                                : {
                                      tag: 'div',
                                      style: {
                                          paddingLeft:
                                              layoutOptions.pageXPadding,
                                      },
                                      children: [
                                          new ModalNavigationView({
                                              router,
                                              displayModeToc$: displayModeToc$,
                                              footer: badge,
                                          }),
                                      ],
                                  }
                        },
                    },
                    {
                        tag: 'i',
                        class: 'mx-3',
                    },
                    titleVDom,
                ],
            },
            {
                source$: displayModeNav$,
                vdomMap: (mode: DisplayMode) =>
                    mode === 'Full'
                        ? new NavItemsView({ router })
                        : { tag: 'div' },
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
