import {
    DefaultLayout,
    installCodeApiModule,
    Navigation,
    MdWidgets,
} from 'mkdocs-ts'
import { firstValueFrom } from 'rxjs'
import { logo } from './logo'
import { companionNodes$ } from './on-load'
import { NotebookModule } from './config.notebook'
import { fromMd, placeholders } from './config.markdown'

import * as HowTo from './how-to'
import * as Tutorials from './tutorials'

await Promise.all([
    firstValueFrom(
        NotebookModule.SnippetEditorView.fetchCmDependencies$('javascript'),
    ),
    firstValueFrom(
        NotebookModule.SnippetEditorView.fetchCmDependencies$('python'),
    ),
])

export type AppNav = Navigation<
    DefaultLayout.NavLayout,
    DefaultLayout.NavHeader
>

export const navigation: AppNav = {
    name: 'mkDocs-TS',
    header: {
        icon: logo,
        wrapperClass: `${DefaultLayout.NavHeaderView.DefaultWrapperClass} border-bottom p-1`,
    },
    layout: {
        content: fromMd('index.md'),
    },
    routes: {
        '/how-to': HowTo.navigation,
        '/tutorials': Tutorials.navigation,
        '/api': apiNav(),
    },
}

async function apiNav(): Promise<AppNav> {
    const CodeApiModule = await installCodeApiModule()
    // This is to preload for javascript snippets included in the API documentation, such that the `scrollTo` is
    // working well.
    await firstValueFrom(
        MdWidgets.CodeSnippetView.fetchCmDependencies$('javascript'),
    )
    return CodeApiModule.codeApiEntryNode({
        name: 'API',
        header: {
            icon: {
                tag: 'i' as const,
                class: `fas fa-code`,
            },
            actions: [
                DefaultLayout.splitCompanionAction({
                    path: '/api',
                    companionNodes$,
                }),
            ],
        },
        entryModule: 'mkdocs-ts',
        docBasePath: '../assets/api',
        configuration: {
            ...CodeApiModule.configurationTsTypedoc,
            notebook: {
                options: {
                    runAtStart: true,
                    markdown: {
                        placeholders,
                    },
                },
            },
            mdParsingOptions: {
                placeholders,
            },
        },
    })
}
