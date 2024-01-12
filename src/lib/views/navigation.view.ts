import { VirtualDOM } from '@youwol/rx-vdom'
import { Router } from '../router'
import { Node } from '../navigation.node'

export class NavigationHeader implements VirtualDOM<'a'> {
    public readonly node: Node
    public readonly router: Router
    public readonly tag = 'a'
    public readonly innerText: string
    public readonly href: string
    public readonly onclick: (e: MouseEvent) => void
    constructor(params: { node: Node; router: Router }) {
        Object.assign(this, params)
        this.innerText = this.node.name
        this.href = `${this.router.basePath}?nav=` + this.node.href
        this.onclick = (e) => {
            e.preventDefault()
            this.router.navigateTo({ path: this.node.href })
        }
    }
}
