import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import {
    Entity,
    Attribute, // eslint-disable-line @typescript-eslint/no-unused-vars
    Callable, // eslint-disable-line @typescript-eslint/no-unused-vars
    Module,
    Type,
    ChildModule,
} from './models'
import { BehaviorSubject } from 'rxjs'
import { Router } from '../router'

/**
 * Interface for entities included in {@link SummaryView}.
 *
 */
type EntityForSummary = Entity | ChildModule

/**
 * Summary view for {@link Module} and {@link Type}.
 */
export class SummaryView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-SummaryView'
    public readonly tag = 'div'
    public readonly class: string = `${SummaryView.CssSelector} border rounded mkdocs-border-info`
    public readonly children: ChildrenLike
    public readonly expanded$ = new BehaviorSubject(false)

    /**
     *
     * @param params
     * @param params.target The target {@link Module} or {@link Type}.
     * @param params.navBase The navigation path of the associated module (*i.e* {@link Module.navPath} for module).
     * @param params.router The router instance.
     */
    constructor(params: { target: Module | Type; router: Router }) {
        const attributes = params.target.attributes
        const callables = params.target.callables
        const modules = 'types' in params.target ? params.target.children : []
        const types = 'types' in params.target ? params.target.types : []
        const targets = [...modules, ...attributes, ...callables, ...types]
        if (targets.length === 0) {
            this.class = ''
            return
        }
        const sections = targets.reduce(
            (acc: Record<string, EntityForSummary[]>, e) => {
                const sem = e.semantic.role
                if (!(sem in acc) || !('push' in acc[sem])) {
                    acc[sem] = []
                }
                acc[sem].push(e)
                return acc
            },
            {},
        )

        this.children = [
            new SummaryHeader({ expanded$: this.expanded$ }),
            {
                tag: 'div',
                class: 'border-start ps-2',
                children: {
                    policy: 'replace',
                    source$: this.expanded$,
                    vdomMap: (expanded) =>
                        expanded
                            ? Object.entries(sections).map(([k, v]) => {
                                  return new SummaryLinksSection({
                                      title: k,
                                      targets: v,
                                      router: params.router,
                                  })
                              })
                            : [],
                },
            },
        ]
    }
}

/**
 * Header view of {@link SummaryView}.
 */
export class SummaryHeader implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'SummaryHeader'

    public readonly tag = 'div'
    public readonly class = `${SummaryHeader.CssSelector} mkdocs-bg-info border d-flex align-items-center p-1`
    public readonly style = {
        fontWeight: 'bolder' as const,
    }
    public readonly children: ChildrenLike

    constructor({ expanded$ }: { expanded$: BehaviorSubject<boolean> }) {
        this.children = [
            {
                tag: 'i',
                class: 'fas fa-eye',
            },
            { tag: 'div', class: 'mx-2' },
            { tag: 'div', innerText: 'Symbols' },
            { tag: 'div', class: 'flex-grow-1' },
            {
                tag: 'button',
                class: {
                    source$: expanded$,
                    vdomMap: (expanded) =>
                        expanded ? 'fa-chevron-down' : 'fa-chevron-right',
                    wrapper: (d) => `btn btn-sm btn-light fas ${d}`,
                },
                onclick: () => {
                    expanded$.next(!expanded$.value)
                },
            },
        ]
    }
}
/**
 * A cards' section of {@link SummaryView} regrouping items with same semantic.
 */
export class SummaryLinksSection implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'SummaryLinksSection'
    public readonly tag = 'div'
    public readonly class = `${SummaryLinksSection.CssSelector} my-2`
    public readonly children: ChildrenLike

    constructor(params: {
        title: string
        targets: EntityForSummary[]
        router: Router
    }) {
        if (params.targets.length === 0) {
            return
        }
        this.children = [
            {
                tag: 'div',
                class: `mkapi-semantic-flag mkapi-role-${params.targets[0].semantic.role} mt-2`,
                innerText: params.title,
                style: {
                    fontWeight: 'bolder',
                },
            },
            {
                tag: 'div',
                class: 'd-flex flex-wrap ps-2',
                children: params.targets.map(
                    (target) =>
                        new SummaryLink({
                            target,
                            router: params.router,
                        }),
                ),
            },
        ]
    }
}

/**
 * A link (to a {@link ChildModule}, {@link Type}, {@link Attribute} or {@link Callable}) in {@link SummaryView}.
 */
export class SummaryLink implements VirtualDOM<'a'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'SummaryLink'
    public readonly tag = 'a'
    public readonly class = `${SummaryLink.CssSelector} m-1`
    public readonly style = {
        width: 'fit-content',
    }
    public readonly innerText: string
    public readonly children: ChildrenLike
    public readonly href: string
    public readonly onclick: (ev: MouseEvent) => void

    constructor(params: { target: EntityForSummary; router: Router }) {
        this.href = params.target.navPath.replace('@nav', '')
        const path = this.href.split('.')[0]
        const sectionId = this.href.split('.').slice(1).join('.')
        this.innerText = params.target.name
        this.onclick = (ev: MouseEvent) => {
            ev.preventDefault()
            params.router.fireNavigateTo({
                path,
                sectionId,
                issuer: 'link',
            })
        }
    }
}
