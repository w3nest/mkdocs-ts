import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import type { Router } from '../index'
import { Configuration } from './configurations'
import { DocumentationView } from './documentation.view'
import { HeaderView } from './header.view'
import { Attribute, Module, Project, Type } from './models'
import { CodeView } from './code.view'

export class AttributeView implements VirtualDOM<'div'> {
    public readonly attribute: Attribute
    public readonly fromModule: Module

    public readonly parent?: Type
    public readonly router: Router
    public readonly configuration: Configuration
    public readonly project: Project
    public readonly tag = 'div'
    public readonly class = 'mkapi-attr'
    public readonly children: ChildrenLike
    constructor(params: {
        router: Router
        attribute: Attribute
        configuration: Configuration
        project: Project
        parent?: Type
        fromModule: Module
    }) {
        Object.assign(this, params)
        this.class += ` mkapi-role-${this.attribute.semantic.role}`

        this.children = [
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    new HeaderView({
                        tag: params.parent ? 'h4' : 'h3',
                        withClass: `doc-${this.attribute.semantic.role}-name`,
                        doc: this.attribute,
                        relativeToPath: this.fromModule.path,
                    }),
                ],
            },
            {
                tag: 'div',
                children: [
                    new CodeView({
                        code: this.attribute.code,
                        router: this.router,
                        configuration: this.configuration,
                        parent: this.attribute,
                        project: this.project,
                    }),
                ],
            },
            {
                tag: 'div',
                class: 'px-3 py-2',
                children: [
                    new DocumentationView({
                        documentation: this.attribute.documentation,
                        router: this.router,
                        configuration: this.configuration,
                    }),
                ],
            },
        ]
    }
}
