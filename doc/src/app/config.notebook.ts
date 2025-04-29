import { installNotebookModule, Router } from 'mkdocs-ts'
import { createRootContext } from './config.context'
import { CSS3DModule } from './tutorials/getting-started/css-3d-renderer'
import { placeholders, url } from './config.markdown'
import { firstValueFrom } from 'rxjs'

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

export const notebookPage = async (target: string, router: Router) => {
    const NotebookModule = await installNotebookModule()
    await Promise.all([
        firstValueFrom(
            NotebookModule.SnippetEditorView.fetchCmDependencies$('javascript'),
        ),
        firstValueFrom(
            NotebookModule.SnippetEditorView.fetchCmDependencies$('python'),
        ),
    ])
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
