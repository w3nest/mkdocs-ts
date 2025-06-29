import type { Router } from 'mkdocs-ts'
import { Configuration } from './configurations'
import { VirtualDOM, ChildrenLike } from 'rx-vdom'
import { AttributeView } from './attribute.view'
import { DocumentationView } from './documentation.view'
import { CodeView } from './code.view'
import { HeaderView } from './header.view'
import { CallableView } from './callable.view'
import { separatorView } from './utils'
import { Module, Project, Type } from './models'
import { SummaryView } from './summary.view'
/**
 * View for a {@link Type}.
 */
export class TypeView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-TypeView'
    public readonly fromModule: Module
    public readonly type: Type
    public readonly router: Router
    public readonly configuration: Configuration
    public readonly project: Project
    public readonly tag = 'div'
    public readonly class = `${TypeView.CssSelector} mkapi-type border-start border-bottom ps-2 mkapi-semantic-border-color`
    public readonly children: ChildrenLike
    constructor(params: {
        fromModule: Module
        type: Type
        router: Router
        configuration: Configuration
        project: Project
    }) {
        Object.assign(this, params)
        this.class += ` mkapi-role-${this.type.semantic.role}`
        this.children = [
            new HeaderView({
                tag: 'h3',
                withClass: `doc-${this.type.semantic.role}-name`,
                doc: this.type,
                relativeToPath: this.fromModule.path,
            }),
            separatorView,
            new CodeView({
                code: this.type.code,
                router: this.router,
                configuration: this.configuration,
                parent: this.type,
                project: this.project,
            }),
            separatorView,
            new SummaryView({
                target: this.type,
                router: this.router,
                project: this.project,
            }),
            { tag: 'div', class: 'mt-3' },
            new DocumentationView({
                documentation: this.type.documentation,
                router: this.router,
                configuration: this.configuration,
                project: this.project,
            }),
            ...this.type.attributes.map((attr) => {
                return {
                    tag: 'div' as const,
                    class: 'my-3',
                    children: [
                        new AttributeView({
                            attribute: attr,
                            router: this.router,
                            configuration: this.configuration,
                            parent: this.type,
                            fromModule: this.fromModule,
                            project: this.project,
                        }),
                    ],
                }
            }),
            ...this.type.callables.map((callable) => {
                return {
                    tag: 'div' as const,
                    class: 'my-3',
                    children: [
                        new CallableView({
                            callable,
                            router: this.router,
                            configuration: this.configuration,
                            parent: this.type,
                            project: this.project,
                            fromModule: this.fromModule,
                        }),
                    ],
                }
            }),
        ]
    }
}
