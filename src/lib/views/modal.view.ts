import { AnyVirtualDOM, render } from 'rx-vdom'

function isSizeRelativeToParent(element, dimension: 'width' | 'height') {
    const style = element.style

    // Check if width or height is set to percentage or is auto in inline styles
    if (style[dimension].includes('%') || style[dimension] === 'auto') {
        return true
    }

    // Check stylesheets for percentage or auto values
    const stylesheets = document.styleSheets
    for (const stylesheet of stylesheets) {
        const rules = stylesheet.cssRules
        for (const rule of rules) {
            if (rule['style']) {
                try {
                    const selectorMatches = element.matches(
                        rule['selectorText'],
                    )
                    const target = rule['style'][dimension]

                    if (
                        selectorMatches &&
                        target &&
                        (target.includes('%') || target === 'auto')
                    ) {
                        return true
                    }
                } catch (error) {
                    // Skip any invalid CSS rules
                }
            }
        }
    }
    return false
}

/**
 * Popup a modal on screen with a blury background.
 *
 * @param content The content.
 * @param maxWidth Maximum width of the modal's display area.
 * @param maxHeight Maximum height of the modal's display area.
 */
export function popupModal({
    content,
    maxWidth,
    maxHeight,
}: {
    content: AnyVirtualDOM
    maxWidth?: string
    maxHeight?: string
}) {
    let element: HTMLElement
    maxWidth = maxWidth || '75%'
    maxHeight = maxHeight || '75%'
    const vdom: AnyVirtualDOM = {
        tag: 'div',
        style: {
            position: 'absolute',
            top: '0vh',
            left: '0vw',
            width: '100vw',
            height: '100vh',
            zIndex: 10,
            backdropFilter: 'blur(2px)',
        },
        class: 'd-flex flex-column justify-content-center',
        children: [
            {
                tag: 'div',
                class: `p-2 border rounded mx-auto d-flex flex-column justify-content-center mkdocs-bg-0 overflow-auto`,
                children: [content],
                style: {
                    maxHeight: maxHeight,
                    maxWidth: maxWidth,
                },
                connectedCallback: (elem: HTMLElement) => {
                    const firstChild = elem.firstChild
                    if (isSizeRelativeToParent(firstChild, 'width')) {
                        elem.style.width = maxWidth
                    }
                    if (isSizeRelativeToParent(firstChild, 'height')) {
                        elem.style.height = maxHeight
                    }
                },
                onclick: (ev) => {
                    ev.stopPropagation()
                },
            },
        ],
        connectedCallback: (elem: HTMLElement) => {
            element = elem
        },
        onclick: () => {
            element && element.remove()
        },
    }
    document.body.appendChild(render(vdom))
}
