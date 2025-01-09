export interface DOMTrait<T extends string> {
    class: `${string} ${T} ${string}` | `${T} ${string}` | `${string} ${T}`
}
export type ResizeObserverTrait = DOMTrait<'mkdocs-resize-observer'> & {
    refreshView: () => void
}

export function refreshResizeObservers(elem: HTMLElement) {
    Array.from(elem.querySelectorAll('.mkdocs-resize-observer')).forEach(
        (elem) => {
            const vdom = (elem as unknown as { vDom: ResizeObserverTrait }).vDom
            vdom.refreshView()
        },
    )
}
