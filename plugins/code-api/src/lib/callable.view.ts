import type { Router } from 'mkdocs-ts'
import { Configuration } from './configurations'
import { VirtualDOM, ChildrenLike } from 'rx-vdom'
import { DocumentationView } from './documentation.view'
import { CodeView } from './code.view'
import { HeaderView } from './header.view'
import { separatorView } from './utils'
import { Callable, Module, Project, Type } from './models'
/**
 * View for a {@link Callable}.
 */
export class CallableView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-CallableView'
    public readonly callable: Callable
    public readonly fromModule: Module

    public readonly router: Router
    public readonly configuration: Configuration
    public readonly project: Project
    public readonly tag = 'div'
    public readonly class = `${CallableView.CssSelector} mkapi-callable`
    public readonly children: ChildrenLike

    constructor(params: {
        callable: Callable
        router: Router
        configuration: Configuration
        project: Project
        parent?: Type
        fromModule: Module
    }) {
        Object.assign(this, params)
        this.class += ` mkapi-role-${this.callable.semantic.role}`
        this.children = [
            new HeaderView({
                tag: params.parent ? 'h4' : 'h3',
                withClass: `doc-${this.callable.semantic.role}-name`,
                doc: this.callable,
                relativeToPath: this.fromModule.path,
            }),
            separatorView,
            new CodeView({
                code: this.callable.code,
                router: this.router,
                configuration: this.configuration,
                parent: this.callable,
                project: this.project,
            }),
            { tag: 'div', class: 'mt-3' },
            new DocumentationView({
                documentation: this.callable.documentation,
                router: this.router,
                configuration: this.configuration,
                project: this.project,
            }),
        ]
    }
}
