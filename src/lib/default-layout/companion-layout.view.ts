import {
    attr$,
    child$,
    ChildrenLike,
    VirtualDOM,
    RxHTMLElement,
    EmptyDiv,
} from 'rx-vdom'
import { Router, UrlTarget } from '../router'
import {
    BehaviorSubject,
    filter,
    from,
    map,
    switchMap,
    take,
    firstValueFrom,
} from 'rxjs'
import {
    Layout,
    DefaultLayoutParams,
    NavLayout,
    DisplayMode,
} from './default-layout.view'
import { PageView, WrapperPageView } from './page.view'
import { MockBrowser } from '../browser.interface'
import { NavActionView } from './nav-header.view'
import { ContextTrait, NoContext } from '../context'
import { NavHeader } from './navigation.view'
import { TocWrapperView } from './toc.view'
import { ExpandableTocColumn } from './small-screen.view'

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
    static readonly CssSelector = 'mkdocs-LayoutWithCompanion'
    public readonly tag = 'div'
    public readonly class = `${LayoutWithCompanion.CssSelector} w-100 h-100 d-flex`
    public readonly children: ChildrenLike
    public readonly connectedCallback: (elem: RxHTMLElement<'div'>) => void

    public readonly companionNodes$: BehaviorSubject<string[]>

    public readonly context?: ContextTrait
    /**
     * Constructs a new `LayoutWithCompanion` layout.
     *
     * @param params See {@link LayoutWithCompanionParams}
     * @param ctx Execution context used for logging and tracing.
     **/
    constructor(params: LayoutWithCompanionParams, ctx?: ContextTrait) {
        this.context = ctx
        this.companionNodes$ = params.companionNodes$
        const context = this.ctx().start('new LayoutWithCompanion', ['View'])

        const mainView = new Layout({
            ...params,
            page: ({ router }) =>
                new PageView(
                    {
                        router,
                    },
                    context,
                ),
        })
        const companionRouter = context.execute('setupRouters', (ctx) =>
            setupRouters(
                {
                    router: params.router,
                    companionNodes$: this.companionNodes$,
                },
                ctx,
            ),
        )

        const subs = [
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
                        return EmptyDiv
                    }
                    const pageView = new PageView(
                        {
                            router: companionRouter,
                        },
                        context,
                    )
                    const tocView = new TocWrapperView({
                        router: companionRouter,
                        displayMode$: new BehaviorSubject('hidden'),
                        displayOptions: mainView.displayOptions,
                        content$: pageView.content$,
                    })
                    const displayModeToc$ = new BehaviorSubject<DisplayMode>(
                        'hidden',
                    )
                    const expandableRightSideNav = new ExpandableTocColumn({
                        tocView,
                        displayOptions: mainView.displayOptions,
                        height$: mainView.height$,
                        displayMode$: displayModeToc$,
                    })
                    return {
                        tag: 'div',
                        class: 'bg-light h-100 ps-5 pe-2 overflow-y-auto overflow-x-hidden d-flex',
                        style: {
                            width: `${String(companionWidth)}%`,
                        },
                        children: [
                            new WrapperPageView({
                                content: pageView,
                                displayOptions: mainView.displayOptions,
                                displayModeToc$,
                            }),
                            expandableRightSideNav,
                        ],
                        connectedCallback: (e) => {
                            companionRouter.setScrollableElement(e)
                        },
                    }
                },
            }),
        ]
        context.exit()
    }
    ctx() {
        return this.context ?? new NoContext()
    }
}

function setupRouters(
    {
        router,
        companionNodes$,
    }: {
        router: Router<NavLayout, NavHeader>
        companionNodes$: BehaviorSubject<string[]>
    },
    ctx: ContextTrait,
) {
    const isCompanionPath = (path: string) => {
        return (
            companionNodes$.value.find((companionPath) =>
                path.startsWith(companionPath),
            ) !== undefined
        )
    }
    const redirectToCompanion =
        (target: UrlTarget) => async (innerCtx: ContextTrait) => {
            innerCtx.info(
                `Caught companion path, forward navigation to companion router at ${target.path}`,
            )
            await companionRouter.navigateTo(target, innerCtx)
            return Promise.resolve(undefined)
        }
    const redirectToMain =
        (target: UrlTarget) => async (innerCtx: ContextTrait) => {
            innerCtx.info(
                `Caught main app. path, forward navigation to main router at ${target.path}`,
            )
            await router.navigateTo(target, innerCtx)
            return Promise.resolve(undefined)
        }

    const redirectMainToCompanion = async (
        target: UrlTarget,
        ctx: ContextTrait,
    ): Promise<UrlTarget | undefined> => {
        if (isCompanionPath(target.path)) {
            return ctx.executeAsync(
                `RedirectToCompanion(${target.path})`,
                redirectToCompanion(target),
                ['CompanionRouter'],
            )
        }
        return Promise.resolve(target)
    }
    router.redirects.push(redirectMainToCompanion)

    const redirectCompanionToMain = async (
        target: UrlTarget,
        ctx: ContextTrait,
    ) => {
        const prefixes = await firstValueFrom(companionNodes$)
        if (prefixes.length === 0) {
            ctx.info(
                'RedirectToMain: No companion nodes, cancel companion navigation',
            )
            return Promise.resolve(undefined)
        }
        if (!isCompanionPath(target.path)) {
            return ctx.executeAsync(
                `RedirectToMain(${target.path})`,
                redirectToMain(target),
                ['Router'],
            )
        }
        return Promise.resolve(target)
    }
    const companionRouter = new Router(
        {
            navigation: router.navigation,
            browserClient: (p) => new MockBrowser(p),
            redirects: [redirectCompanionToMain],
            userStore: router.userStore,
        },
        ctx,
    )
    return companionRouter
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
