import { AnyVirtualDOM, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { isResolvedTarget, Router } from './router'
import { distinctUntilChanged, map } from 'rxjs'
import { parseMd } from './markdown'

/**
 * Defines a trait for a layout generator function that can be registered in {@link GenericView.layoutsFactory}.
 *
 * @param router The application's router instance.
 * @returns A virtual DOM structure representing the layout.
 */
export type LayoutGeneratorTrait<TLayout, THeader> = ({
    router,
}: {
    router: Router<TLayout, THeader>
}) => AnyVirtualDOM

export type LayoutMap<LayoutOptionsMap> = {
    [Property in keyof LayoutOptionsMap]: LayoutOptionsMap[Property] & {
        kind: Property
    }
}

/**
 * Represents a factory for creating layouts.
 *
 * The factory is a mapping of layout kind identifiers to corresponding layout generator functions.
 * These identifiers are referenced in {@link NavigationCommon.layout.kind}.
 */
// export type LayoutFactory<LayoutOptionsMap, THeader> = Record<
//     keyof LayoutMap<LayoutOptionsMap>,
//     LayoutGeneratorTrait<LayoutUnion<LayoutOptionsMap>, THeader>
// >
export type LayoutFactory<LayoutOptionsMap, THeader> = {
    [Property in keyof LayoutOptionsMap]: LayoutGeneratorTrait<
        LayoutOptionsMap[Property],
        THeader
    >
}

export type LayoutUnion<LayoutOptionsMap> =
    LayoutMap<LayoutOptionsMap>[keyof LayoutMap<LayoutOptionsMap>]

export type LayoutKindUnion<LayoutOptionsMap> =
    LayoutMap<LayoutOptionsMap>[keyof LayoutMap<LayoutOptionsMap>]['kind']

/**
 * Represents a generic view of a router that can manages multiple layouts.
 *
 * This view leverages a provided layout factory to map the {@link NavNodeData.layout}
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
export class GenericView<LayoutOptionsMap, THeader>
    implements VirtualDOM<'div'>
{
    public readonly tag = 'div'
    public readonly class = 'w-100 h-100'
    public readonly children: ChildrenLike

    public readonly router: Router<LayoutUnion<LayoutOptionsMap>, THeader>
    public readonly layoutsFactory: LayoutFactory<LayoutOptionsMap, THeader>
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
        router: Router<LayoutUnion<LayoutOptionsMap>, THeader>
        layoutsFactory: LayoutFactory<LayoutOptionsMap, THeader>
        onNotFound: LayoutKindUnion<LayoutOptionsMap>
        onPending: LayoutKindUnion<LayoutOptionsMap>
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
                        type TLayoutOptions =
                            LayoutOptionsMap[LayoutKindUnion<LayoutOptionsMap>]
                        return this.layoutsFactory[
                            layoutKind as LayoutKindUnion<LayoutOptionsMap>
                        ]({
                            router: this.router as unknown as Router<
                                TLayoutOptions,
                                THeader
                            >,
                        })
                    }
                    return new LayoutNotFoundView({
                        unknownKey: layoutKind as string,
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
    public readonly class = 'mkdocs-LayoutNotFoundView'

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
