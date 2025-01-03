import { BehaviorSubject, firstValueFrom } from 'rxjs'
import {
    DefaultLayout,
    headingId,
    isResolvedTarget,
    Navigation,
    parseMd,
    Router,
    segment,
} from '../../lib'
import { mockMissingUIComponents, navigateAndAssert } from './utils'
import { render } from 'rx-vdom'
import { NavigationView, PageView, TOCView } from '../../lib/default-layout'

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
    },
}

describe('Nav, Page & TOC', () => {
    let router: Router<TLayout, THeader>
    beforeAll(() => {
        mockMissingUIComponents()
        router = new Router({ navigation })
        const view = new DefaultLayout.View({
            router,
            bookmarks$: new BehaviorSubject(['/', '/md']),
        })
        document.body.append(render(view))
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
})
