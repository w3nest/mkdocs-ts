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
            Notebook: '@nav/api/Notebook',
            'Notebook.Views': '@nav/api/Notebook/Views',
            notify: '@nav/api/Notebook/Views.notify',
            'Notebook.Views.Layouts': '@nav/api/Notebook/Views/Layouts',
            installNotebookModule: '@nav/api/MainModule.installNotebookModule',
            NotebookPage: '@nav/api/Notebook.NotebookPage',
            install: '@nav/api/Notebook/Installer.install',
            NotebookViewParameters: '@nav/api/Notebook.NotebookViewParameters',
            JsCellView: '@nav/api/Notebook.JsCellView',
            MdCellView: '@nav/api/Notebook.MdCellView',
            PyCellView: '@nav/api/Notebook.PyCellView',
            InterpreterCellView: '@nav/api/Notebook.InterpreterCellView',
            InterpreterApi: '@nav/api/Notebook.InterpreterApi',
            display: '@nav/api/Notebook.display',
            DisplayFactory: '@nav/api/Notebook.DisplayFactory',
            Scope: '@nav/api/Notebook.Scope',
            'Notebook.Views.Range': '@nav/api/Notebook/Views.Range',
            'DeportedOutputsView.FromDomAttributes':
                '@nav/api/Notebook.DeportedOutputsView.FromDomAttributes',
            CodeApi: '@nav/api/CodeApi',
            HttpClientTrait: '@nav/api/CodeApi.HttpClientTrait',
            codeApiEntryNode: '@nav/api/CodeApi.codeApiEntryNode',
            installCodeApiModule: '@nav/api/MainModule.installCodeApiModule',
            Navigation: '@nav/api/MainModule.Navigation',
            DynamicRoutes: '@nav/api/MainModule.DynamicRoutes',
            LazyRoutes: '@nav/api/MainModule.LazyRoutes',
            LazyRoutesCb: '@nav/api/MainModule.LazyRoutesCb',
            LazyRoutesCb$: '@nav/api/MainModule.LazyRoutesCb$',
            LazyRoutesReturn: '@nav/api/MainModule.LazyRoutesReturn',
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
            MdParsingOptions: '@nav/api/MainModule.MdParsingOptions',
            ViewGenerator: '@nav/api/MainModule.ViewGenerator',
            replaceLinks: '@nav/api/MainModule.replaceLinks',
            GlobalMarkdownViews: '@nav/api/MainModule.GlobalMarkdownViews',
            MdWidgets: '@nav/api/MainModule/MdWidgets',
            NoteView: '@nav/api/MainModule/MdWidgets.NoteView',
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
            MkApiTypescript: '@nav/api/MkApiBackends/MkApiTypescript',
            mkapi_python: '@nav/api/MkApiBackends/mkapi_python',
        }

        const classes = {
            Notebook: 'mkapi-role-module',
            'Notebook.Views': 'mkapi-role-module',
            'Notebook.Views.Layouts': 'mkapi-role-module',
            installNotebookModule: 'mkapi-role-function',
            NotebookPage: 'mkapi-role-class',
            NotebookViewParameters: 'mkapi-role-type-alias',
            install: 'mkapi-role-function',
            JsCellView: 'mkapi-role-class',
            MdCellView: 'mkapi-role-class',
            InterpreterCellView: 'mkapi-role-class',
            InterpreterApi: 'mkapi-role-interface',
            display: 'mkapi-role-type-alias',
            DisplayFactory: 'mkapi-role-type-alias',
            Scope: 'mkapi-role-interface',
            'Notebook.Views.Range': 'mkapi-role-class',
            'DeportedOutputsView.FromDomAttributes': 'mkapi-role-attribute',
            CodeApi: 'mkapi-role-module',
            HttpClientTrait: 'mkapi-role-interface',
            codeApiEntryNode: 'mkapi-role-function',
            installCodeApiModule: 'mkapi-role-function',
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
            MdParsingOptions: 'mkapi-role-interface',
            replaceLinks: 'mkapi-role-function',
            MdWidgets: 'mkapi-role-module',
            GlobalMarkdownViews: 'mkapi-role-class',
            NoteView: 'mkapi-role-class',
            ViewGenerator: 'mkapi-role-type-alias',
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
            MkApiTypescript: 'mkapi-role-module',
            mkapi_python: 'mkapi-role-module',
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
            w3nest: '/apps/@w3nest/doc/latest',
            'w3nest-gallery': '/apps/@w3nest/gallery/latest',
            tweakpane: 'https://tweakpane.github.io/docs/',
            fontawesome: 'https://fontawesome.com/v5/search',
            three: 'https://threejs.org/',
            pyodide: 'https://pyodide.org/en/stable/',
            'pyodide-packages':
                'https://pyodide.org/en/stable/usage/packages-in-pyodide.html',
            'pyodide-limitations':
                'https://pyodide.org/en/stable/usage/wasm-constraints.html',
            'pyodide-type-convertion':
                'https://pyodide.org/en/stable/usage/type-conversions.html',
            matplotlib: 'https://matplotlib.org/',
            'rx-vdom': '/apps/@rx-vdom/doc/latest',
            'virtual-dom': '/apps/@rx-vdom/doc/latest?nav=/api.VirtualDOM',
            'bootstrap.d-flex':
                'https://getbootstrap.com/docs/4.0/utilities/flex/',
            RxChild: '/apps/@rx-vdom/doc/latest?nav=/api.RxChild',
            webpm: '/apps/@webpm/doc/latest',
            'floating-ui': 'https://floating-ui.com/',
            BehaviorSubject:
                'https://www.learnrxjs.io/learn-rxjs/subjects/behaviorsubject',
            Observable: 'https://rxjs.dev/guide/observable',
            operators: 'https://rxjs.dev/guide/operators',
            Promise:
                'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
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

export class GitHubLink implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly innerText: string
    public readonly href: string
    public readonly target = '_blank'

    constructor(elem: HTMLElement) {
        const target = elem.getAttribute('target')!
        const navs = {
            'tutorials.notebook.md':
                'https://github.com/w3nest/mkdocs-ts/blob/main/doc/assets/tutorials.notebook.md?raw=1',
            'tutorials.basics.md':
                'https://github.com/w3nest/mkdocs-ts/blob/main/doc/assets/tutorials.basics.md?raw=1',
            github: 'https://github.com/w3nest/mkdocs-ts',
            'github-static-tests':
                'https://github.com/w3nest/mkdocs-ts/tree/main/src/tests/static-tests',
            'tests.custom-layout':
                'https://github.com/w3nest/mkdocs-ts/tree/main/src/tests/lib/custom-layout.test.ts',
            'static-tests.custom-layout':
                'https://github.com/w3nest/mkdocs-ts/tree/main/src/tests/static-tests/custom-layout.ts',
            'static-tests.composite-layout':
                'https://github.com/w3nest/mkdocs-ts/tree/main/src/tests/static-tests/composite-layout.ts',
        }
        this.href = navs[target]
        this.children = [
            {
                tag: 'i',
                innerText: elem.textContent,
            },
            {
                tag: 'i',
                class: 'fab fa-github',
                style: { transform: 'scale(0.8)' },
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
            'notebook.python': '@nav/tutorials/notebook/python',
            'notebook.python.matplotlib':
                '@nav/tutorials/notebook/python.matplotlib',
            'notebook.import': '@nav/tutorials/notebook/import',
            'notebook.scope': '@nav/tutorials/notebook/scope',
            'notebook.workers': '@nav/tutorials/notebook/workers',
            'notebook.interpreter': '@nav/tutorials/notebook/interpreter',
            'notebook.display': '@nav/tutorials/notebook.output',
            'notebook.utils.2d-chart':
                '@nav/tutorials/notebook/import-utils.a-2d-chart-helper',
            markdown: '@nav/tutorials/markdown',
            basics: '@nav/tutorials/basics',
            'dynamic-nav': '@nav/tutorials/basics/dynamic-nav',
            'mutable-nav': '@nav/tutorials/basics/dynamic-nav/mutable-nav',
            'custom-layout': '@nav/tutorials/basics/custom-layout',
            'composite-layout':
                '@nav/tutorials/basics/custom-layout/composite-layout',
            typescript: '@nav/tutorials/basics/typescript',
            'basics-utils': '@nav/tutorials/basics/code-utils',
            'code-api': '@nav/tutorials/code-api',
            'api-backend': '@nav/how-to/api-backend',
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
