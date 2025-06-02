import { Router } from 'mkdocs-ts'
import { createRootContext } from './config.context'
import { CSS3DModule } from './tutorials/getting-started/css-3d-renderer'
import { placeholders, url } from './config.markdown'

import type * as NotebookModule from '@mkdocs-ts/notebook'
import pkgJsonNotebook from '../../../plugins/notebook/package.json'
import * as webpm from '@w3nest/webpm-client'

export const notebookOptions = {
    runAtStart: true,
    defaultCellAttributes: {
        lineNumbers: false,
    },
    markdown: {
        latex: true,
        placeholders,
    },
}
export const notebookVersion = pkgJsonNotebook.version

export async function installNotebookModule() {
    const { Notebook } = await webpm.install<{
        Notebook: typeof NotebookModule
    }>({
        esm: [`@mkdocs-ts/notebook#${notebookVersion} as Notebook`],
        css: [`@mkdocs-ts/notebook#${notebookVersion}~assets/notebook.css`],
    })
    return Notebook
}

export const notebookPage = async (target: string, router: Router) => {
    const Notebook = await installNotebookModule()

    const context = createRootContext({
        threadName: `Notebook(${target})`,
        labels: ['Notebook'],
    })
    return new Notebook.NotebookPage(
        {
            url: url(target),
            router,
            options: notebookOptions,
            initialScope: {
                const: {
                    CSS3DModule,
                    webpm,
                },
                let: {},
            },
        },
        context,
    )
}
