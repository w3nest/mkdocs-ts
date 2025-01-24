import {
    ChildrenLike,
    VirtualDOM,
    RxHTMLElement,
    child$,
    AnyVirtualDOM,
} from 'rx-vdom'
import { Target, isResolvedTarget, Router } from '../router'
import { parseMd, parseMdFromUrl, replaceLinks } from '../markdown'
import {
    distinctUntilChanged,
    filter,
    from,
    map,
    Observable,
    of,
    ReplaySubject,
    switchMap,
    take,
    tap,
} from 'rxjs'
import { setup } from '../../auto-generated'
import { NavLayout } from './default-layout.view'
import { ContextTrait, NoContext } from '../context'

interface ContentTrait {
    layout: NavLayout
}
function hasContentViewTrait(node: unknown): node is ContentTrait {
    const layout = (node as ContentTrait).layout
    if (!layout) {
        return false
    }
    if (typeof layout === 'function') {
        return true
    }
    if (typeof layout === 'string') {
        return true
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return layout.content !== undefined
}

/**
 * The main content of the page.
 */
export class PageView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-PageView'
    public readonly router: Router<NavLayout>
    public readonly tag = 'div'
    public readonly class = `${PageView.CssSelector} w-100 mkdocs-ts-page text-justify`
    public readonly children: ChildrenLike

    public readonly content$ = new ReplaySubject<HTMLElement>(1)
    public readonly filter?: (target: Target) => boolean
    public readonly connectedCallback: (html: RxHTMLElement<'div'>) => void

    constructor(
        params: {
            router: Router<NavLayout>
            filter?: (target: Target) => boolean
        },
        ctx?: ContextTrait,
    ) {
        Object.assign(this, params)
        ctx = ctx ?? new NoContext()
        const context = ctx.start('new PageView', ['PageView'])
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
                    tap((t) => {
                        context.info(`PageUpdate: Received target ${t.path}`, t)
                        if ('reason' in t) {
                            context.info(`PageUpdate: target is ${t.reason}`)
                        }
                    }),
                    filter((target) => {
                        return isResolvedTarget(target)
                    }),
                    distinctUntilChanged(
                        (prev, current) => prev.path === current.path,
                    ),
                    tap((t) => {
                        context.info(`PageUpdate: Distinct target ${t.path}`)
                    }),
                    filter(filterFct),
                    filter((target) => {
                        return hasContentViewTrait(target.node)
                    }),
                    switchMap((target: Target & { node: ContentTrait }) => {
                        context.info('PageUpdate: New target to display')
                        const contentGetter =
                            typeof target.node.layout === 'function' ||
                            typeof target.node.layout === 'string'
                                ? target.node.layout
                                : target.node.layout.content

                        const html =
                            typeof contentGetter === 'string'
                                ? parseMdFromUrl({
                                      url: contentGetter,
                                      router: this.router,
                                  })
                                : contentGetter({
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
                            this.content$.next(
                                // This is the `html` content returned by `destination.html`
                                page.firstElementChild as HTMLElement,
                            )
                            replaceLinks({
                                router: this.router,
                                elem: page,
                                fromMarkdown: false,
                            })
                        },
                    }
                },
            }),
        ]
        context.exit()
    }
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
