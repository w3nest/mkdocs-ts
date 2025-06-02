import {
    AnyVirtualDOM,
    attr$,
    AttributeLike,
    ChildrenLike,
    CSSAttribute,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'
import { BehaviorSubject, Observable, Subject } from 'rxjs'
import {
    BBox,
    DisplayMode,
    DisplayOptions,
    plugBoundingBoxObserver,
} from './common'
import { TocWrapperView } from './toc.view'
import { AnyView } from '../navigation.node'
import { NavigationView } from './navigation.view'
import { LayoutObserver } from './common'
import { FaIconsList, faIconTyped } from './fa-icons'

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
    public readonly style = {
        zIndex: 1,
    }
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
        icon: FaIconsList
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
            children: [faIconTyped(params.icon)],
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

export interface ExpandableParams<
    T extends TocWrapperView | NavigationView = TocWrapperView | NavigationView,
> {
    content: T
    layoutObserver: LayoutObserver
    displayOptions: DisplayOptions
    displayMode$: BehaviorSubject<DisplayMode>
    boundingBox$: Subject<BBox>
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

    constructor(
        params: {
            items: AnyView[]
            toggleIcon?: FaIconsList
            visible$?: Observable<boolean>
            onDisplayed?: (elem: RxHTMLElement<'div'>) => void
        } & Pick<
            ExpandableParams,
            'layoutObserver' | 'displayMode$' | 'boundingBox$'
        >,
    ) {
        this.style = attr$({
            source$: params.layoutObserver.boxes$,
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
                    source$: params.layoutObserver.pageVisible$,
                    vdomMap: ({ height }) => {
                        return {
                            height: `${String(height)}px`,
                            position: 'relative',
                        }
                    },
                }),
                children: [
                    params.toggleIcon
                        ? new ToggleSidePanelButton({
                              displayMode$: params.displayMode$,
                              visible$: params.visible$,
                              icon: params.toggleIcon,
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
            plugBoundingBoxObserver(elem, params.boundingBox$)
        }
    }
}

export class ExpandableTocColumn extends ExpandableBaseColumn {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-ExpandableTocColumn'

    public readonly class = `${ExpandableTocColumn.CssSelector} pe-5`

    constructor(params: ExpandableParams<TocWrapperView>) {
        super({
            ...params,
            visible$: params.content.tocEnabled$,
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
                    children: [params.content],
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

    constructor(params: ExpandableParams<NavigationView>) {
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
                        source$: params.displayMode$,
                        vdomMap: (mode) => {
                            return slidingStyle({
                                mode,
                                offset: 0,
                                side: 'left',
                                maxWidth: params.displayOptions.navMaxWidth,
                                translationTime:
                                    params.displayOptions.translationTime,
                                paddingY: '0rem',
                            })
                        },
                    }),
                    children: [params.content],
                },
            ],
        })
    }
}

export class EmptyToc implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly connectedCallback: (element: RxHTMLElement<'div'>) => void

    constructor(boundingBox$: Subject<DOMRect>) {
        this.connectedCallback = (elem) => {
            plugBoundingBoxObserver(elem, boundingBox$)
        }
    }
}
