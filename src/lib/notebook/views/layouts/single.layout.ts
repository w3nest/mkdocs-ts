import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { layoutStyleBase } from './common'
/**
 * Type definition for the arguments to create a {@link SingleLayout}.
 */
export type SingleArguments = {
    /**
     * Content of the layout.
     */
    content: AnyVirtualDOM
}

/**
 * Function to create a {@link SingleLayout}.
 *
 * @param params Arguments
 */
export function single(params: SingleArguments) {
    return new SingleLayout(params)
}

/**
 * Class representing a layout featuring a single content.
 *
 * <js-cell>
 * const content = {
 *     tag:'div',
 *     class: 'p-2 w-100 h-100 bg-light border rounded',
 *     innerText: 'Main Content'
 * }
 * display(Views.Layouts.single({content}))
 * </js-cell>
 */
export class SingleLayout implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly style = layoutStyleBase
    public readonly children: ChildrenLike
    public readonly content: AnyVirtualDOM

    /**
     * Creates an instance of SingleLayout.
     *
     * @param params Arguments
     */
    constructor(params: SingleArguments) {
        Object.assign(this, params)

        this.children = [this.content]
    }
}
