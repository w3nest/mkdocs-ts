import { attr$, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { BehaviorSubject } from 'rxjs'
import type { Router } from '../index'
import { Configuration } from './configurations'
import { Code, Entity, Project } from './models'
import { DeclarationView } from './declaration.view'
import { Dependencies } from './index'

class CodeHeaderView implements VirtualDOM<'div'> {
    public readonly code: Code
    public readonly configuration: Configuration
    public readonly project: Project

    public readonly tag = 'div'
    public readonly class =
        'mkapi-code mkapi-semantic-color d-flex align-items-center border rounded p-1 w-100'
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
            {
                tag: 'i',
                class: 'fas fa-code',
            },
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
                class: attr$({
                    source$: this.expanded$,
                    vdomMap: (expanded): string =>
                        expanded ? 'fa-chevron-down' : 'fa-chevron-right',
                    wrapper: (d) => `fas fv-pointer ${d}`,
                }),
                onclick: () => {
                    this.expanded$.next(!this.expanded$.value)
                },
            },
        ]
    }
}
export class CodeView implements VirtualDOM<'div'> {
    public readonly router: Router
    public readonly code: Code
    public readonly configuration: Configuration
    public readonly project: Project

    public readonly tag = 'div'
    public readonly class = 'fv-border-primary rounded'
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
        })
        if (this.code.implementation === undefined) {
            this.children = [declarationView]
            return
        }
        const implementation = this.code.implementation
        this.children = [
            declarationView,
            { tag: 'div', class: 'my-1' },
            new CodeHeaderView({
                code: this.code,
                parent: params.parent,
                expanded$: this.expanded$,
                configuration: this.configuration,
                project: this.project,
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
                            Dependencies.parseMd({
                                src: `
<code-snippet language="javascript">
${implementation}
</code-snippet>`,
                                router: this.router,
                            }),
                        ],
                    }
                },
            }),
        ]
    }
}
