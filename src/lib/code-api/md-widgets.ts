import { ChildrenLike, VirtualDOM } from 'rx-vdom'

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
            {
                tag: 'i',
                class: 'fas fa-external-link-alt ps-1',
                style: { fontSize: '0.6rem' },
            },
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
            {
                tag: 'i',
                class: 'fas fa-code ps-1',
                style: { fontSize: '0.6rem' },
            },
        ]
    }
}
