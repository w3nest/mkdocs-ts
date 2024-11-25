import { AnyVirtualDOM, child$, CSSAttribute } from 'rx-vdom'
import { ObjectJs } from '@w3nest/rx-tree-views'
import { Observable, Subject } from 'rxjs'

/**
 * Implementation of the `display` function used in {@link JsCellView}.
 *
 * @param output$ The Subject in which the associated rendered element is emitted.
 * @param elements The element to display.
 * @param factory Display factory.
 */
export function display(
    output$: Subject<AnyVirtualDOM>,
    factory: DisplayFactory,
    ...elements: (unknown | Observable<unknown>)[]
) {
    const pickView = (e) => {
        const component = [...factory]
            .reverse()
            .find((component) => component.isCompatible(e))
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
    if (views.length == 1) {
        output$.next(views[0])
        return
    }
    output$.next({
        tag: 'div',
        class: 'd-flex align-items-center',
        children: views,
    })
}

/**
 * Represents the type of component of {@link DisplayFactory}.
 */
export type DisplayComponent<T = unknown> = {
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

function rawView(element: unknown): AnyVirtualDOM {
    if (['string', 'number', 'boolean'].includes(typeof element)) {
        return {
            tag: 'div',
            innerText: `${element}`,
        }
    }
    const state = new ObjectJs.State({ title: '', data: element })
    return {
        tag: 'div' as const,
        class: 'cm-s-default',
        children: [new ObjectJs.View({ state })],
    }
}

function htmlView(element: HTMLElement | AnyVirtualDOM): AnyVirtualDOM {
    if (element instanceof HTMLElement) {
        return {
            tag: 'div',
            children: [element],
        }
    }
    if (element['source$']) {
        return { tag: 'div', children: [element] }
    }
    return element
}

/**
 * Defines default factory regarding elements passed to the `display` function.
 *
 * It creates the associated virtual DOM:
 * *  For `string`, `number` of `boolean` : returns a `div` element with `innerText` set as the value.
 * *  For virtual DOM : returns it.
 * *  For HTMLElement: returns a `div` element with the value a single child.
 * *  Otherwise (for `unknown`): returns an object explorer.
 *
 * @returns The default factory.
 */
export function defaultDisplayFactory(): DisplayFactory {
    function isVirtualDOM(obj: unknown): obj is AnyVirtualDOM {
        return obj?.['tag'] || (obj?.['source$'] && obj?.['vdomMap'])
    }
    return [
        {
            name: 'Raw',
            isCompatible: (_: unknown) => true,
            view: rawView,
        },
        {
            name: 'HTML',
            isCompatible: (element: unknown) =>
                element instanceof HTMLElement || isVirtualDOM(element),
            view: htmlView,
        },
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
