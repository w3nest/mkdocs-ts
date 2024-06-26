import { ChildrenLike, VirtualDOM, CSSAttribute } from '@youwol/rx-vdom'
import { parseMd } from '../../markdown'

/**
 * Represents a text view.
 *
 * The text provided is interpreted as markdown, and can include latex equations.
 *
 * <js-cell>
 * display(new Views.Text('**a simple example**'))
 * display(new Views.Text(String.raw`**including latex inlined**: \(ax^2 + bx + c = 0\)`))
 * display(new Views.Text(String.raw`**including latex**: $$x = {-b \pm \sqrt{b^2-4ac} \over 2a}$$`))
 * </js-cell>
 *
 * Fine-tuning of element's class & style is also possible.
 */
export class Text implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     * Can be completed from constructor.
     */
    public readonly class: string = 'mknb-Text'
    public readonly children: ChildrenLike

    /**
     * Style elements.
     * Can be completed from constructor.
     */
    public readonly style = {}

    connectedCallback: (e: HTMLElement) => void

    /**
     *
     * @param text Text to be displayed, can include Latex equation.
     * @param options Style & class attributes to append to the defaults.
     */
    constructor(
        text: string,
        options: {
            style: CSSAttribute
            class: string
        } = { style: {}, class: '' },
    ) {
        this.style = options.style || {}
        this.class = `${this.class} ${options.class || ''}`
        const div = parseMd({
            src: text.replace(/\\[()]/g, (match) => {
                return '\\' + match
            }),
            latex: true,
        })
        this.children = [div]
    }
}
