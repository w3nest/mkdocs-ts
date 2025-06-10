import './style.css'
import { DefaultLayout, Navigation, Router } from 'mkdocs-ts'
import { render } from 'rx-vdom'
import { registerMdWidgets } from './markdown.config'

/**
 * Utility function for header definition.
 *
 * @param url URL of the icon.
 * @returns The header.
 */
export function header(url: string): DefaultLayout.NavHeader {
    return {
        icon: { tag: 'img', src: url, height: 40, style: { maxWidth: '40px' } },
    }
}

/**
 * Type alias for the navigation.
 */
export type AppNav = Navigation<
    DefaultLayout.NavLayout,
    DefaultLayout.NavHeader
>
/**
 * The navigation object, backbone of the application.
 */
export const navigation: AppNav = {
    name: 'Demo TS + NPM',
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
                const NotebookModule = await import('@mkdocs-ts/notebook')
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
export async function apiNav(): Promise<AppNav> {
    // The code-api plugin is asynchronously loaded here, it does not prevent the remaining navigation nodes to resolve.
    const CodeApiModule = await import('@mkdocs-ts/code-api')
    return CodeApiModule.codeApiEntryNode({
        name: 'API',
        header: header('./assets/api.svg'),
        entryModule: 'ex-ts-npm',
        dataFolder: `../assets/api`,
        rootModulesNav: {
            'ex-ts-npm': '@nav/api',
        },
        configuration: CodeApiModule.configurationTsTypedoc,
    })
}

// The application view
const appView = new DefaultLayout.Layout({
    router: new Router({
        navigation,
    }),
    topBanner: {
        logo: {
            icon: './assets/favicon.svg',
            title: 'Demo TS + NPM',
        },
        expandedContent: {
            tag: 'i' as const,
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

registerMdWidgets()

document.body.appendChild(render(appView))
