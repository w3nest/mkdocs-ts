/**
 * This file gathers views related to navigation.
 */

import { ChildrenLike, VirtualDOM, CSSAttribute, EmptyDiv } from 'rx-vdom'
import { Router } from '../router'
import { ImmutableTree } from '@w3nest/ui-tk/Trees'
import { DisplayOptions, NavHeader } from './common'
import { NavHeaderView } from './nav-header.view'
import { BehaviorSubject } from 'rxjs'
import { NavNodePromise } from '../navigation.node'
import { faIconTyped } from './fa-icons'

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
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-NavigationView'
    public readonly router: Router<unknown, NavHeader>

    public readonly tag = 'div'
    public readonly class: string = `${NavigationView.CssSelector} mkdocs-bg-5 mkdocs-text-5 px-1 h-100 overflow-auto mkdocs-thin-v-scroller`
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
            minWidth: params.displayOptions.navMinWidth,
        }
        this.children = [
            new ImmutableTree.View({
                state: this.router.explorerState,
                headerView: ({ node }) => {
                    if (node instanceof NavNodePromise) {
                        return faIconTyped('fa-spinner', { spin: true })
                    }
                    if (node.href === '/') {
                        return EmptyDiv
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
