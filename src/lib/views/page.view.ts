import {
    AnyVirtualDOM,
    ChildrenLike,
    VirtualDOM,
    RxHTMLElement,
} from '@youwol/rx-vdom'
import { Router } from '../router'

/**
 * The main content of the page.
 */
export class PageView implements VirtualDOM<'div'> {
    public readonly router: Router
    public readonly tag = 'div'
    public readonly class = 'w-100 mkdocs-ts-page'
    public readonly children: ChildrenLike

    public readonly connectedCallback: (html: RxHTMLElement<'div'>) => void

    constructor(params: { router: Router }) {
        Object.assign(this, params)
        this.children = [
            {
                source$: this.router.currentPage$,
                vdomMap: ({ html, sectionId }) => {
                    return {
                        tag: 'div',
                        children: [html as AnyVirtualDOM],
                        connectedCallback: (page) => {
                            this.router.scrollTo(sectionId)
                            this.router.setDisplayedPage({ page })
                            replaceCrossReferences(page, this.router)
                        },
                    }
                },
            },
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
export class PageFooterView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 mkdocs-ts-footer d-flex align-items-center'
    public readonly children: ChildrenLike

    public readonly style = {
        padding: '0.9rem',
        backgroundColor: 'black',
        color: 'white',
    }
    constructor() {
        this.children = [
            {
                tag: 'div',
                class: 'flex-grow-1',
            },
            {
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
                        tag: 'a',
                        innerText: 'mkdocs-ts',
                        target: '_blank',
                        href: 'https://github.com/youwol/mkdocs-ts',
                    },
                ],
            },
            {
                tag: 'div',
                style: {
                    flexGrow: 2,
                },
            },
        ]
    }
}
