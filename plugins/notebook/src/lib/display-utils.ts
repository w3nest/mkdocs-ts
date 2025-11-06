import { AnyVirtualDOM, child$, CSSAttribute, RxChild } from 'rx-vdom'
import { ObjectJs } from '@w3nest/ui-tk/Trees'
import { Observable, Subject } from 'rxjs'
import { Output } from './state'
import { displayW3BackendClient } from './views/display-factory/backend'

/**
 * Renders and displays elements using registered view generators.
 *
 * This function is primarily used in {@link JsCellView}. When invoked from a JavaScript cell,
 * the `output$` and `factory` parameters are automatically provided, meaning only `elements`
 * need to be passed explicitly.
 *
 * **Behavior**
 *
 * **If an element is not an Observable**
 *
 *   - Finds the first compatible view generator in `factory` (searching in reverse order).
 *   - Generates the view using the selected generator.
 *   - **The first view generator in `factory` is guaranteed to be compatible** and acts as a fallback,
 *     providing a raw representation of the object if no other generator is found.
 *
 *
 * **If an element is an Observable**:
 *
 *   - Subscribes to it and applies the same view generation logic dynamically.
 *
 *
 * **If multiple elements** are provided, they are displayed in a horizontally flexible layout.
 *
 * Once rendered, the resulting view is emitted via the `output$` stream.
 *
 * See {@link DisplayFactory} for available view generators.
 *
 * @param output$ The Subject that emits the rendered elements.
 * @param factory A collection of view generators used to render elements.
 * @param elements The elements to display.
 */
export function display(
    output$: Subject<Output>,
    factory: DisplayFactory,
    ...elements: unknown[]
) {
    const pickView = (e) => {
        const component = [...factory]
            .reverse()
            .find((component) => component.isCompatible(e)) as DisplayComponent
        return component.view(e)
    }
    const views: AnyVirtualDOM[] = elements.map((element) => {
        if (element instanceof Observable) {
            return {
                tag: 'div' as const,
                children: [
                    child$({
                        source$: element,
                        vdomMap: (value) => pickView(value),
                    }),
                ],
            }
        }
        return pickView(element)
    })
    output$.next(
        views.length === 1
            ? views[0]
            : {
                  tag: 'div',
                  class: 'd-flex align-items-center',
                  children: views,
              },
    )
}

/**
 * Represents the type of component of {@link DisplayFactory}.
 */
export interface DisplayComponent<T = unknown> {
    /**
     * Name of the component.
     */
    name: string
    /**
     * Return `true` if this display component handle the target data `t`.
     */
    isCompatible: (t: T) => boolean

    /**
     * Create the view from the target data `t`, `t` does satisfy the condition of `isCompatible`.
     */
    view: (t: T) => AnyVirtualDOM
}

/**
 * Represents a factory to display elements on the page.
 *
 * It is usually composed by the elements of the {@link defaultDisplayFactory}, and eventually includes custom
 * components provided to the {@link NotebookPage} constructor.
 */
export type DisplayFactory = DisplayComponent[]

/**
 * Fallback renderer referenced in {@link defaultDisplayFactory}.
 *
 * *  For primitive types, an `HTMLElement` is generated with `innerText` property set to the value.
 *
 * *  Otherwise an object explorer is displayed.
 *
 * @param element Displayed element.
 * @returns The resulting `VirtualDOM`.
 */
export function rawView(element: unknown): AnyVirtualDOM {
    type PrimitiveType = 'string' | 'number' | 'boolean'
    if (['string', 'number', 'boolean'].includes(typeof element)) {
        return {
            tag: 'div',
            innerText: element as PrimitiveType,
        }
    }
    const state = new ObjectJs.State({ title: '', data: element })
    return {
        tag: 'div' as const,
        style: {
            fontSize: '0.8rem',
        },
        children: [new ObjectJs.View({ state })],
    }
}

/**
 * Renderer for `HTMLElement | AnyVirtualDOM | RxChild` referenced in {@link defaultDisplayFactory}.
 *
 * @param element Displayed element.
 * @returns The resulting `VirtualDOM`.
 */
export function htmlView(
    element: HTMLElement | AnyVirtualDOM | RxChild,
): AnyVirtualDOM {
    if (element instanceof HTMLElement) {
        return {
            tag: 'div',
            children: [element],
        }
    }
    function isRxChild(e: unknown): e is RxChild {
        if (typeof e !== 'object' || e === null) {
            return false
        }
        return 'source$' in e && 'vdomMap' in e
    }
    if (isRxChild(element)) {
        return { tag: 'div', children: [element] }
    }
    return element
}

/**
 * Defines default factory regarding elements passed to the `display` function.
 *
 * The first item, acting as fallback, is implemented using {@link rawView}.
 *
 * The second item is specific for `VirtualDOM` or `HTMLElement`, see {@link htmlView}.
 *
 * @returns The default factory.
 */
export function defaultDisplayFactory(): DisplayFactory {
    function isVirtualDOM(obj: unknown): obj is AnyVirtualDOM | RxChild {
        if (typeof obj !== 'object' || obj === null) {
            return false
        }
        return 'tag' in obj || ('source$' in obj && 'vdomMap' in obj)
    }
    return [
        {
            name: 'Raw',
            isCompatible: () => true,
            view: rawView,
        },
        {
            name: 'HTML',
            isCompatible: (element: unknown) =>
                element instanceof HTMLElement || isVirtualDOM(element),
            view: htmlView,
        },
        displayW3BackendClient,
    ]
}

/**
 * Convert an inlined style defined in a DOM element, to a CSS dictionary `styleAttribute -> value`.
 *
 * @param styleString The string (e.g. `"width:100%; height:100%"`).
 * @returns The CSS dictionary.
 */
export function parseStyle(styleString: string): CSSAttribute {
    if (!styleString) {
        return {}
    }
    const stylePairs = styleString.split(';')
    const styleObject = {}

    stylePairs.forEach((pair) => {
        const [property, value] = pair.split(':').map((s) => s.trim())
        if (property && value) {
            styleObject[property] = value
        }
    })

    return styleObject
}
