import { AnyVirtualDOM, render } from 'rx-vdom'
import { AnyView } from '../navigation.node'

function isSizeRelativeToParent(
    element: HTMLElement,
    dimension: 'width' | 'height',
) {
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
            if (rule instanceof CSSStyleRule) {
                try {
                    const selectorMatches = element.matches(rule.selectorText)
                    const target = rule.style[dimension]
                    const isRelative = target.includes('%') || target === 'auto'
                    if (selectorMatches && target && isRelative) {
                        return true
                    }
                } catch (error: unknown) {
                    console.error('Failed to process CSSStyleRule', {
                        rule,
                        error,
                    })
                }
            }
        }
    }
    return false
}

/**
 * Popup a modal on screen with a blury background.
 *
 * @param _p
 * @param _p.content The content.
 * @param _p.maxWidth Maximum width of the modal's display area.
 * @param _p.maxHeight Maximum height of the modal's display area.
 */
export function popupModal({
    content,
    maxWidth,
    maxHeight,
}: {
    content: AnyView
    maxWidth?: string
    maxHeight?: string
}) {
    let element: HTMLElement | undefined = undefined
    maxWidth ??= '75%'
    maxHeight ??= '75%'
    const vdom: AnyVirtualDOM = {
        tag: 'div',
        style: {
            position: 'absolute',
            top: '0vh',
            left: '0vw',
            width: '100vw',
            height: '100vh',
            // 0 -> 100 for the page, 100 -> 200 for the side panels, modal above all.
            zIndex: 200,
            backdropFilter: 'blur(3px)',
        },
        class: 'd-flex flex-column justify-content-center',
        children: [
            {
                tag: 'div',
                class: `border rounded mx-auto d-flex flex-column justify-content-center overflow-auto`,
                children: [content],
                style: {
                    maxHeight: maxHeight,
                    maxWidth: maxWidth,
                },
                connectedCallback: (elem: HTMLElement) => {
                    const firstChild = elem.firstChild as HTMLElement
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
            // noinspection ReuseOfLocalVariableJS
            element = elem
        },
        onclick: () => {
            if (element) {
                element.remove()
            }
        },
    }
    document.body.appendChild(render(vdom))
}
