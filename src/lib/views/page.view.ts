import {
    AnyVirtualDOM,
    ChildrenLike,
    VirtualDOM,
    RxHTMLElement,
} from '@youwol/rx-vdom'
import { Router } from '../router'

export class PageView implements VirtualDOM<'div'> {
    public readonly router: Router
    public readonly tag = 'div'
    public readonly class = 'h-100 w-100 overflow-auto'
    public readonly children: ChildrenLike

    public readonly style = {
        fontFamily: 'Lexend, sans-serif',
        transition: 'margin-top 0.5s ease-in-out',
        fontSize: '1.1rem',
        lineHeight: 1.6,
    }

    thisDiv: HTMLElement
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
                        },
                    }
                },
            },
        ]
        this.connectedCallback = (e) => {
            this.router.scrollableElement = e
        }
    }
}

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
