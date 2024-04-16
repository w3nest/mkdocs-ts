import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { Configuration } from './configurations'
import { TypeView } from './type.view'
import { DocumentationView } from './documentation.view'
import { CallableView } from './callable.view'
import { HeaderView } from './header.view'
import { AttributeView } from './attribute.view'
import type { Router } from '../index'
import { separatorView, ySeparatorView5 } from './utils'
import { Entity, Module, Project } from './models'

/**
 * View for a {@link Module}.
 */
export class ModuleView implements VirtualDOM<'div'> {
    public readonly module: Module
    public readonly router: Router
    public readonly configuration: Configuration
    public readonly project: Project
    public readonly tag = 'div'
    public readonly class = 'mkapi-module'
    public readonly children: ChildrenLike

    /**
     * Create the VirtualDOM.
     *
     * @param params Arguments
     * @param params.module Model of the module.
     * @param params.router Router of the application.
     * @param params.configuration Rendering configuration..
     */
    constructor(params: {
        module: Module
        router: Router
        project: Project
        configuration: Configuration
    }) {
        Object.assign(this, params)
        this.class += ` mkapi-role-${this.module.semantic.role}`
        const getFile = (entity: Entity) => {
            return entity.code.filePath
        }
        const files = [
            ...new Set(
                [
                    ...this.module.attributes,
                    ...this.module.callables,
                    ...this.module.types,
                ].map(getFile),
            ),
        ].sort((a: string, b: string) => a.localeCompare(b))

        this.children = [
            new HeaderView({
                tag: 'h1',
                withClass: 'doc-module-name',
                doc: this.module,
            }),
            {
                tag: 'div',
                children: [
                    new DocumentationView({
                        documentation: this.module.documentation,
                        router: this.router,
                        configuration: this.configuration,
                    }),
                ],
            },
            { tag: 'div', class: 'my-3' },
            separatorView,
            ...[...files].map((file): AnyVirtualDOM => {
                const attributes = this.module.attributes.filter(
                    (a) => getFile(a) === file,
                )
                const types = this.module.types.filter(
                    (a) => getFile(a) === file,
                )
                const callables = this.module.callables.filter(
                    (a) => getFile(a) === file,
                )
                const fileDoc = this.module.files.find((f) => {
                    return f.path === file
                })
                return {
                    tag: 'div' as const,
                    children: [
                        { tag: 'div', class: 'my-5' },
                        new HeaderView({
                            tag: 'h2',
                            withClass: 'doc-file-name fas fa-file',
                            doc: {
                                name: file.split('/').slice(-1)[0],
                                semantic: undefined,
                                path: file.split('/').slice(-1)[0],
                            },
                        }),
                        new DocumentationView({
                            documentation: fileDoc.documentation,
                            router: this.router,
                            configuration: this.configuration,
                        }),
                        {
                            tag: 'div',
                            children: attributes
                                .map((attribute) => [
                                    new AttributeView({
                                        fromModule: this.module,
                                        attribute,
                                        router: this.router,
                                        configuration: this.configuration,
                                        project: this.project,
                                    }),
                                    ySeparatorView5,
                                ])
                                .flat(),
                        },
                        {
                            tag: 'div',
                            children: callables
                                .map((callable) => [
                                    new CallableView({
                                        callable,
                                        router: this.router,
                                        configuration: this.configuration,
                                        project: this.project,
                                    }),
                                    ySeparatorView5,
                                ])
                                .flat(),
                        },
                        {
                            tag: 'div',
                            children: types
                                .map((type) => [
                                    new TypeView({
                                        fromModule: this.module,
                                        type,
                                        router: this.router,
                                        configuration: this.configuration,
                                        project: this.project,
                                    }),
                                    ySeparatorView5,
                                ])
                                .flat(),
                        },
                    ],
                }
            }),
        ]
    }
}
