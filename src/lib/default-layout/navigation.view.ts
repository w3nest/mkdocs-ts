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
import { DisplayOptions } from './default-layout.view'
import { NavHeaderView } from './nav-header.view'
import { BehaviorSubject } from 'rxjs'
import { AnyView, NavNodePromise } from '../navigation.node'

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
 * Represents the navigation view of the application, displaying a hierarchical structure of navigation nodes.
 *
 * It is the primary component for presenting and interacting with the application's navigation tree.
 * It integrates seamlessly with the router to reflect the current navigation state and enables user interaction with
 * navigation nodes.
 *
 * Each node in the tree includes a customizable header generated from the attribute `header` of {@link Navigation}
 * (see {@link NavHeaderView}).
 * If a navigation node is not yet resolved, a spinner is displayed in place of the node's header.
 *
 **/
export class NavigationView implements VirtualDOM<'div'> {
    static readonly CssSelector = 'mkdocs-NavigationView'
    public readonly router: Router<unknown, NavHeader>

    public readonly tag = 'div'
    public readonly class: string = `${NavigationView.CssSelector} mkdocs-thin-v-scroller mkdocs-bg-5 mkdocs-text-5 px-1 rounded h-100`
    public readonly style: CSSAttribute
    public readonly children: ChildrenLike
    public readonly displayOptions: DisplayOptions
    public readonly bookmarks$?: BehaviorSubject<string[]>

    /**
     * Initializes a new instance.
     *
     * @param params
     * @param params.router Application router.
     * @param params.displayOptions Layout display options.
     * @param params.bookmarks$ State of bookmarked URLs.
     */
    constructor(params: {
        router: Router<unknown, NavHeader>
        displayOptions: DisplayOptions
        bookmarks$?: BehaviorSubject<string[]>
    }) {
        Object.assign(this, params)
        this.style = {
            minWidth: `${String(params.displayOptions.navMinWidth)}px`,
            //height: `calc(100vh-${params.displayOptions.topStickyPaddingMax}-${params.displayOptions.bottomStickyPaddingMax})`,
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

/**
 * A columnar layout wrapper around {@link NavigationView}, providing optional header and footer views.
 *
 * **Structure**
 *
 * This wrapper organizes the navigation view into a vertically-stacked column layout:
 *
 * - **Header**: An optional view displayed at the top of the column. It can be used for branding, titles,
 * or custom controls.
 * - **NavigationView**: The main navigation panel that manages access to navigation nodes.
 * - **Footer**: An optional view displayed at the bottom of the column. It can be used for additional controls or
 * contextual information.
 **/
export class NavigationWrapperView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex flex-column h-100'
    public readonly children: ChildrenLike
    public readonly style = {}

    public readonly router: Router<unknown, NavHeader>
    public readonly displayOptions: DisplayOptions
    public readonly bookmarks$?: BehaviorSubject<string[]>

    /**
     * Initializes a new instance.
     *
     * @param params
     * @param params.router Application router.
     * @param params.header Optional header.
     * @param params.footer Optional footer.
     * @param params.displayOptions Layout display options.
     * @param params.bookmarks$ State of bookmarked URLs.
     */
    constructor(params: {
        router: Router<unknown, NavHeader>
        header?: AnyView
        footer?: AnyView
        displayOptions: DisplayOptions
        bookmarks$?: BehaviorSubject<string[]>
    }) {
        Object.assign(this, params)
        const navView = new NavigationView({
            router: this.router,
            displayOptions: this.displayOptions,
            bookmarks$: this.bookmarks$,
        })

        this.children = [
            params.header,
            {
                tag: 'div',
                class: 'flex-grow-1',
                children: [navView],
            },
            params.footer,
        ]
    }
}
