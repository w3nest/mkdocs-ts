import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { isResolvedTarget, Router } from './router'
import { distinctUntilChanged, map } from 'rxjs'
import { parseMd } from './markdown'
import {
    AnyView,
    // noinspection ES6UnusedImports Include for documentation
    NavNodeData, // eslint-disable-line  @typescript-eslint/no-unused-vars
    // noinspection ES6UnusedImports Include for documentation
    DefaultLayout, // eslint-disable-line  @typescript-eslint/no-unused-vars
} from './index'

/**
 * Defines a trait for a layout generator function that can be registered in {@link CompositeLayout.layoutsFactory}.
 *
 * @param router The application's router instance.
 * @returns The layout view.
 */
export type LayoutGeneratorTrait<TLayout, THeader> = ({
    router,
}: {
    router: Router<TLayout, THeader>
}) => AnyView

/**
 * Type helper used by {@link LayoutUnion}.
 *
 * @typeParam LayoutOptionsMap - A mapping of layout kinds to their respective layout structures.
 */
export type LayoutMap<LayoutOptionsMap> = {
    [Property in keyof LayoutOptionsMap]: LayoutOptionsMap[Property] & {
        kind: Property
    }
}

/**
 * A factory mapping layout `kind` values to their corresponding layout generator functions.
 *
 * This allows dynamic selection and instantiation of layouts based on navigation data.
 *
 * - Each key represents a valid `kind` value from the {@link Navigation} node's layout definition.
 * - The associated value is a layout generator function conforming to {@link LayoutGeneratorTrait}.
 *
 * @typeParam LayoutOptionsMap A mapping of layout `kind` values to their respective layout types.
 * @typeParam THeader The shared header type across all layouts.
 */
export type LayoutFactory<LayoutOptionsMap, THeader> = {
    [Property in keyof LayoutOptionsMap]: LayoutGeneratorTrait<
        LayoutOptionsMap[Property],
        THeader
    >
}

/**
 * Resolves a **union type** of all possible layouts from a given `LayoutOptionsMap`.
 * It is a type helper often used to specify `LayoutOptionsMap` of {@link CompositeLayout}.
 *
 * Given a `LayoutOptionsMap`, which defines different layout configurations keyed by their kind,
 * `LayoutUnion<LayoutOptionsMap>` extracts and unifies all layout types into a single **union type**.
 *
 * **Example**
 *
 *
 * This is useful for:
 * - Ensuring type safety when handling layouts dynamically.
 * - Allowing TypeScript to infer the correct layout type based on navigation data.
 * - Supporting multiple layout kinds while maintaining flexibility.
 *
 * ---
 *
 * Assume we define multiple layout types in `LayoutOptionsMap`:
 *
 * <code-snippet language='javascript'>
 * type LayoutOptionsMap = {
 *     default: DefaultLayout.NavLayout
 *     presentation: Slide
 * }
 * </code-snippet>
 *
 * Then
 *
 * <code-snippet language='javascript'>
 * type AvailableLayouts = LayoutUnion<LayoutOptionsMap>
 * </code-snippet>
 *
 * Results in:
 *
 * <code-snippet language='javascript'>
 * type AvailableLayouts =
 *   | ({ layoutType: 'default' } & DefaultLayout.NavLayout)
 *   | ({ layoutType: 'presentation'} & Slide )
 * </code-snippet>
 *
 * ---
 *
 * @typeParam LayoutOptionsMap - A mapping of layout kinds to their respective layout structures.
 */
export type LayoutUnion<LayoutOptionsMap> =
    LayoutMap<LayoutOptionsMap>[keyof LayoutMap<LayoutOptionsMap>]

export type LayoutKindUnion<LayoutOptionsMap> =
    LayoutMap<LayoutOptionsMap>[keyof LayoutMap<LayoutOptionsMap>]['kind']

