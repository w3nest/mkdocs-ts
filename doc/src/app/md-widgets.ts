import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { companionNodes$ } from './on-load'

export class ApiLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly innerText: string
    public readonly href: string

    constructor(elem: HTMLElement) {
        const target = elem.getAttribute('target')!
        const navs = {
            Navigation: '@nav/api/MainModule.Navigation',
            AnyView: '@nav/api/MainModule.AnyView',
            Router: '@nav/api/MainModule.Router',
            'DefaultLayout.Layout': '@nav/api/MainModule/DefaultLayout.Layout',
            'DefaultLayout.Layout.new':
                '@nav/api/MainModule/DefaultLayout.Layout.newLayout',
            fetchMd: '@nav/api/MainModule.fetchMd',
            parseMd: '@nav/api/MainModule.parseMd',
            'DefaultLayout.NavHeader':
                '@nav/api/MainModule/DefaultLayout.NavHeader',
        }

        const classes = {
            Navigation: 'mkapi-role-type-alias',
            AnyView: 'mkapi-role-type-alias',
            Router: 'mkapi-role-class',
            'DefaultLayout.View': 'mkapi-role-class',
            'DefaultLayout.View.new': 'mkapi-role-constructor',
            fetchMd: 'mkapi-role-function',
            parseMd: 'mkapi-role-function',
            'DefaultLayout.NavHeader': 'mkapi-role-interface',
        }
        this.href = navs[target]
        this.children = [
            {
                tag: 'i',
                innerText: target,
                class: `mkapi-semantic-flag ${classes[target]}`,
            },
            {
                tag: 'i',
                class: 'fas fa-code',
                style: { transform: 'scale(0.6)' },
            },
        ]
    }
}

export class ExtLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly innerText: string
    public readonly href: string

    constructor(elem: HTMLElement) {
        const target = elem.getAttribute('target')!
        const navs = {
            'tutorials.basics.md':
                'https://github.com/w3nest/mkdocs-ts/blob/main/doc/assets/tutorials.basics.md?raw=1',
            'tweak-pane': 'https://tweakpane.github.io/docs/',
            'rx-vdom': '/apps/@rx-vdom/doc/latest',
            'virtual-dom': '/apps/@rx-vdom/doc/latest?nav=/api.VirtualDOM',
            webpm: '/apps/@webpm/doc/latest',
        }
        this.href = navs[target]
        this.children = [
            {
                tag: 'i',
                innerText: elem.textContent,
            },
            {
                tag: 'i',
                class: 'fas fa-external-link-alt',
                style: { transform: 'scale(0.6)' },
            },
        ]
    }
}

export class CrossLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly innerText: string
    public readonly href: string

    constructor(elem: HTMLElement) {
        const target = elem.getAttribute('target')!
        const navs = {
            notebook: '@nav/tutorials/notebook',
            'notebook.display': '@nav/tutorials/notebook.output',
        }
        this.href = navs[target]
        this.children = [
            {
                tag: 'i',
                innerText: elem.textContent,
            },
            {
                tag: 'i',
                class: 'fas fa-book-open',
                style: { transform: 'scale(0.6)' },
            },
        ]
    }
}

export class SplitApiButton implements VirtualDOM<'button'> {
    public readonly tag = 'button'
    public readonly class = 'btn btn-sm btn-light fas fa-columns'
    public readonly onclick = () => {
        const path = '/api'
        const selected = companionNodes$.value.find((prefix) => path === prefix)
        if (selected) {
            const newNodes = companionNodes$.value.filter(
                (prefix) => path !== prefix,
            )
            companionNodes$.next(newNodes)
            return
        }
        companionNodes$.next([...companionNodes$.value, path])
    }
}
