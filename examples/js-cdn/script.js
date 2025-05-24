const webpm = window.webpm
const version = '^0.4.2'
const { MkDocs, RxVDom } = await webpm.install({
    esm: [`mkdocs-ts#${version} as MkDocs`, 'rx-vdom#^0.1.6 as RxVDom'],
    css: [
        'bootstrap#5.3.3~bootstrap.min.css',
        'fontawesome#5.12.1~css/all.min.css',
        `mkdocs-ts#${version}~assets/mkdocs-light.css`,
        `mkdocs-ts#${version}~assets/notebook.css`,
    ],
})
console.log('mkdocs', MkDocs)

const header = (faIcon) => ({
    icon: { tag: 'i', class: `fas ${faIcon}` },
})

let navigation = {
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
                const NotebookModule = await MkDocs.installNotebookModule()
                console.log(NotebookModule)
                return new NotebookModule.NotebookPage({
                    url: './assets/notebook.md',
                    router,
                })
            },
            header: header('fa-space-shuttle'),
        },
    },
}

let router = new MkDocs.Router({
    navigation,
})

const topBanner = {
    logo: {
        icon: './assets/favicon.svg',
        title: 'Demo JS + CDN',
    },
    expandedContent: {
        tag: 'i',
        class: 'text-center',
        innerText: 'Documentation is the first step to clarity',
    },
}

const appView = new MkDocs.DefaultLayout.Layout({
    router,
    topBanner,
})

const { TP } = await webpm.install({
    esm: ['tweakpane#^4.0.1 as TP'],
})

MkDocs.GlobalMarkdownViews.factory = {
    ...MkDocs.GlobalMarkdownViews.factory,
    custom: (element) => {
        const pane = new TP.Pane()
        const getAttr = (name, defaultVal) =>
            parseFloat(element.getAttribute(name) ?? defaultVal)
        const params = {
            improbabilityFactor: getAttr('improbabilityFactor', 3),
            babelFishCount: getAttr('babelFishCount', 1),
            vogonPoetryExposure: getAttr('vogonPoetryExposure', 250),
            towelAbsorbency: getAttr('towelAbsorbency', 2),
        }
        Object.keys(params).forEach((k) => pane.addBinding(params, k))
        pane.addButton({ title: 'Compute', label: '' }).on('click', () =>
            alert('The result is 42'),
        )
        return pane.element
    },
}

document.body.appendChild(RxVDom.render(appView))
