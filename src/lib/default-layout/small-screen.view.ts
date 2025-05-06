import {
    AnyVirtualDOM,
    attr$,
    AttributeLike,
    ChildrenLike,
    CSSAttribute,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs'
import { NavigationWrapperView } from './navigation.view'
import { Sizings, DisplayMode, DisplayOptions } from './default-layout.view'
import { TocWrapperView } from './toc.view'
import { AnyView } from '../navigation.node'

function slidingStyle({
    mode,
    offset,
    side,
    maxWidth,
    translationTime,
    paddingY,
}: {
    mode: DisplayMode
    offset: number
    side: 'right' | 'left'
    maxWidth: number
    translationTime: number
    paddingY: string
}): CSSAttribute {
    return {
        position: 'absolute',
        paddingTop: paddingY,
        paddingBottom: paddingY,
        height: `100%`,
        transition: `${side} ${String(translationTime)}ms`,
        [side]:
            mode === 'expanded'
                ? `${String(offset)}px`
                : `-${String(maxWidth + offset)}px`,
        top: '0px',
        //zIndex: -1,
    }
}

/**
 * The toggle button to display / hide the side panels.
 */
export class ToggleSidePanelButton implements VirtualDOM<'div'> {
    static readonly CssSelector = 'mkdocs-ToggleNavButton'
    public readonly tag = 'div'
    public readonly class: AttributeLike<string>
    public readonly children: ChildrenLike
    /**
     * Initializes a new instance.
     *
     * @param params
     * @param params.displayMode$ The display mode.
     * @param params.visible$ If provided, this observable can be used to hide the button.
     */
    constructor(params: {
        displayMode$: BehaviorSubject<DisplayMode | 'none'>
        visible$?: Observable<boolean>
        icon: string
    }) {
        const classBase = ToggleSidePanelButton.CssSelector
        this.class = params.visible$
            ? {
                  source$: params.visible$,
                  vdomMap: (isVisible) => {
                      return isVisible ? classBase : 'd-none'
                  },
              }
            : classBase

        const button: AnyVirtualDOM = {
            tag: 'button',
            class: attr$({
                source$: params.displayMode$,
                vdomMap: (mode): string => {
                    if (mode === 'hidden') {
                        return 'btn-light'
                    }
                    if (mode === 'expanded') {
                        return 'btn-dark'
                    }
                    return ''
                },
                wrapper: (c) => {
                    return `btn btn-sm border ${c}`
                },
            }),
            children: [
                {
                    tag: 'i',
                    class: `fas ${params.icon}`,
                },
            ],
            onclick: () => {
                if (params.displayMode$.value === 'hidden') {
                    params.displayMode$.next('expanded')
                    return
                }
                if (params.displayMode$.value === 'expanded') {
                    params.displayMode$.next('hidden')
                    return
                }
            },
        }
        this.children = [
            {
                tag: 'div',
                class: 'd-flex justify-content-center',
                children: [button],
            },
        ]
    }
}

export class ExpandableBaseColumn implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly style: AttributeLike<CSSAttribute>
    public readonly htmlElement$ = new Subject<HTMLElement>()
    public readonly connectedCallback: (elem: HTMLElement) => void

    public readonly onclick = (ev: MouseEvent) => {
        ev.stopPropagation()
    }

    constructor(params: {
        items: AnyView[]
        toggleIcon?: string
        sizings$: Observable<Pick<Sizings, 'pageVisibleHeight' | 'topBanner'>>
        displayMode$: BehaviorSubject<DisplayMode | 'none'>
        visible$?: Observable<boolean>
        onDisplayed?: (elem: RxHTMLElement<'div'>) => void
    }) {
        this.style = attr$({
            source$: params.sizings$,
            vdomMap: ({ topBanner }) => {
                return {
                    height: `0px`,
                    overflow: 'visible',
                    position: 'sticky',
                    top: `${String(topBanner.height)}px`,
                    zIndex: 10,
                }
            },
        })
        this.children = [
            {
                tag: 'div',
                class: 'd-flex flex-column py-3',
                style: attr$({
                    source$: params.sizings$,
                    vdomMap: ({ pageVisibleHeight }) => {
                        return {
                            height: `${String(pageVisibleHeight)}px`,
                            position: 'relative',
                        }
                    },
                }),
                children: [
                    params.toggleIcon
                        ? new ToggleSidePanelButton({
                              displayMode$: params.displayMode$,
                              icon: params.toggleIcon,
                              visible$: params.visible$,
                          })
                        : undefined,
                    ...params.items,
                ],
            },
        ]
        this.connectedCallback = (elem: RxHTMLElement<'div'>) => {
            if (params.onDisplayed) {
                params.onDisplayed(elem)
            }
            this.htmlElement$.next(elem)
        }
    }
}

export class ExpandableTocColumn extends ExpandableBaseColumn {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-ExpandableTocColumn pe-5'

    public readonly class = ExpandableTocColumn.CssSelector

    constructor(params: {
        displayOptions: DisplayOptions
        tocView: TocWrapperView
        sizings$: Observable<Pick<Sizings, 'pageVisibleHeight' | 'topBanner'>>
        displayMode$: BehaviorSubject<DisplayMode>
    }) {
        super({
            ...params,
            visible$: params.tocView.tocEnabled$,
            toggleIcon: 'fa-list-ul',
            items: [
                {
                    tag: 'div',
                    style: attr$({
                        source$: params.displayMode$,
                        vdomMap: (mode) => {
                            return slidingStyle({
                                mode,
                                offset: 0,
                                side: 'right',
                                maxWidth:
                                    params.displayOptions.tocMaxWidth + 50,
                                translationTime:
                                    params.displayOptions.translationTime,
                                paddingY: '3rem',
                            })
                        },
                    }),
                    children: [params.tocView],
                },
            ],
        })
    }
}

export class ExpandableNavColumn extends ExpandableBaseColumn {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-ExpandableNavColumn'

    public readonly class = `${ExpandableNavColumn.CssSelector} mkdocs-bg-6`

    constructor(params: {
        navView: NavigationWrapperView
        sizings$: Observable<Pick<Sizings, 'pageVisibleHeight' | 'topBanner'>>
        displayOptions: DisplayOptions
        displayMode$: BehaviorSubject<DisplayMode>
    }) {
        const htmlElement$ = new Subject<HTMLElement>()
        super({
            ...params,
            onDisplayed: (elem: RxHTMLElement<'div'>) => {
                htmlElement$.next(elem)
            },
            items: [
                {
                    tag: 'div',
                    class: 'overflow-auto mkdocs-bg-5 mkdocs-text-5 h-100 mkdocs-thin-v-scroller',
                    style: attr$({
                        source$: combineLatest([
                            params.displayMode$,
                            htmlElement$,
                        ]),
                        vdomMap: ([mode, favView]) => {
                            return slidingStyle({
                                mode,
                                offset: favView.offsetWidth,
                                side: 'left',
                                maxWidth: params.displayOptions.navMaxWidth,
                                translationTime:
                                    params.displayOptions.translationTime,
                                paddingY: '0rem',
                            })
                        },
                    }),
                    children: [params.navView],
                },
            ],
        })
    }
}
