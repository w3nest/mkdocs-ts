import { AnyVirtualDOM } from '@youwol/rx-vdom'
import { ObjectJs } from '@youwol/rx-tree-views'
import { Observable, Subject } from 'rxjs'

/**
 * Factory of element type passed to the `display` function, create the associated virtual DOM:
 * *  For `string`, `number` of `boolean` : returns a `div` element with `innerText` set as the value.
 * *  For virtual DOM : returns it.
 * *  For HTMLElement: returns a `div` element with the value a single child.
 * *  Otherwise (for `unknown`): returns an object explorer.
 *
 * @param element The element to display
 * @returns corresponding virtual DOM.
 */
export function displayViewFactory(
    element: HTMLElement | AnyVirtualDOM | unknown,
): AnyVirtualDOM {
    if (['string', 'number', 'boolean'].includes(typeof element)) {
        return {
            tag: 'div',
            innerText: `${element}`,
        }
    }
    function isVirtualDOM(obj: unknown): obj is AnyVirtualDOM {
        return obj?.['tag']
    }
    if (element instanceof HTMLElement) {
        return {
            tag: 'div',
            children: [element],
        }
    }
    if (isVirtualDOM(element)) {
        return element
    }
    const state = new ObjectJs.State({ title: '', data: element })
    const view = {
        tag: 'div' as const,
        class: 'cm-s-default',
        children: [new ObjectJs.View({ state })],
    }
    return view
}

/**
 * Implementation of the `display` function used in {@link JsCellView}.
 *
 * @param element The element to display.
 * @param output$ The Subject in which the associated rendered element is emitted.
 */
export function display(
    element: Observable<unknown> | unknown,
    output$: Subject<AnyVirtualDOM>,
) {
    if (element instanceof Observable) {
        const vdom: AnyVirtualDOM = {
            tag: 'div' as const,
            children: [
                {
                    source$: element,
                    vdomMap: (value) => displayViewFactory(value),
                },
            ],
        }
        output$.next(vdom)
        return
    }
    const vdom = displayViewFactory(element)
    output$.next(vdom)
}
