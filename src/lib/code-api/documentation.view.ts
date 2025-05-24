import { AnyVirtualDOM, ChildrenLike, EmptyDiv, VirtualDOM } from 'rx-vdom'
import type { Router } from '../index'
import { Configuration } from './configurations'
import { Documentation, DocumentationSection } from './models'
import { Dependencies } from './index'
import { MkApiApiLink, MkApiExtLink } from './md-widgets'
import { NotebookViewParameters } from '../notebook'

/**
 * View for a {@link Documentation}.
 */
export class DocumentationView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-DocumentationView'
    public readonly documentation: Documentation
    public readonly router: Router
    public readonly configuration: Configuration
    public readonly tag = 'div'
    public readonly class = `${DocumentationView.CssSelector} mkapi-doc`
    public readonly children: ChildrenLike
    constructor(params: {
        documentation: Documentation
        router: Router
        configuration: Configuration
    }) {
        Object.assign(this, params)

        this.children = this.documentation.sections.map((section) => {
            return new SectionView({
                section,
                router: this.router,
                configuration: this.configuration,
            })
        })
    }
}

export class SectionView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike = []
    public readonly class = 'mkapi-section'

    constructor({
        section,
        router,
        configuration,
    }: {
        section: DocumentationSection
        router: Router
        configuration: Configuration
    }) {
        const views = {
            ...(configuration.mdParsingOptions?.views ?? {}),
            'mkapi-ext-link': (elem: HTMLElement) => {
                return new MkApiExtLink(elem)
            },
            'mkapi-api-link': (elem: HTMLElement) => {
                return new MkApiApiLink(elem)
            },
        }
        let notebookSection: AnyVirtualDOM = EmptyDiv
        if (configuration.notebook && Dependencies.Notebook) {
            const nbConfig =
                typeof configuration.notebook === 'object'
                    ? configuration.notebook
                    : {}
            const paramsNotebook = mergeDeep(
                {
                    src: section.content,
                    router,
                    options: {
                        runAtStart: true,
                        markdown: { views },
                    },
                },
                nbConfig,
            )
            notebookSection = new Dependencies.Notebook.NotebookSection(
                paramsNotebook as NotebookViewParameters,
            )
        }
        this.children = [
            section.title ? new SectionHeader(section) : undefined,
            configuration.notebook && Dependencies.Notebook
                ? notebookSection
                : Dependencies.parseMd({
                      ...(configuration.mdParsingOptions ?? {}),
                      src: section.content,
                      router: router,
                      views,
                  }),
        ]
    }
}

export class SectionHeader implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class =
        'mkapi-section-header w-100 p-2 my-3 d-flex align-items-center text-dark border-bottom'

    constructor(section: DocumentationSection) {
        const factory: Record<string, string> = {
            warning: 'fas fa-exclamation fv-text-focus',
            example: 'fas fa-code fv-text-success',
            todos: 'fas fa-forward fv-text-success',
        }
        this.children = [
            {
                tag: 'div',
                class:
                    factory[section.semantic.role] ||
                    'fas fa-info fv-text-success',
            },
            { tag: 'div', class: 'mx-2' },
            {
                tag: 'div',
                innerText: section.title,
            },
        ]
    }
}

function mergeDeep(obj1: object, obj2: object): object {
    const result = { ...obj1 }

    for (const key in obj2) {
        // eslint-disable-next-line no-prototype-builtins
        if (obj2.hasOwnProperty(key)) {
            if (
                obj1[key] &&
                obj2[key] &&
                typeof obj1[key] === 'object' &&
                typeof obj2[key] === 'object' &&
                !Array.isArray(obj1[key]) &&
                !Array.isArray(obj2[key])
            ) {
                result[key] = mergeDeep(
                    obj1[key] as object,
                    obj2[key] as object,
                )
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                result[key] = obj2[key]
            }
        }
    }

    return result
}
