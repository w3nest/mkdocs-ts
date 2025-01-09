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
            Router: '@nav/api/MainModule.Router',
            'DefaultLayout.View': '@nav/api/MainModule/DefaultLayout.View',
            'DefaultLayout.View.new':
                '@nav/api/MainModule/DefaultLayout.View.newView',
            fetchMd: '@nav/api/MainModule.fetchMd',
            'DefaultLayout.NavHeader':
                '@nav/api/MainModule/DefaultLayout.NavHeader',
        }

        const classes = {
            Navigation: 'mkapi-role-type-alias',
            Router: 'mkapi-role-class',
            'DefaultLayout.View': 'mkapi-role-class',
            'DefaultLayout.View.new': 'mkapi-role-constructor',
            fetchMd: 'mkapi-role-function',
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
