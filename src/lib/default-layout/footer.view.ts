import {
    AnyVirtualDOM,
    child$,
    ChildrenLike,
    CSSAttribute,
    EmptyDiv,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'
import { ReplaySubject } from 'rxjs'
import { AnyNavNode, AnyView, NavNodePromise } from '../navigation.node'
import { plugBoundingBoxObserver } from './common'
import { Router } from '../router'

export class FooterWrapper implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly boundingBox$ = new ReplaySubject<DOMRect>(1)
    public readonly connectedCallback: (element: RxHTMLElement<'div'>) => void
    constructor(params: {
        footer?: AnyView
        router: Router
        withNav?: boolean
    }) {
        const { router, footer, withNav } = params

        this.children = [
            withNav ? new NavFooterView({ router }) : undefined,
            footer,
        ]
        this.connectedCallback = (elem) => {
            plugBoundingBoxObserver(elem, this.boundingBox$)
        }
    }
}

/**
 * An horizontal banner, usually included in footer, providing links to **Previous** & **Next**.
 * It is included in the default layout's footer when {@link DefaultLayoutParams.navFooter} is turned on.
 *
 * Regarding siblings look up, see {@link Router.siblings$}.
 */
export class NavFooterView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-NavFooterView'
    public readonly tag = 'div'
    public readonly class = `${NavFooterView.CssSelector} d-flex flex-wrap align-items-center w-100 border-top mkdocs-bg-5 mkdocs-lighter mkdocs-text-5 py-2`
    public readonly children: ChildrenLike

    constructor(params: { router: Router }) {
        const { router } = params
        const nav$ = router.siblings$
        const sep = {
            tag: 'div' as const,
            class: 'flex-grow-1',
        }
        this.children = [
            sep,
            child$({
                source$: nav$,
                vdomMap: ({ prev }) => {
                    return prev
                        ? new NavFooterAnchorView({
                              router,
                              direction: 'Previous',
                              node: prev,
                          })
                        : EmptyDiv
                },
            }),
            sep,
            sep,
            child$({
                source$: nav$,
                vdomMap: ({ next }) => {
                    return next
                        ? new NavFooterAnchorView({
                              router,
                              direction: 'Next',
                              node: next,
                          })
                        : EmptyDiv
                },
            }),
            sep,
        ]
    }
}

class NavFooterAnchorView implements VirtualDOM<'a'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-NavFooterAnchorView'
    public readonly tag = 'a'
    public readonly class = `${NavFooterAnchorView.CssSelector} d-flex align-items-center`
    public readonly style: CSSAttribute
    public readonly href: string
    public readonly children: ChildrenLike

    public readonly onclick?: (ev: MouseEvent) => void

    constructor(params: {
        router: Router
        node: AnyNavNode<unknown, unknown>
        direction: 'Previous' | 'Next'
    }) {
        const { router, node, direction } = params
        this.style = {
            textDecoration: 'none',
            textAlign: direction === 'Previous' ? 'left' : 'right',
        }
        this.href = node.id
        const icon: AnyVirtualDOM = {
            tag: 'div',
            class: `fas ${direction === 'Next' ? 'fa-chevron-right' : 'fa-chevron-left'} fa-2x`,
        }
        const text: AnyVirtualDOM = {
            tag: 'div',
            class: `d-flex flex-column mx-4`,
            children: [
                {
                    tag: 'div',
                    innerText: direction,
                    class: 'mkdocs-text-4',
                },
                node instanceof NavNodePromise
                    ? {
                          tag: 'div',
                          class: 'fas fa-spinner fa-spin',
                      }
                    : {
                          tag: 'div',
                          innerText: node.name,
                          style: {
                              fontSize: '1.2rem',
                          },
                      },
            ],
        }
        this.children = direction === 'Next' ? [text, icon] : [icon, text]
        this.onclick = (ev) => {
            ev.preventDefault()
            ev.stopPropagation()
            router.fireNavigateTo(`?nav=${node.id}`)
        }
    }
}
