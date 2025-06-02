import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Configuration } from './configurations'
import { TypeView } from './type.view'
import { DocumentationView } from './documentation.view'
import { CallableView } from './callable.view'
import { HeaderView } from './header.view'
import { AttributeView } from './attribute.view'
import { ContextTrait, NoContext, Router } from 'mkdocs-ts'
import { separatorView, ySeparatorView5 } from './utils'
import { Entity, Module, Project } from './models'
import { SummaryView } from './summary.view'
import { faIconTyped } from './fa-icons'

/**
 * View for a {@link Module}.
 *
 * It includes:
 *
 * *  {@link SummaryView},
 * *  {@link DocumentationView} for module's documentation,
 * *  {@link CallableView} for each module's callables,
 * *  {@link AttributeView} for each module's attributes,
 * *  {@link TypeView} for each module's types.
 *
 */
export class ModuleView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-ModuleView'
    public readonly module: Module
    public readonly router: Router
    public readonly configuration: Configuration
    public readonly project: Project
    public readonly tag = 'div'
    public readonly class = `${ModuleView.CssSelector} mkapi-module`
    public readonly children: ChildrenLike
    public readonly context?: ContextTrait

    /**
     * Create the VirtualDOM.
     *
     * @param params Arguments
     * @param params.module Model of the module.
     * @param params.router Router of the application.
     * @param params.configuration Rendering configuration.
     * @param ctx Execution context used for logging and tracing.
     */
    constructor(
        params: {
            module: Module
            router: Router
            project: Project
            configuration: Configuration<unknown, unknown>
        },
        ctx?: ContextTrait,
    ) {
        Object.assign(this, params)
        this.context = ctx
        const context = this.ctx().start('new ModuleView', ['View', 'CodeApi'])
        context.info('Display module', this.module)
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
                withClass: `doc-module-name doc-${this.module.semantic.role}-name`,
                doc: this.module,
                relativeToPath: '',
            }),
            separatorView,
            new SummaryView({
                target: this.module,
                router: this.router,
            }),
            separatorView,
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
                        { tag: 'div', class: 'my-2' },
                        new HeaderView({
                            tag: 'h2',
                            icon: faIconTyped('fa-file', { withClass: 'me-1' }),
                            withClass: 'doc-file-name mt-3 mb-2',
                            doc: {
                                name: file.split('/').slice(-1)[0],
                                semantic: undefined,
                                path: file.split('/').slice(-1)[0],
                            },
                            relativeToPath: module.path,
                        }),
                        fileDoc?.documentation
                            ? new DocumentationView({
                                  documentation: fileDoc.documentation,
                                  router: this.router,
                                  configuration: this.configuration,
                              })
                            : undefined,
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
                                        fromModule: this.module,
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
        context.exit()
    }

    ctx(ctx?: ContextTrait) {
        if (ctx) {
            return ctx
        }
        return this.context ?? new NoContext()
    }
}
