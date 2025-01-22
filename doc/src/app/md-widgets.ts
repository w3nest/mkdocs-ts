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
            DynamicRoutes: '@nav/api/MainModule.DynamicRoutes',
            LazyRoutes: '@nav/api/MainModule.LazyRoutes',
            LazyRoutesCb: '@nav/api/MainModule.LazyRoutesCb',
            LazyRoutesCb$: '@nav/api/MainModule.LazyRoutesCb$',
            NavNodeData: '@nav/api/MainModule.NavNodeData',
            Resolvable: '@nav/api/MainModule.Resolvable',
            UnresolvedTarget: '@nav/api/MainModule.UnresolvedTarget',
            AnyView: '@nav/api/MainModule.AnyView',
            CompositeLayout: '@nav/api/MainModule.CompositeLayout',
            Router: '@nav/api/MainModule.Router',
            'Router.target$': '@nav/api/MainModule.Router.target$',
            'Router.explorerState': '@nav/api/MainModule.Router.explorerState',
            'Router.getNav': '@nav/api/MainModule.Router.getNav',
            Target: '@nav/api/MainModule.Target',
            StaticRoutes: '@nav/api/MainModule.StaticRoutes',
            MockBrowser: '@nav/api/MainModule.MockBrowser',
            'DefaultLayout.Layout': '@nav/api/MainModule/DefaultLayout.Layout',
            'DefaultLayout.Layout.new':
                '@nav/api/MainModule/DefaultLayout.Layout.newLayout',
            fetchMd: '@nav/api/MainModule.fetchMd',
            parseMd: '@nav/api/MainModule.parseMd',
            replaceLinks: '@nav/api/MainModule.replaceLinks',
            MdWidgets: '@nav/api/MainModule/MdWidgets.fake',
            CodeSnippetView: '@nav/api/MainModule/MdWidgets.CodeSnippetView',
            'DefaultLayout.PageView':
                '@nav/api/MainModule/DefaultLayout.PageView',
            'DefaultLayout.NavHeader':
                '@nav/api/MainModule/DefaultLayout.NavHeader',
            'DefaultLayout.NavLayout':
                '@nav/api/MainModule/DefaultLayout.NavLayout',
            'DefaultLayoutParams.sideNavHeader':
                '@nav/api/MainModule/DefaultLayout.DefaultLayoutParams.sideNavHeader',
            'DefaultLayoutParams.sideNavFooter':
                '@nav/api/MainModule/DefaultLayout.DefaultLayoutParams.sideNavFooter',
            'DefaultLayoutParams.bookmarks$':
                '@nav/api/MainModule/DefaultLayout.DefaultLayoutParams.bookmarks',
            'DefaultLayoutParams.displayOptions':
                '@nav/api/MainModule/DefaultLayout.DefaultLayoutParams.displayOptions',
            'DefaultLayout.Layout.CssSelector':
                '@nav/api/MainModule/DefaultLayout.Layout.CssSelector',
            'DefaultLayout.NavHeaderView.CssSelector':
                '@nav/api/MainModule/DefaultLayout.NavHeaderView.CssSelector',
            'DefaultLayout.NavigationView.CssSelector':
                '@nav/api/MainModule/DefaultLayout.NavigationView.CssSelector',
            'DefaultLayout.FavoritesView.CssSelector':
                '@nav/api/MainModule/DefaultLayout.FavoritesView.CssSelector',
        }

        const classes = {
            Navigation: 'mkapi-role-type-alias',
            DynamicRoutes: 'mkapi-role-type-alias',
            LazyRoutes: 'mkapi-role-type-alias',
            LazyRoutesCb: 'mkapi-role-type-alias',
            LazyRoutesCb$: 'mkapi-role-type-alias',
            NavNodeData: 'mkapi-role-type-alias',
            Resolvable: 'mkapi-role-type-alias',
            UnresolvedTarget: 'mkapi-role-interface',
            AnyView: 'mkapi-role-type-alias',
            CompositeLayout: 'mkapi-role-class',
            StaticRoutes: 'mkapi-role-type-alias',
            Router: 'mkapi-role-class',
            'Router.target$': 'mkapi-role-attribute',
            'Router.explorerState': 'mkapi-role-attribute',
            'Router.getNav': 'mkapi-role-method',
            Target: 'mkapi-role-alias',
            'DefaultLayout.View': 'mkapi-role-class',
            'DefaultLayout.Layout.new': 'mkapi-role-constructor',
            fetchMd: 'mkapi-role-function',
            parseMd: 'mkapi-role-function',
            replaceLinks: 'mkapi-role-function',
            MdWidgets: 'mkapi-role-module',
            CodeSnippetView: 'mkapi-role-class',
            'DefaultLayout.PageView': 'mkapi-role-class',
            'DefaultLayout.NavHeader': 'mkapi-role-interface',
            'DefaultLayout.NavLayout': 'mkapi-role-type-alias',
            'DefaultLayoutParams.sideNavHeader': 'mkapi-role-attribute',
            'DefaultLayoutParams.sideNavFooter': 'mkapi-role-attribute',
            'DefaultLayoutParams.bookmarks$': 'mkapi-role-attribute',
            'DefaultLayoutParams.displayOptions': 'mkapi-role-attribute',
            'DefaultLayout.Layout.CssSelector': 'mkapi-role-attribute',
            'DefaultLayout.NavHeaderView.CssSelector': 'mkapi-role-attribute',
            'DefaultLayout.NavigationView.CssSelector': 'mkapi-role-attribute',
            'DefaultLayout.FavoritesView.CssSelector': 'mkapi-role-attribute',
        }
        this.href = navs[target]
        this.children = [
            {
                tag: 'i',
                innerText: elem.textContent === '' ? target : elem.textContent,
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
    public readonly target = '_blank'

    constructor(elem: HTMLElement) {
        const target = elem.getAttribute('target')!
        const navs = {
            'tutorials.basics.md':
                'https://github.com/w3nest/mkdocs-ts/blob/main/doc/assets/tutorials.basics.md?raw=1',
            tweakpane: 'https://tweakpane.github.io/docs/',
            fontawesome: 'https://fontawesome.com/v5/search',
            three: 'https://threejs.org/',
            'rx-vdom': '/apps/@rx-vdom/doc/latest',
            'virtual-dom': '/apps/@rx-vdom/doc/latest?nav=/api.VirtualDOM',
            RxChild: '/apps/@rx-vdom/doc/latest?nav=/api.RxChild',
            webpm: '/apps/@webpm/doc/latest',
            'floating-ui': 'https://floating-ui.com/',
            BehaviorSubject:
                'https://www.learnrxjs.io/learn-rxjs/subjects/behaviorsubject',
            Observable: 'https://rxjs.dev/guide/observable',
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
            markdown: '@nav/tutorials/markdown',
            basics: '@nav/tutorials/basics',
            'dynamic-nav': '@nav/tutorials/basics/dynamic-nav',
            'mutable-nav': '@nav/tutorials/basics/mutable-nav',
            'custom-layout': '@nav/tutorials/basics/custom-layout',
            'composite-layout': '@nav/tutorials/basics/composite-layout',
            typescript: '@nav/tutorials/basics/typescript',
            'basics-utils': '@nav/tutorials/basics/code-utils',
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
