import { ChildrenLike, RxHTMLElement, VirtualDOM } from 'rx-vdom'
import { ReplaySubject } from 'rxjs'
import { AnyView } from '../navigation.node'

export class FooterWrapper implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly boundingBox$ = new ReplaySubject<DOMRect>(1)
    public readonly connectedCallback: (element: RxHTMLElement<'div'>) => void
    constructor(footer?: AnyView) {
        this.children = [footer]
        this.connectedCallback = (elem) => {
            const resizeObserver = new ResizeObserver(() => {
                this.boundingBox$.next(elem.getBoundingClientRect())
            })
            resizeObserver.observe(elem)
        }
    }
}
