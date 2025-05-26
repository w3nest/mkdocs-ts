import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { parseMd, type Router } from 'mkdocs-ts'
import { Configuration } from './configurations'
import { Documentation, DocumentationSection } from './models'
import { MkApiApiLink, MkApiExtLink } from './md-widgets'

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
        this.children = [
            section.title ? new SectionHeader(section) : undefined,
            configuration.sectionView
                ? configuration.sectionView({
                      src: section.content,
                      router,
                      mdViews: views,
                  })
                : parseMd({
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
