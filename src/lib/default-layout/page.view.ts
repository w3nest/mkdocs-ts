import {
    ChildrenLike,
    VirtualDOM,
    RxHTMLElement,
    child$,
    AnyVirtualDOM,
} from 'rx-vdom'
import { Target, isResolvedTarget, Router } from '../router'
import { parseMd } from '../markdown'
import {
    filter,
    from,
    map,
    Observable,
    of,
    ReplaySubject,
    switchMap,
    take,
} from 'rxjs'
import { setup } from '../../auto-generated'
import { Resolvable } from '../navigation.node'

interface ContentTrait {
    layout: {
        content: ({ router }: { router: Router }) => Resolvable<AnyVirtualDOM>
    }
}
function hasContentViewTrait(node: unknown): node is ContentTrait {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return (node as ContentTrait)?.layout?.content !== undefined
}

/**
 * The main content of the page.
 */
export class PageView implements VirtualDOM<'div'> {
    public readonly router: Router
    public readonly tag = 'div'
    public readonly class = 'mkdocs-PageView w-100 mkdocs-ts-page text-justify'
    public readonly children: ChildrenLike

    public readonly content$ = new ReplaySubject<HTMLElement>(1)
    public readonly filter?: (target: Target) => boolean
    public readonly connectedCallback: (html: RxHTMLElement<'div'>) => void

    constructor(params: {
        router: Router
        filter?: (target: Target) => boolean
    }) {
        Object.assign(this, params)
        const filterFct = this.filter ?? (() => true)
        const maybeError$ = child$({
            source$: this.router.target$,
            vdomMap: (target) => {
                if (isResolvedTarget(target)) {
                    return { tag: 'div' }
                }
                if (target.reason === 'NotFound') {
                    return new UnresolvedPageView({ path: target.path })
                }
                return new FuturePageView()
            },
        })
        this.children = [
            maybeError$,
            child$({
                source$: this.router.target$.pipe(
                    filter((target) => {
                        return isResolvedTarget(target)
                    }),
                    filter(filterFct),
                    filter((target) => {
                        return hasContentViewTrait(target.node)
                    }),
                    switchMap((target: Target & { node: ContentTrait }) => {
                        console.log('Display page', target)
                        const html = target.node.layout.content({
                            router: this.router,
                        })
                        if (html instanceof Promise) {
                            return from(html).pipe(
                                map((html) => ({ html, ...target })),
                            )
                        }
                        if (html instanceof Observable) {
                            return html.pipe(take(1)).pipe(
                                map((html) => ({
                                    html,
                                    ...target,
                                })),
                            )
                        }
                        return of(html).pipe(
                            map((html) => ({ html, ...target })),
                        )
                    }),
                ),
                vdomMap: (destination) => {
                    return {
                        tag: 'div',
                        children: [destination.html],
                        connectedCallback: (page) => {
                            if (destination.sectionId) {
                                this.router.scrollTo(destination.sectionId)
                            }
                            this.content$.next(page)
                            replaceCrossReferences(page, this.router)
                        },
                    }
                },
            }),
        ]
    }
}

function replaceCrossReferences(div: HTMLDivElement, router: Router) {
    // Navigation links
    const links = div.querySelectorAll('a')
    links.forEach((link) => {
        if (link.href.includes('@nav')) {
            const path = link.href.split('@nav')[1]
            link.href = `${router.basePath}?nav=${path}`
            link.onclick = (e: MouseEvent) => {
                e.preventDefault()
                router.navigateTo({ path })
            }
        }
    })
}

/**
 * The page footer.
 */
export class FooterView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class =
        'w-75 mx-auto mkdocs-FooterView d-flex align-items-center flex-wrap justify-content-center border-top py-1'
    public readonly children: ChildrenLike

    constructor(params?: { sourceName: string; sourceUrl: string }) {
        const baseIconPath = `/api/assets-gateway/webpm/resources/${setup.assetId}/${setup.version}/assets`
        const mkdocs: AnyVirtualDOM = {
            tag: 'div',
            class: 'd-flex align-items-center',
            children: [
                {
                    tag: 'div',
                    innerText: 'Made with',
                },
                {
                    tag: 'div',
                    class: 'mx-2',
                },
                {
                    tag: 'img',
                    src: `${baseIconPath}/mkdocs-ts.svg`,
                    width: 25,
                },
                {
                    tag: 'a',
                    class: 'mx-1',
                    innerText: 'mkdocs-ts',
                    target: '_blank',
                    href: '/apps/@mkdocs-ts/doc',
                },
            ],
        }
        const sources = () => ({
            tag: 'div' as const,
            class: 'd-flex align-items-center px-1 border rounded mx-2 my-1',
            children: [
                {
                    tag: 'i' as const,
                    class: 'fas fa-code-branch',
                },
                {
                    tag: 'a' as const,
                    class: 'mx-1',
                    innerText: params?.sourceName,
                    target: '_blank',
                    href: params?.sourceUrl,
                },
            ],
        })
        this.children = [params ? sources() : undefined, mkdocs]
    }
}

export class FuturePageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor() {
        this.children = [
            parseMd({
                src: `
<note level="hint">
<i class="fas fa-spinner fa-spin"></i> The page is currently loading, and the content will update shortly. 
In the meantime, feel free to explore other sections of the document.
</note>                
                `,
            }),
        ]
    }
}

export class UnresolvedPageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ path }: { path: string }) {
        this.children = [
            parseMd({
                src: `
<note level="warning">
The page at location \`${path}\` does not exist. Please try navigating to other sections of the document.
</note>                
                `,
            }),
        ]
    }
}
