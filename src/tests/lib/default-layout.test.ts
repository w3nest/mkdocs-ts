import { BehaviorSubject, filter, firstValueFrom } from 'rxjs'
import {
    DefaultLayout,
    headingId,
    isResolvedTarget,
    Navigation,
    parseMd,
    Router,
    segment,
} from '../../lib'
import { expectTruthy, mockMissingUIComponents } from './utils'
import { render } from 'rx-vdom'
import {
    DisplayOptions,
    NavigationView,
    PageView,
    TOCView,
} from '../../lib/default-layout'
import {
    ExpandableTocColumn,
    ToggleSidePanelButton,
} from '../../lib/default-layout/small-screen.view'

type TLayout = DefaultLayout.NavLayout
type THeader = DefaultLayout.NavHeader

const navigation: Navigation<TLayout, THeader> = {
    name: 'Home',
    layout: {
        content: () => {
            return {
                tag: 'div' as const,
                children: [
                    {
                        tag: 'h1',
                        id: 'home',
                        innerText: 'Home',
                    },
                    {
                        tag: 'h2',
                        id: 'section-1',
                        innerText: 'Section 1',
                    },
                    {
                        tag: 'h2',
                        id: 'section-2',
                        innerText: 'Section 2',
                    },
                    {
                        tag: 'a',
                        innerText: 'An internal link',
                        href: '@nav/md.section-1',
                    },
                ],
            }
        },
    },
    routes: {
        [segment('/md')]: {
            name: 'Markdown',
            layout: {
                content: ({ router }) => {
                    return parseMd({
                        src: `
# Markdown

## Section 1

## Section 2                        
                        `,
                        router,
                    })
                },
            },
        },
        [segment('/no-toc')]: {
            name: 'No TOC',
            layout: {
                toc: 'disabled',
                content: ({ router }) => {
                    return { tag: 'div' }
                },
            },
        },
    },
}

function setup(displayOptions?: Partial<DisplayOptions>) {
    mockMissingUIComponents()
    const router = new Router({ navigation, scrollingDebounceTime: 0 })
    const view = new DefaultLayout.Layout({
        router,
        bookmarks$: new BehaviorSubject(['/', '/md']),
        displayOptions,
    })
    document.body.innerHTML = ''
    document.body.append(render(view))
    return router
}

describe('Nav, Page & TOC', () => {
    let router: Router<TLayout, THeader>
    beforeAll(() => {
        router = setup()
    })

    it('Should display Nav, Page & TOC on load', async () => {
        const node = await firstValueFrom(router.explorerState.selectedNode$)
        expect(node.id).toBe('/')
        const nav = document.querySelector(`.${NavigationView.CssSelector}`)
        expect(nav).toBeTruthy()
        const page = document.querySelector(`.${PageView.CssSelector}`)
        expect(page).toBeTruthy()
        const toc = document.querySelector(`.${TOCView.CssSelector}`)
        expect(toc).toBeTruthy()
    })
    it("Navigate to '/.home'", async () => {
        await router.navigateTo({ path: '/', sectionId: 'home' })
        const title = document.querySelector('h1')
        expect(title?.innerText).toBe('Home')
        expect(title?.id).toBe('home')
        const target = await firstValueFrom(router.target$)
        if (!isResolvedTarget(target)) {
            throw new Error(`Node at path '/.home' should be resolved`)
        }
        expect(target.sectionId).toBe('home')
    })
    it("Navigate to '/md.section-1'", async () => {
        /**
         * When parsing MD, heading ids are in the form 'mk-head-${sanitizedId(...)}'.
         * Here we make sure that 'mk-head' is optional.
         */
        await router.navigateTo({ path: '/md', sectionId: 'section-1' })
        const title = document.querySelector('h2')
        expect(title?.innerHTML).toBe('Section 1')
        expect(title?.id).toBe(headingId('section-1'))
        const target = await firstValueFrom(router.target$)
        if (!isResolvedTarget(target)) {
            throw new Error(`Node at path '/md.section-1' should be resolved`)
        }
        expect(target.sectionId).toBe('section-1')
    })

    it("Navigate to '/md.section-1' with TOC click", async () => {
        await router.navigateTo({ path: '/md' })
        const toc = expectTruthy(
            document.querySelector<HTMLElement>(`.${TOCView.CssSelector}`),
        )
        const links = Array.from(toc.querySelectorAll('a'))
        expect(links).toHaveLength(3)
        links[1].dispatchEvent(new MouseEvent('click'))
        expect(window.location.href).toBe('http://localhost/?nav=/md.section-1')
    })
})

describe('TOC expandable', () => {
    let router: Router<TLayout, THeader>
    beforeAll(() => {
        router = setup({ forceTocDisplayMode: 'hidden' })
    })
    it('Should display TOC menu on load', async () => {
        await firstValueFrom(router.explorerState.selectedNode$)
        const toc = document.querySelector(
            `.${ExpandableTocColumn.CssSelector}`,
        )
        expect(toc).toBeTruthy()
        const menu = document.querySelector(
            `.${ExpandableTocColumn.CssSelector} .${ToggleSidePanelButton.CssSelector}`,
        )
        expect(menu).toBeTruthy()
    })
    it('Should not display TOC menu on /no-toc', async () => {
        await router.navigateTo({ path: '/no-toc' })
        const toc = document.querySelector(
            `.${ExpandableTocColumn.CssSelector}`,
        )
        expect(toc).toBeTruthy()
        const menu = document.querySelector(
            `.${ExpandableTocColumn.CssSelector} .${ToggleSidePanelButton.CssSelector}`,
        )
        expect(menu).toBeFalsy()
    })
})

describe('Page', () => {
    let router: Router<TLayout, THeader>
    beforeAll(() => {
        router = setup()
    })
    it('Should correctly navigate on anchor click', async () => {
        await router.navigateTo({ path: '/', sectionId: 'section-2' })
        const target = await firstValueFrom(router.target$)
        if (!isResolvedTarget(target)) {
            throw new Error(`Node at path '/.section-2' should be resolved`)
        }
        const page = expectTruthy(
            document.querySelector<HTMLElement>(`.${PageView.CssSelector}`),
        )
        const anchor = expectTruthy(page.querySelector('a'))
        expect(anchor.innerText).toBe('An internal link')
        anchor.dispatchEvent(new MouseEvent('click'))
        const redirectTarget = await firstValueFrom(
            router.target$.pipe(
                filter((t) => isResolvedTarget(t)),
                filter((t) => t.path === '/md'),
            ),
        )
        expect(redirectTarget.path).toBe('/md')
        expect(redirectTarget.sectionId).toBe('section-1')
        expect(redirectTarget.node.name).toBe('Markdown')
    })
})
