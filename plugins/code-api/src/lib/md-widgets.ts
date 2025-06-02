import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { faIconTyped } from './fa-icons'

export class MkApiExtLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly innerText: string
    public readonly href: string
    public readonly target = '_blank'

    constructor(elem: HTMLElement) {
        this.href = elem.getAttribute('href') ?? ''
        this.children = [
            {
                tag: 'i',
                innerText: elem.textContent ?? '?',
            },
            faIconTyped('fa-external-link-alt', {
                withClass: 'ps-1',
                withStyle: { fontSize: '0.6rem' },
            }),
        ]
    }
}

export class MkApiApiLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly innerText: string
    public readonly href?: string

    constructor(elem: HTMLElement) {
        this.href = elem.getAttribute('nav') ?? undefined
        const semantic = elem.getAttribute('semantic') ?? ''

        this.children = [
            {
                tag: 'i',
                innerText: elem.textContent ?? '',
                class: `mkapi-semantic-flag mkapi-role-${semantic}`,
            },
            faIconTyped('fa-code', {
                withClass: 'ps-1',
                withStyle: { fontSize: '0.6rem' },
            }),
        ]
    }
}
