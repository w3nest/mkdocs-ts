import { AnyVirtualDOM, ChildrenLike, CSSAttribute, VirtualDOM } from 'rx-vdom'
import { layoutStyleBase } from './common'

/**
 * Type definition for the arguments to create a {@link SuperposedLayout}.
 */
export interface SuperposedArguments {
    /**
     * Main content of the layout.
     */
    content: AnyVirtualDOM
    /**
     * An optional overlay to be displayed in the top-left corner.
     * If `parentStyle` is provided, it is applied to the parent container (with `absolute` positioning).
     */
    topLeft?: AnyVirtualDOM & { parentStyle?: CSSAttribute }
    /**
     * An optional overlay to be displayed in the top-right corner.
     * If `parentStyle` is provided, it is applied to the parent container (with `absolute` positioning).
     */
    topRight?: AnyVirtualDOM & { parentStyle?: CSSAttribute }
    /**
     * An optional overlay to be displayed in the bottom-left corner.
     * If `parentStyle` is provided, it is applied to the parent container (with `absolute` positioning).
     */
    bottomLeft?: AnyVirtualDOM & { parentStyle?: CSSAttribute }
    /**
     * An optional overlay to be displayed in the bottom-right corner.
     * If `parentStyle` is provided, it is applied to the parent container (with `absolute` positioning).
     */
    bottomRight?: AnyVirtualDOM & { parentStyle?: CSSAttribute }
}

/**
 * Function to create a {@link SuperposedLayout}.
 *
 * @param params Arguments
 */
export function superposed(params: SuperposedArguments) {
    return new SuperposedLayout(params)
}

/**
 * A layout component that allows for the positioning of content in a superposed manner, with optional overlays
 * in the four corners.
 *
 * <js-cell>
 * const content = {
 *     tag:'div',
 *     class: 'p-2 w-100 h-100 bg-light border rounded',
 * }
 * const classCorners = 'p-2 w-100 h-100 bg-dark text-light border rounded'
 * const topLeft = {
 *     tag:'div',
 *     class: classCorners,
 *     innerText: 'Top-Left'
 * }
 * const topRight = {
 *     tag:'div',
 *     class: classCorners,
 *     innerText: 'Top-Right'
 * }
 * const bottomLeft = {
 *     tag:'div',
 *     class: classCorners,
 *     innerText: 'Bottom-Left'
 * }
 * const bottomRight = {
 *     tag:'div',
 *     class: classCorners,
 *     innerText: 'Bottom-Right'
 * }
 * display(Views.Layouts.superposed({
 *     content,
 *     topLeft,
 *     topRight,
 *     bottomLeft,
 *     bottomRight
 * }))
 * </js-cell>
 */
export class SuperposedLayout implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly style = {
        position: 'relative' as const,
        ...layoutStyleBase,
    }
    public readonly children: ChildrenLike
    public readonly content: AnyVirtualDOM
    public readonly topLeft?: AnyVirtualDOM
    public readonly topRight?: AnyVirtualDOM
    public readonly bottomLeft?: AnyVirtualDOM
    public readonly bottomRight?: AnyVirtualDOM

    /**
     * Creates an instance of SuperposedLayout.
     *
     * @param params Arguments
     */
    constructor(params: SuperposedArguments) {
        Object.assign(this, params)
        this.children = [
            this.content,
            this.topLeft && this.createOverlay(this.topLeft, 'top-left'),
            this.topRight && this.createOverlay(this.topRight, 'top-right'),
            this.bottomRight &&
                this.createOverlay(this.bottomRight, 'bottom-right'),
            this.bottomLeft &&
                this.createOverlay(this.bottomLeft, 'bottom-left'),
        ]
    }

    private createOverlay(
        cornerView: AnyVirtualDOM & { parentStyle?: CSSAttribute },
        position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
    ) {
        const style = {
            position: 'absolute' as const,
            [position.includes('top') ? 'top' : 'bottom']: '10px',
            [position.includes('left') ? 'left' : 'right']: '10px',
            ...(cornerView.parentStyle ?? {}),
        }
        return {
            tag: 'div' as const,
            style,
            children: [cornerView],
        }
    }
}