/**
 * This component dynamically selects and renders layouts based on navigation data.
 *
 * -  Each {@link Navigation} node specifies a `kind` attribute within its layout definition
 *    ({@link NavNodeData.layout}).
 *
 * -  The constructor expects a layout factory, mapping `kind` values to their respective layout implementations
 *    (which follow {@link LayoutGeneratorTrait}).
 *
 * -  If no matching layout kind exists for a navigation node at runtime, the {@link LayoutKindNotFoundView} is
 *    displayed. In TypeScript, such a mismatch results in a compilation error, ensuring correctness at build time.
 *
 * <note level="hint">
 * The **layout factory is only invoked when switching layout kinds**, minimizing unnecessary re-renders.
 * For state persistence across layouts, maintain state outside the layout view.
 * </note>
 *
 * ---
 *
 * **Type System & Static Safety**
 *
 * This class is designed to maximize TypeScript type safety across {@link Navigation}, {@link Router}, and
 * {@link CompositeLayout} structures.
 *
 * Type definitions rely on combining individual layout (`TLayout`) and header (`THeader`) types
 * (involved in {@link Navigation})  to define the global ones:
 * -  The global `TLayout` type is a **union** of all possible layout types. Since each layout has a `kind` type
 *    literal attribute, TypeScript correctly infers the specific layout type for each node.
 * -  The global `THeader`type is an **intersection** of all possible header type, ensuring every layout can render
 *    headers for any navigation node. In practice, a single shared header type simplifies implementation.
 *
 * The following steps assume all layouts use the default {@link DefaultLayout.NavHeader} specification for headers.
 *
 * **1 - Define a `LayoutOptionsMap` type**
 *
 * Explicitly map individual layout kinds to their corresponding types:
 *
 * <code-snippet language='javascript'>
 * import { DefaultLayout } from 'mkdocs-ts'
 *
 * type Slide = { ... }
 *
 * type LayoutOptionsMap = {
 *     default: DefaultLayout.NavLayout
 *     presentation: Slide
 * }
 * </code-snippet>
 *
 * **2 - Define the Navigation Structure**
 *
 * Use {@link LayoutUnion} to create a strongly-typed {@link Navigation} definition:
 *
 * <code-snippet language='javascript'>
 * import { LayoutUnion } from 'mkdocs-ts'
 *
 * export const navigation: Navigation<
 *     LayoutUnion<LayoutOptionsMap>,
 *     DefaultLayout.NavHeader
 * > = { ... }
 * </code-snippet>
 *
 * This ensures node's layout being either `{kind: 'default'} & DefaultLayout.NavLayout` or
 * `{kind: 'presentation'} & Slide`, enabling automatic type discrimination from typescript based on the `kind` value.
 *
 * **3 - Configure Router & CompositeLayout**
 *
 * From there, automatic type inference within {@link Router} and {@link CompositeLayout} will play nicely:
 *
 * <code-snippet language='javascript'>
 * import { MultiLayouts, Router } from 'mkdocs-ts'
 *
 * const router = new Router({ navigation })
 *
 * const routerView = new CompositeLayout({
 *     router,
 *     layoutsFactory: {
 *         default: ({ router }) => new DefaultLayout.Layout({ router }),
 *         presentation: ({ router }) => new PresentationLayout({ router })
 *     },
 *     onPending: defaultLayoutKind,
 *     onNotFound: defaultLayoutKind,
 * })
 * </code-snippet>
 *
 * While the global `router` is inferred using the combined type for `TLayout` and `THeader` given `navigation`,
 * those involved as argument in the `layoutsFactory` are more specific:
 * -  The `default` entry gets `Router<DefaultLayout.NavLayout, DefaultLayout.NavHeader>`.
 * -  The `presentation` entry gets `Router<Slide, DefaultLayout.NavHeader>`.
 *
 *
 * ---
 *
 * @typeParam LayoutOptionsMap Maps layout kind literals to their corresponding layout types.
 * @typeParam THeader The intersection of all possible header types.
 */
export class CompositeLayout<LayoutOptionsMap, THeader>
    implements VirtualDOM<'div'>
{
    public readonly tag = 'div'
    public readonly class = 'w-100 h-100'
    public readonly children: ChildrenLike

    public readonly router: Router<LayoutUnion<LayoutOptionsMap>, THeader>
    public readonly layoutsFactory: LayoutFactory<LayoutOptionsMap, THeader>
    public readonly onNotFound: LayoutKindUnion<LayoutOptionsMap>
    public readonly onPending: LayoutKindUnion<LayoutOptionsMap>

    /**
     * Creates a new instance.
     *
     * @param params The parameters.
     * @param params.router The application's router instance.
     * @param params.layoutsFactory The layout factory. Keys correspond to `kind` attribute of the layouts.
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
                        const view = this.layoutsFactory[
                            layoutKind as LayoutKindUnion<LayoutOptionsMap>
                        ]({
                            router: this.router as unknown as Router<
                                TLayoutOptions,
                                THeader
                            >,
                        })
                        return view instanceof HTMLElement
                            ? { tag: 'div', children: [view] }
                            : view
                    }
                    return new LayoutKindNotFoundView({
                        unknownKey: layoutKind as string,
                        availableKeys: Object.keys(this.layoutsFactory),
                        path: this.router.parseUrl().path,
                    })
                },
            }),
        ]
    }
}

/**
 * The view displayed when a layout's kind referenced in the {@link Navigation} is not found within
 * {@link CompositeLayout}'s factory.
 */
export class LayoutKindNotFoundView implements VirtualDOM<'div'> {
    static readonly CssSelector = 'mkdocs-LayoutNotFoundView'
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = LayoutKindNotFoundView.CssSelector

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
