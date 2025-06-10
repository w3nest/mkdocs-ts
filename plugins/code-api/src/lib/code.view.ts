import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { BehaviorSubject } from 'rxjs'
import { parseMd, type Router } from 'mkdocs-ts'
import { Configuration } from './configurations'
import { Code, Entity, Project } from './models'
import { DeclarationView } from './declaration.view'
import { faIconTyped } from './fa-icons'

class CodeHeaderView implements VirtualDOM<'div'> {
    static readonly CssSelector = 'mkdocs-CodeHeaderView'
    public readonly code: Code
    public readonly configuration: Configuration
    public readonly project: Project

    public readonly tag = 'div'
    public readonly class = `${CodeHeaderView.CssSelector} mkapi-code mkapi-semantic-color d-flex align-items-center border rounded p-1 w-100`
    public readonly style = {
        fontSize: '0.8em',
    }
    public readonly children: ChildrenLike
    public readonly expanded$: BehaviorSubject<boolean>

    constructor(params: {
        code: Code
        expanded$: BehaviorSubject<boolean>
        configuration: Configuration
        project: Project
        parent: Entity
    }) {
        Object.assign(this, params)
        this.class += ` mkapi-role-${params.parent.semantic.role}`
        const path = this.code.filePath
        this.children = [
            faIconTyped('fa-code'),
            {
                tag: 'div',
                class: 'mx-2',
            },
            {
                tag: 'div',
                innerText: 'Source code in ',
            },
            {
                tag: 'a',
                class: 'my-0 mx-2',
                innerText: path,
                target: '_blank',
                href: this.configuration.codeUrl({
                    project: this.project,
                    path,
                    startLine: this.code.startLine,
                }),
            },
            {
                tag: 'div',
                class: 'flex-grow-1',
            },
            {
                tag: 'div',
                class: 'fv-pointer',
                children: [
                    child$({
                        source$: this.expanded$,
                        vdomMap: (expanded) => {
                            return expanded
                                ? faIconTyped('fa-chevron-down')
                                : faIconTyped('fa-chevron-right')
                        },
                    }),
                ],
                onclick: () => {
                    this.expanded$.next(!this.expanded$.value)
                },
            },
        ]
    }
}
/**
 * View for a {@link Code}.
 */
export class CodeView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-CodeView'
    public readonly router: Router
    public readonly code: Code
    public readonly configuration: Configuration
    public readonly project: Project

    public readonly tag = 'div'
    public readonly class = `${CodeView.CssSelector} fv-border-primary rounded`
    public readonly style = {
        fontSize: '0.9em',
    }
    public readonly children: ChildrenLike
    public readonly expanded$ = new BehaviorSubject(false)
    constructor(params: {
        code: Code
        parent: Entity
        router: Router
        configuration: Configuration
        project: Project
    }) {
        Object.assign(this, params)
        const declarationView = new DeclarationView({
            code: this.code,
            parent: params.parent,
            rootModulesNav: this.project.rootModulesNav,
        })
        if (this.code.implementation === undefined) {
            this.children = [declarationView]
            return
        }
        const implementation = this.code.implementation
        const implementationView = implementation
            ? new ImplementationView(params)
            : undefined
        this.children = [
            declarationView,
            { tag: 'div', class: 'my-1' },
            implementationView,
        ]
    }
}

/**
 * View for the implementation of a {@link Code}.
 */
export class ImplementationView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly expanded$ = new BehaviorSubject(false)
    constructor(params: {
        code: Code
        parent: Entity
        router: Router
        configuration: Configuration
        project: Project
    }) {
        const implementation = params.code.implementation
        if (!implementation) {
            this.children = []
            return
        }
        this.children = [
            new CodeHeaderView({
                code: params.code,
                parent: params.parent,
                expanded$: this.expanded$,
                configuration: params.configuration,
                project: params.project,
            }),
            child$({
                source$: this.expanded$,
                vdomMap: (expanded) => {
                    if (!expanded) {
                        return { tag: 'div' }
                    }
                    return {
                        tag: 'div',
                        class: 'ms-1 me-1 mt-1 code-api-snippet ',
                        style: {
                            fontSize: '0.8em',
                        },
                        children: [
                            parseMd({
                                src: `
<code-snippet language="javascript">
${implementation}
</code-snippet>`,
                                router: params.router,
                            }),
                        ],
                    }
                },
            }),
        ]
    }
}
