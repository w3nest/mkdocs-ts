import {
    AnyVirtualDOM,
    ChildrenLike,
    VirtualDOM,
    RxHTMLElement,
    child$,
} from 'rx-vdom'
import { Destination, Router } from '../router'
import { parseMd } from '../markdown'
import { filter } from 'rxjs'

/**
 * The main content of the page.
 */
export class PageView implements VirtualDOM<'div'> {
    public readonly router: Router
    public readonly tag = 'div'
    public readonly class = 'mkdocs-PageView w-100 mkdocs-ts-page text-justify'
    public readonly children: ChildrenLike

    public readonly filter?: (destination: Destination) => boolean
    public readonly connectedCallback: (html: RxHTMLElement<'div'>) => void

    constructor(params: {
        router: Router
        filter?: (destination: Destination) => boolean
    }) {
        Object.assign(this, params)
        const filterFct = this.filter || (() => true)
        this.children = [
            child$({
                source$: this.router.currentPage$.pipe(filter(filterFct)),
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
    public readonly class = 'w-100 mkdocs-FooterView d-flex align-items-center'
    public readonly children: ChildrenLike

    public readonly style = {
        padding: '0.9em',
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
