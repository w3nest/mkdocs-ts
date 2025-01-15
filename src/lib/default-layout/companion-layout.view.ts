import { attr$, child$, ChildrenLike, VirtualDOM, RxHTMLElement } from 'rx-vdom'
import { isResolvedTarget, Router } from '../router'
import { BehaviorSubject, filter, from, map, switchMap, take, skip } from 'rxjs'
import { Layout, DefaultLayoutParams } from './default-layout.view'
import { PageView } from './page.view'
import { MockBrowser } from '../browser.interface'
import { NavActionView } from './nav-header.view'

/**
 * Parameters for constructing {@link LayoutWithCompanion} layout.
 *
 * Mostly the {@link DefaultLayoutParams}, to which is added:
 * *  `companionNodes$` provide handle regarding companion nodes selection.
 * *  `companionWidth` (included within display options), to control the width of the companion screen in percent.
 */
export type LayoutWithCompanionParams = DefaultLayoutParams<{
    /**
     * Width of the companion screen in percent, default to 40.
     */
    companionWidth?: number
}> & {
    /**
     * A `BehaviorSubject` containing the URLs of companion nodes to be displayed
     * in the companion screen. Children of the specified nodes are also displayed within that screen.
     */
    companionNodes$: BehaviorSubject<string[]>
}
/**
 * Represents a layout based on {@link Layout}, with an additional split view feature allowing
 * two pages to be displayed side-by-side.
 *
 * **Structure**
 *
 * - The **main-screen** (on the left) displays the default layout using the provided router.
 *
 * - The **companion-screen** (on the right) displays views for the navigation nodes specified in `companionNodes$`.
 *
 * **Companion Screen**
 *
 * - Navigation in the companion screen uses a {@link MockBrowser} client: browser's URL is not updated.
 *
 * - The nodes selected for the companion screen (`companionNodes$`) are provided and managed by the consumer.
 *
 * **Integration Notes**
 *
 * - Use the helper function {@link splitCompanionAction} to integrate a toggle button into the navigation headers of
 *   selected nodes, simplifying the management of `companionNodes$`.
 *
 * - To prevent updates to the browser URL when navigating companion nodes, adjust {@link WebBrowser.ignoredPaths$}
 *   to include `companionNodes$`. This ensures that navigation remains isolated when navigating to companion-screen
 *   from the main-screen.
 *
 */
export class LayoutWithCompanion implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'mkdocs-LayoutWithCompanion w-100 h-100 d-flex'
    public readonly children: ChildrenLike
    public readonly connectedCallback: (elem: RxHTMLElement<'div'>) => void

    public readonly companionNodes$: BehaviorSubject<string[]>

    /**
     * Constructs a new `LayoutWithCompanion` layout.
     *
     * @param params See {@link LayoutWithCompanionParams}
     **/
    constructor(params: LayoutWithCompanionParams) {
        this.companionNodes$ = params.companionNodes$

        const isCompanionPath = (path: string) => {
            return (
                this.companionNodes$.value.find((companionPath) =>
                    path.startsWith(companionPath),
                ) !== undefined
            )
        }

        const mainView = new Layout({
            ...params,
            page: ({ router }) =>
                new PageView({
                    router,
                    filter: (d) => !isCompanionPath(d.path),
                }),
        })
        const companionRouter = new Router({
            navigation: params.router.navigation,
            browserClient: (p) => new MockBrowser(p),
        })

        const subs = [
            params.router.target$
                .pipe(
                    filter((target) => isResolvedTarget(target)),
                    filter((target) => isCompanionPath(target.path)),
                    switchMap((target) =>
                        from(companionRouter.navigateTo(target)),
                    ),
                )
                .subscribe(),
            companionRouter.target$
                .pipe(
                    skip(1),
                    filter((target) => isResolvedTarget(target)),
                    filter((target) => !isCompanionPath(target.path)),
                    switchMap((target) =>
                        from(params.router.navigateTo(target)),
                    ),
                )
                .subscribe(),
            this.companionNodes$
                .pipe(
                    filter((prefixes) => prefixes.length >= 1),
                    take(1),
                    switchMap((target) =>
                        from(companionRouter.navigateTo({ path: target[0] })),
                    ),
                )
                .subscribe(),
        ]
        this.connectedCallback = (elem) => {
            elem.ownSubscriptions(...subs)
        }
        const companionWidth = params.displayOptions?.companionWidth ?? 40
        this.children = [
            {
                tag: 'div',
                class: 'h-100',
                style: attr$({
                    source$: this.companionNodes$,
                    vdomMap: (d) =>
                        d.length === 0
                            ? { width: '100%' }
                            : { width: `${String(100 - companionWidth)}%` },
                }),
                children: [mainView],
            },
            child$({
                source$: this.companionNodes$,
                vdomMap: (target) => {
                    if (target.length === 0) {
                        return { tag: 'div' }
                    }
                    return {
                        tag: 'div',
                        class: 'bg-light h-100 px-5 pt-5 overflow-auto',
                        style: {
                            width: `${String(companionWidth)}%`,
                        },
                        children: [
                            new PageView({
                                router: companionRouter,
                                filter: (d) => {
                                    const companion =
                                        this.companionNodes$.value.find(
                                            (path) => d.path.startsWith(path),
                                        )
                                    return companion !== undefined
                                },
                            }),
                        ],
                        connectedCallback: (e) => {
                            companionRouter.setScrollableElement(e)
                        },
                    }
                },
            }),
        ]
    }
}

export function splitCompanionAction({
    path,
    companionNodes$,
}: {
    path: string
    companionNodes$: BehaviorSubject<string[]>
}): NavActionView {
    return new NavActionView({
        content: {
            tag: 'i',
            class: attr$({
                source$: companionNodes$.pipe(
                    map((prefixes) =>
                        prefixes.find((prefix) => path === prefix),
                    ),
                ),
                vdomMap: (toggled) =>
                    toggled ? 'fas fa-times' : 'fas fa-columns',
            }),
        },
        action: () => {
            const selected = companionNodes$.value.find(
                (prefix) => path === prefix,
            )
            if (selected) {
                const newNodes = companionNodes$.value.filter(
                    (prefix) => path !== prefix,
                )
                companionNodes$.next(newNodes)
                return
            }
            companionNodes$.next([...companionNodes$.value, path])
        },
    })
}
