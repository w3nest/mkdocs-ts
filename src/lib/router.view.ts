import { AnyVirtualDOM, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { isResolvedTarget, Router } from './router'
import { distinctUntilChanged, map } from 'rxjs'
import { parseMd } from './markdown'

/**
 * Defines a trait for a layout generator function that can be registered in {@link RouterView.layoutsFactory}.
 *
 * @param router The application's router instance.
 * @returns A virtual DOM structure representing the layout.
 */
export type LayoutGeneratorTrait = ({
    router,
}: {
    router: Router
}) => AnyVirtualDOM

/**
 * Represents a factory for creating layouts.
 *
 * The factory is a mapping of layout kind identifiers to corresponding layout generator functions.
 * These identifiers are referenced in {@link NavigationCommon.layout.kind}.
 */
export type LayoutFactory = Record<string, LayoutGeneratorTrait>

/**
 * Represents the output view of a router.
 *
 * This view leverages a provided layout factory to map the {@link NavigationCommon.layout.kind}
 * specified in {@link Navigation} to the appropriate layout.
 *
 * If a layout kind is not found, the {@link LayoutNotFoundView} is displayed.
 *
 * <note level="hint">
 * The layout factory is invoked only when there is a change in the layout kind during navigation.
 * This optimization prevents unnecessary redrawing of the entire view if the layout kind remains unchanged.
 * The layouts themselves should dynamically reflect the state of the {@link Router.target$} observable.
 * </note>
 */
export class RouterView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 h-100'
    public readonly children: ChildrenLike

    public readonly router: Router
    public readonly layoutsFactory: LayoutFactory
    public readonly onNotFound: string
    public readonly onPending: string

    /**
     * Creates a new instance.
     *
     * @param params The parameters.
     * @param params.router The application's router instance.
     * @param params.layoutsFactory The layout factory. Keys correspond to {@link NavigationCommon.layout.kind}
     * values, binding navigation nodes to their layouts.
     * @param params.onNotFound The ID of the layout to use when {@link Router.target$} cannot resolve the
     * navigation path because it does not exist.
     * @param params.onPending The ID of the layout to use when {@link Router.target$} cannot resolve the
     * navigation path because navigation is currently resolving.
     */
    constructor(params: {
        router: Router
        layoutsFactory: LayoutFactory
        onNotFound: string
        onPending: string
    }) {
        Object.assign(this, params)
        const layout$ = this.router.target$.pipe(
            map((target) => {
                if (isResolvedTarget(target)) {
                    return target.node.layout.kind
                }
                if (target.reason === 'Pending') {
                    return this.onPending
                }
                return this.onNotFound
            }),
            distinctUntilChanged(),
        )
        this.children = [
            child$({
                source$: layout$,
                vdomMap: (layoutKind) => {
                    if (layoutKind in this.layoutsFactory) {
                        return this.layoutsFactory[layoutKind]({
                            router: this.router,
                        })
                    }
                    return new UnknownLayoutView({
                        unknownKey: layoutKind,
                        availableKeys: Object.keys(this.layoutsFactory),
                        path: this.router.getCurrentPath(),
                    })
                },
            }),
        ]
    }
}

/**
 * The view displayed when a layout referenced in {@link Navigation} is not found.
 */
export class LayoutNotFoundView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({
        unknownKey,
        availableKeys,
        path,
    }: {
        unknownKey: string
        availableKeys: string[]
        path: string
    }) {
        const availableKeysStr = availableKeys.reduce(
            (acc, key) => `${acc}\n*  **${key}**`,
            '',
        )
        this.children = [
            parseMd({
                src: `
<note level="warning" title="Unknown Layout">
The provided layout key - **${unknownKey}** - for node \`${path}\` is not part of the registered ones:
${availableKeysStr}
</note>                
                `,
            }),
        ]
    }
}
