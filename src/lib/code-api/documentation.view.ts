import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import type { Router } from '../index'
import { Configuration } from './configurations'
import { Documentation, DocumentationSection } from './models'
import type { NotebookTypes } from '../../index'
import { from } from 'rxjs'
import { Dependencies } from './index'

export class DocumentationView implements VirtualDOM<'div'> {
    public readonly documentation?: Documentation
    public readonly router: Router
    public readonly configuration: Configuration
    public readonly tag = 'div'
    public readonly class = 'mkapi-doc'
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
        if (!section) {
            return
        }
        const nbConfig: object =
            typeof configuration === 'boolean'
                ? {}
                : (configuration.notebook as object)

        this.children = [
            section.title && new SectionHeader(section),
            configuration.notebook
                ? child$({
                      source$: from(Dependencies.installNotebookModule()),
                      vdomMap: (mdle: typeof NotebookTypes) => {
                          return new mdle.NotebookPage({
                              src: section.content,
                              router,
                              options: { runAtStart: true },
                              ...nbConfig,
                          })
                      },
                  })
                : Dependencies.parseMd({
                      src: section.content,
                      router: router,
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
        const factory = {
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
