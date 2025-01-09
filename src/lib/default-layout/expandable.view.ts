import { attr$, ChildrenLike, CSSAttribute, VirtualDOM } from 'rx-vdom'
import { combineLatest } from 'rxjs'
import { FavoritesView, ToggleNavButton } from './favorites.view'
import { NavigationView } from './navigation.view'
import {
    DisplayMode,
    DisplayOptions,
    StickyColumnContainer,
} from './default-layout.view'
import { TocWrapperView } from './toc.view'

function slidingStyle({
    mode,
    offset,
    side,
    layoutOptions,
}: {
    mode: DisplayMode
    offset: number
    side: 'right' | 'left'
    layoutOptions: DisplayOptions
}): CSSAttribute {
    const maxWidth =
        side === 'right' ? layoutOptions.tocMaxWidth : layoutOptions.navMaxWidth
    return {
        position: 'absolute',
        height: `calc(100vh-${layoutOptions.topStickyPaddingMax} - ${layoutOptions.bottomStickyPaddingMax})`,
        transition: `${side} ${String(layoutOptions.translationTime)}ms`,
        [side]:
            mode === 'expanded'
                ? `${String(offset)}px`
                : `-${String(maxWidth + offset)}px`,
        top: '0px',
        zIndex: -1,
    }
}
export class ExpandableRightSide implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class: string
    public readonly children: ChildrenLike
    public readonly style = {
        position: 'relative' as const,
    }
    public readonly layoutOptions: DisplayOptions
    public readonly tocView: TocWrapperView

    constructor(params: {
        layoutOptions: DisplayOptions
        tocView: TocWrapperView
    }) {
        Object.assign(this, params)
        this.class = this.layoutOptions.topStickyPaddingMax

        this.children = [
            {
                tag: 'div',
                style: StickyColumnContainer.stickyStyle(this.layoutOptions),
                children: [
                    new ToggleNavButton({
                        displayMode$: this.tocView.displayMode$,
                    }),
                    {
                        tag: 'div',
                        style: attr$({
                            source$: this.tocView.displayMode$,
                            vdomMap: (mode) => {
                                return slidingStyle({
                                    mode,
                                    offset: 0,
                                    side: 'right',
                                    layoutOptions: this.layoutOptions,
                                })
                            },
                        }),
                        children: [this.tocView],
                    },
                ],
            },
        ]
    }
}

export class ExpandableLeftSide implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class: string
    public readonly children: ChildrenLike
    public readonly style = {
        position: 'relative' as const,
    }

    constructor(params: {
        favoritesView: FavoritesView
        navView: NavigationView
    }) {
        Object.assign(this, params)
        const layoutOptions = params.navView.layoutOptions
        this.class = `${layoutOptions.topStickyPaddingMax} mkdocs-bg-6`
        const { displayMode$, htmlElement$ } = params.favoritesView
        this.children = [
            {
                tag: 'div',
                style: StickyColumnContainer.stickyStyle(layoutOptions),
                children: [
                    params.favoritesView,
                    {
                        tag: 'div',
                        class: 'overflow-auto mkdocs-bg-5',
                        style: attr$({
                            source$: combineLatest([
                                displayMode$,
                                htmlElement$,
                            ]),
                            vdomMap: ([mode, favView]) => {
                                return slidingStyle({
                                    mode,
                                    offset: favView.offsetWidth,
                                    side: 'left',
                                    layoutOptions,
                                })
                            },
                        }),
                        children: [
                            new NavigationView({
                                ...params.navView,
                            }),
                        ],
                    },
                ],
            },
        ]
    }
}
