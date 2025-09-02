import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { faIconTyped } from './fa-icons'
import { Project } from './models'

export class MkApiExtLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly innerText: string
    public readonly href: string
    public readonly target: string

    constructor(elem: HTMLElement, project: Project) {
        let href = elem.getAttribute('href') ?? ''
        if (href !== '') {
            Object.entries(project.rootModulesNav).forEach(([k, v]) => {
                href = href.replace(`@nav[${k}]`, v)
            })
            this.href = href
        }
        const isExternal = href.startsWith('http')
        if (isExternal) {
            this.target = '_blank'
        }
        this.children = [
            {
                tag: 'i',
                innerText: elem.textContent,
            },
            isExternal
                ? faIconTyped('fa-external-link-alt', {
                      withClass: 'ps-1',
                      withStyle: { fontSize: '0.6rem' },
                  })
                : undefined,
        ]
    }
}

export class MkApiApiLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly innerText: string
    public readonly href: string

    constructor(elem: HTMLElement, project: Project) {
        let href = elem.getAttribute('nav') ?? ''
        const semantic = elem.getAttribute('semantic') ?? ''
        if (href !== '') {
            Object.entries(project.rootModulesNav).forEach(([k, v]) => {
                href = href.replace(`@nav[${k}]`, v)
            })
            this.href = href
        }
        this.children = [
            {
                tag: 'i',
                innerText: elem.textContent,
                class: `mkapi-semantic-flag mkapi-role-${semantic}`,
            },
            faIconTyped('fa-code', {
                withClass: 'ps-1',
                withStyle: { fontSize: '0.6rem' },
            }),
        ]
    }
}
