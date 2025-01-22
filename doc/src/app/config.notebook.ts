import { installNotebookModule, Router } from 'mkdocs-ts'
import { createRootContext } from './config.context'
import { CSS3DModule } from './tutorials/getting-started/css-3d-renderer'
import { placeholders, url } from './config.markdown'

export const NotebookModule = await installNotebookModule()
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

export const notebookPage = (target: string, router: Router) => {
    const context = createRootContext({
        threadName: `Notebook(${target})`,
        labels: ['Notebook'],
    })
    return new NotebookModule.NotebookPage(
        {
            url: url(target),
            router,
            options: notebookOptions,
            initialScope: {
                const: {
                    CSS3DModule,
                },
                let: {},
            },
        },
        context,
    )
}
