import { registerMdWidgets } from './markdown.config.js'

const webpm = window.webpm
const versionMkDocs = '0.5.0'
const versionNotebook = '0.1.0'
const versionCodeApi = '0.1.0'

const loadingScreen = new webpm.LoadingScreen({
    name: 'Demo JavaScript + CDN',
    description: 'Simple Install Free Showcase',
    logo: '../assets/favicon.svg',
})
const { MkDocs, RxVDom } = await webpm.install({
    esm: [`mkdocs-ts#${versionMkDocs} as MkDocs`, 'rx-vdom#^0.1.6 as RxVDom'],
    css: [
        'bootstrap#5.3.3~bootstrap.min.css',
        `mkdocs-ts#${versionMkDocs}~assets/mkdocs-light.css`,
    ],
    onEvent: (ev) => {
        loadingScreen.next(ev)
    },
})

loadingScreen.done()
/**
 * Utility function for header definition.
 *
 * @param url URL of the icon.
 * @returns The header.
 */
function header(url) {
    return {
        icon: { tag: 'img', src: url, height: 40, style: { maxWidth: '40px' } },
    }
}
/**
 * The navigation object, backbone of the application.
 */
let navigation = {
    name: 'Demo JS + CDN',
    layout: './README.md',
    header: header('./assets/favicon.svg'),
    routes: {
        '/markdown': {
            name: 'Markdown',
            layout: './assets/markdown.md',
            header: header('./assets/md.svg'),
        },
        '/notebook': {
            name: 'Notebook',
            layout: async ({ router }) => {
                // The notebook plugin is only loaded when navigating to this page.
                const { NotebookModule } = await webpm.install({
                    esm: [
                        `@mkdocs-ts/notebook#${versionNotebook} as NotebookModule`,
                    ],
                    css: [
                        `@mkdocs-ts/notebook#${versionNotebook}~assets/notebook.css`,
                    ],
                })
                return new NotebookModule.NotebookPage({
                    url: './assets/notebook.md',
                    router,
                })
            },
            header: header('./assets/notebook.svg'),
        },
        '/api': apiNav(),
    },
}

/**
 * Helpers to construct the API documentation node.
 *
 * @returns The node definition.
 */
export async function apiNav() {
    // The code-api plugin is asynchronously loaded here, it does not prevent the remaining navigation nodes to resolve.
    const { CodeApiModule } = await webpm.install({
        esm: [`@mkdocs-ts/code-api#${versionCodeApi} as CodeApiModule`],
        css: [`@mkdocs-ts/code-api#${versionCodeApi}~assets/ts-typedoc.css`],
    })
    return CodeApiModule.codeApiEntryNode({
        name: 'API',
        header: header('./assets/api.svg'),
        entryModule: 'ex-ts-npm',
        docBasePath: `../assets/api`,
        configuration: CodeApiModule.configurationTsTypedoc,
    })
}

registerMdWidgets(MkDocs)

const appView = new MkDocs.DefaultLayout.Layout({
    router: new MkDocs.Router({
        navigation,
    }),
    topBanner: {
        logo: {
            icon: './assets/favicon.svg',
            title: 'Demo JS + CDN',
        },
        expandedContent: {
            tag: 'i',
            class: 'text-center',
            innerText: 'Documentation is the first step to clarity',
        },
    },
    navFooter: true,
    footer: {
        tag: 'div',
        class: 'p-1 text-center mkdocs-bg-1',
        innerHTML:
            '<a href="https://w3nest.org/apps/@mkdocs-ts/doc/latest" target="_blank">📖 MkDocs-TS</a>',
    },
})

document.body.appendChild(RxVDom.render(appView))
