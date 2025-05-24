require('./style.css')
import { DefaultLayout, Navigation, Router, MdWidgets } from 'mkdocs-ts'
import * as mkdocs from 'mkdocs-ts'
import { render } from 'rx-vdom'

const header = (faIcon) => ({
    icon: { tag: 'i', class: `fas ${faIcon}` },
})

MdWidgets.CodeSnippetView.defaultLanguagesFolder = '/assets/prism/'

let navigation: Navigation<any, any> = {
    name: 'Demo JS + CDN',
    layout: './assets/home.md',
    header: header('fa-space-shuttle'),
    routes: {
        '/markdown': {
            name: 'Markdown',
            layout: './assets/markdown.md',
            header: header('fa-space-shuttle'),
        },
        '/notebook': {
            name: 'Notebook',
            layout: async ({ router }) => {
                const NotebookModule = await import('mkdocs-ts/Notebook')
                NotebookModule.setup({ mkdocs, webpm: undefined })
                return new NotebookModule.NotebookPage({
                    url: './assets/notebook.md',
                    router,
                })
            },
            header: header('fa-space-shuttle'),
        },
    },
}

let router = new Router({
    navigation,
})

const topBanner = {
    logo: {
        icon: './assets/favicon.svg',
        title: 'Demo JS + CDN',
    },
    expandedContent: {
        tag: 'i' as const,
        class: 'text-center',
        innerText: 'Documentation is the first step to clarity',
    },
}

const appView = new DefaultLayout.Layout({
    router,
    topBanner,
})

document.body.appendChild(render(appView))
