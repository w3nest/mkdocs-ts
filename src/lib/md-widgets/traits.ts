/**
 * Represents a DOM trait where a specific class name must be included within the class attribute.
 *
 * @typeParam T A string type representing the required class name.
 */
export interface DOMTrait<T extends string> {
    class: `${string} ${T} ${string}` | `${T} ${string}` | `${string} ${T}`
}
/**
 * Represents a trait for elements using the 'mkdocs-resize-observer' class.
 * Extends `DOMTrait` to ensure the class name is present and includes a method to refresh the view.
 */
export type ResizeObserverTrait = DOMTrait<'mkdocs-resize-observer'> & {
    refreshView: () => void
}
/**
 * Refreshes all element annotated with {@link ResizeObserverTrait} within a given HTML element.
 *
 * @param elem The parent HTML element to search for resize observers.
 */
export function refreshResizeObservers(elem: HTMLElement) {
    Array.from(elem.querySelectorAll('.mkdocs-resize-observer')).forEach(
        (elem) => {
            const vdom = (elem as unknown as { vDom: ResizeObserverTrait }).vDom
            vdom.refreshView()
        },
    )
}
