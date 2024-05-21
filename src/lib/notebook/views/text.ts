import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { parseMd } from '../../markdown'

/**
 * Represents a text view.
 *
 * The text provided is interpreted as markdown, and can include latex equations.
 * <js-cell>
 * display(new Views.Text('**a simple example**'))
 * display(new Views.Text(String.raw`**including latex inlined**: \(ax^2 + bx + c = 0\)`))
 * display(new Views.Text(String.raw`**including latex**: $$x = {-b \pm \sqrt{b^2-4ac} \over 2a}$$`))
 * </js-cell>
 *
 */
export class Text implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-Text'
    public readonly children: ChildrenLike

    connectedCallback: (e: HTMLElement) => void
    constructor(text: string) {
        const div = parseMd({
            src: text.replace(/\\[()]/g, (match) => {
                return '\\' + match
            }),
            latex: true,
        })
        this.children = [div]
    }
}
