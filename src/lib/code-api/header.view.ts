import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Semantic } from './models'
import { Dependencies } from './index'

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4'
type Doc = { semantic?: Semantic; path: string; name: string }

export class HeaderView implements VirtualDOM<HeadingLevel> {
    public readonly doc: Doc
    public readonly relativeToPath: string
    public readonly withChildren: AnyVirtualDOM[]
    public readonly withClass: string
    public readonly text: string
    public readonly tag: HeadingLevel
    public readonly id: string
    public readonly class =
        'mkapi-header heading d-flex flex-wrap align-items-center'
    public readonly children: ChildrenLike

    constructor(params: {
        text?: string
        tag: HeadingLevel
        withClass: string
        doc: Doc
        withChildren?: AnyVirtualDOM[]
        relativeToPath: string
    }) {
        Object.assign(this, params)
        const semantic = this.doc.semantic ? this.doc.semantic.role : ''
        this.class += ` mkapi-role-${semantic}`
        this.text = this.text || this.doc.name
        this.withChildren = this.withChildren || []
        const relativePath =
            this.relativeToPath !== '' &&
            this.doc.path.startsWith(this.relativeToPath + '.')
                ? this.doc.path.replace(this.relativeToPath + '.', '')
                : this.doc.path
        this.id = `${Dependencies.headingPrefixId}${relativePath}`
        this.children = [
            {
                tag: 'span',
                style: {
                    fontWeight: 'bolder',
                },
                class: `mkapi-semantic-flag mkapi-role-${semantic} ${this.withClass}`,
                children: [{ tag: 'span', innerText: this.text }],
            },
            ...this.withChildren,
        ]
    }
}
