/**
 * This file gathers views related to navigation.
 */

import {
    ChildrenLike,
    VirtualDOM,
    CSSAttribute,
    AttributeLike,
    ChildLike,
} from 'rx-vdom'
import { Router } from '../router'
import { ImmutableTree } from '@w3nest/rx-tree-views'
import { LayoutOptions } from './default-layout.view'
import { NavHeaderView } from './nav-header.view'
import { BehaviorSubject } from 'rxjs'
import { NavNodePromise } from '../navigation.node'

/**
 * Defines attributes regarding the visual rendering of the node if the navigation view.
 */
export interface NavHeader {
    /**
     * Optional class added as wrapper to the HTML element representing the node.
     */
    wrapperClass?: AttributeLike<string>
    /**
     * Optional icon, inserted before the node's name.
     */
    icon?: ChildLike
    /**
     * Optional actions, inserted after the node's name.
     */
    actions?: ChildrenLike
}

/**
 * The 'regular' navigation view (when the screen size is large enough).
 */
export class NavigationView implements VirtualDOM<'div'> {
    public readonly router: Router<unknown, NavHeader>

    public readonly tag = 'div'
    public readonly class: string =
        'mkdocs-NavigationView mkdocs-thin-v-scroller mkdocs-bg-5 mkdocs-text-5 px-1 rounded'
    public readonly style: CSSAttribute
    public readonly children: ChildrenLike
    public readonly layoutOptions: LayoutOptions
    public readonly bookmarks$?: BehaviorSubject<string[]>

    constructor(params: {
        router: Router<unknown, NavHeader>
        layoutOptions: LayoutOptions
        bookmarks$?: BehaviorSubject<string[]>
    }) {
        Object.assign(this, params)
        this.style = {
            minWidth: `${String(params.layoutOptions.navMinWidth)}px`,
            height: `calc(100vh-${params.layoutOptions.topStickyPaddingMax}-${params.layoutOptions.bottomStickyPaddingMax})`,
        }
        this.children = [
            new ImmutableTree.View({
                state: this.router.explorerState,
                headerView: (_, node) => {
                    if (node instanceof NavNodePromise) {
                        return {
                            tag: 'i' as const,
                            class: 'fas fa-spinner fa-spin',
                        }
                    }
                    return new NavHeaderView({
                        node,
                        router: this.router,
                        bookmarks$: this.bookmarks$,
                    })
                },
                options: {
                    autoScroll: {
                        trigger: 'not-visible',
                        top: 50,
                    },
                },
            }),
        ]
    }
}
