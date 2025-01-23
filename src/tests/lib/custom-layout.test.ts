import { filter, firstValueFrom, from, map, skip } from 'rxjs'
import {
    isResolvedTarget,
    Navigation,
    parseMd,
    Router,
    DefaultLayout,
} from '../../lib'
import { shareReplay } from 'rxjs/operators'
import {
    AnyVirtualDOM,
    child$,
    ChildrenLike,
    render,
    replace$,
    VirtualDOM,
} from 'rx-vdom'
import { expectTruthy, mockMissingUIComponents } from './utils'

export interface Quote {
    kind: 'quote'
    quote: string
    author: string
}
export interface Text {
    kind: 'text'
    text: string
}
export interface Picture {
    kind: 'picture'
    picture: string
    width: string
}
export interface Paragraph {
    kind: 'paragraph'
    paragraph: string
}

export type SlideElement = Quote | Picture | Paragraph | Text

export interface Slide {
    title: string
    subTitle: SlideElement
    elements: SlideElement[]
}

export type NavLayout = Slide
export type NavHeader = DefaultLayout.NavHeader

const headerWelcome: NavHeader = {
    icon: { tag: 'i', class: 'fas fa-home' },
}
const headerEinstein: NavHeader = {
    icon: { tag: 'i', class: 'fas fa-atom' },
}
const headerCurrie: NavHeader = {
    icon: { tag: 'i', class: 'fas fa-radiation' },
}
const headerNewton: NavHeader = {
    icon: { tag: 'i', class: 'fas fa-apple-alt' },
}

const slideWelcome: Slide = {
    title: 'The Minds That Shaped Physics',
    subTitle: {
        kind: 'quote',
        quote: 'The most incomprehensible thing about the universe is that it is comprehensible.',
        author: 'A. Einstein',
    },
    elements: [
        {
            kind: 'picture',
            picture: '../assets/solar-eclipse.png',
            width: '50%',
        },
        {
            kind: 'text',
            text:
                'From the motion of planets to the secrets of quantum mechanics—explore the theories that shaped ' +
                'our world.',
        },
    ],
}

const slideEinstein: Slide = {
    title: 'Albert Einstein',
    subTitle: {
        kind: 'quote',
        quote: 'Imagination is more important than knowledge.',
        author: 'A. Einstein',
    },
    elements: [
        {
            kind: 'picture',
            picture: '../assets/Albert_Einstein_sticks_his_tongue_1951.jpg',
            width: '50%',
        },
        {
            kind: 'paragraph',
            paragraph: `
*  Theory of General Relativity (1915),
*  Photoelectric Effect (Nobel Prize 1921),
*  On the Electrodynamics of Moving Bodies,
*  Does the Inertia of a Body Depend Upon Its Energy Content?,
`,
        },
    ],
}
const slideCurie: Slide = {
    title: 'Marie Curie',
    subTitle: {
        kind: 'quote',
        quote: 'Nothing in life is to be feared, it is only to be understood.',
        author: 'M. Curie',
    },
    elements: [
        {
            kind: 'picture',
            picture: '../assets/Marie_Curie_c1920.jpg',
            width: '50%',
        },
        {
            kind: 'paragraph',
            paragraph: `
*  Discovery of **Radium** and **Polonium**,
*  First woman to win not only one but two **Nobel Prizes** (Physics 1903, Chemistry 1911),
*  Defined the science of radioactivity,
*  Pioneered medical applications of radiation,
`,
        },
    ],
}
const slideNewton: Slide = {
    title: 'Isaac Newton',
    subTitle: {
        kind: 'quote',
        quote: 'If I have seen further, it is by standing on the shoulders of giants.',
        author: 'I. Newton',
    },
    elements: [
        {
            kind: 'picture',
            picture: '../assets/GodfreyKneller-IsaacNewton-1689.jpg',
            width: '50%',
        },
        {
            kind: 'paragraph',
            paragraph: `
*  Three Laws of Motion (Principia, 1687),
*  Universal Gravitation Theory,
*  Philosophiæ Naturalis Principia Mathematica (1687),
    `,
        },
    ],
}

const navigation: Navigation<NavLayout, NavHeader> = {
    name: 'Welcome',
    header: headerWelcome,
    layout: slideWelcome,
    routes: {
        '/einstein': {
            name: 'Einstein',
            layout: slideEinstein,
            header: headerEinstein,
        },
        '/curie': {
            name: 'Curie',
            layout: slideCurie,
            header: headerCurrie,
        },
        '/newton': {
            name: 'Newton',
            layout: slideNewton,
            header: headerNewton,
        },
    },
}

const getNav$ = (router: Router) => {
    // Router is not specialized: the implementation does not need layout specific data
    const tree = router.explorerState
    return router.target$.pipe(
        map((target) => {
            const treeNode = tree.getNodeResolved(target.path)
            const treeParentNode = tree.getParent(treeNode.id)
            const children = treeParentNode?.resolvedChildren() || []
            const index = children.indexOf(treeNode)
            return {
                down: treeNode.children
                    ? treeNode.resolvedChildren()[0].id
                    : undefined,
                up: children[0] === treeNode ? treeParentNode?.id : undefined,
                left: children[index - 1]?.id,
                right: children[index + 1]?.id,
            }
        }),
        shareReplay({ refCount: true, bufferSize: 1 }),
    )
}

type Direction = 'up' | 'down' | 'left' | 'right'
const navItem = (
    direction: Direction,
    nav: { up?: string; down?: string; left?: string; right?: string },
    router: Router<NavLayout, NavHeader>,
): AnyVirtualDOM => {
    const target = nav[direction]
    if (!target) {
        return { tag: 'div' }
    }
    return {
        tag: 'button',
        class: `navItem ${direction} btn btn-sm btn-dark mx-1`,
        children: replace$({
            policy: 'replace',
            source$: from(router.getNav({ path: target })),
            vdomMap: (navNode) => {
                if (navNode === 'not-found') {
                    return []
                }
                const icon =
                    typeof navNode.header === 'function'
                        ? navNode.header({ router }).icon
                        : navNode.header?.icon
                return [
                    { tag: 'i', class: `fas fa-chevron-${direction}` },
                    { tag: 'i', class: `mx-2` },
                    { tag: 'i', innerText: navNode.name },
                    { tag: 'i', class: `mx-1` },
                    { tag: 'div', children: [icon] },
                ]
            },
        }),
        onclick: () => {
            router && router.fireNavigateTo({ path: target })
        },
    }
}

class NavBar implements VirtualDOM<'div'> {
    static readonly CssSelector = 'NavBar'
    public readonly tag = 'div'
    public readonly class = `${NavBar.CssSelector} d-flex align-items-center w-100 border-top py-1`
    public readonly children: ChildrenLike

    constructor({ router }) {
        const nav$ = getNav$(router)
        this.children = ['up', 'down', 'left', 'right'].map(
            (direction: Direction) =>
                child$({
                    source$: nav$,
                    vdomMap: (nav) => navItem(direction, nav, router),
                }),
        )
    }
}

const quote = (element: Quote): AnyVirtualDOM => {
    return {
        tag: 'div',
        class: 'border-start p-2',
        children: [
            { tag: 'i', innerText: `\"${element.quote}\"` },
            { tag: 'div', innerText: `--${element.author}` },
        ],
    }
}
const picture = (element: Picture): AnyVirtualDOM => {
    return {
        tag: 'div',
        class: 'w-100 flex-grow-1 d-flex justify-content-center py-1',
        style: { minHeight: '0px' },
        children: [
            {
                tag: 'img',
                src: element.picture,
                style: { maxHeight: '100%', maxWidth: '100%' },
            },
        ],
    }
}
const text = (element: Text): AnyVirtualDOM => {
    return {
        tag: 'div',
        class: 'd-flex w-75 mx-auto',
        style: { fontSize: '1.5rem' },
        children: [
            { tag: 'div', class: 'text-center w-100', innerText: element.text },
        ],
    }
}
const paragraph = (element: Paragraph): AnyVirtualDOM => ({
    tag: 'div' as const,
    class: 'd-flex w-100 justify-content-center py-3',
    children: [parseMd({ src: element.paragraph })],
})

const factory = (element: SlideElement): AnyVirtualDOM => {
    if (element.kind === 'quote') {
        return quote(element)
    }
    if (element.kind === 'picture') {
        return picture(element)
    }
    if (element.kind === 'text') {
        return text(element)
    }
    return paragraph(element)
}

class SlideView implements VirtualDOM<'div'> {
    static readonly CssSelector = 'SlideView'
    public readonly tag = 'div'
    public readonly class = `${SlideView.CssSelector} flex-grow-1 d-flex flex-column w-100`
    public readonly style = { minHeight: '0px' }
    public readonly children: ChildrenLike

    constructor({ slide }: { slide: Slide }) {
        const header: AnyVirtualDOM = {
            tag: 'div',
            children: [
                { tag: 'h1', innerText: slide.title },
                { tag: 'h2', children: [factory(slide.subTitle)] },
            ],
        }
        const content: AnyVirtualDOM = {
            tag: 'div',
            class: 'd-flex flex-column flex-grow-1',
            style: { minHeight: '0px' },
            children: slide.elements.map((elem) => factory(elem)),
        }
        this.children = [header, content]
    }
}

export class PresentationLayout {
    static readonly CssSelector = 'CustomLayout'
    public readonly tag = 'div'
    public readonly class = `${PresentationLayout.CssSelector} h-100 w-100 d-flex flex-column bg-light p-5 rounded`
    public readonly children: ChildrenLike

    constructor({ router }: { router: Router<NavLayout, NavHeader> }) {
        this.children = [
            child$({
                source$: router.target$.pipe(
                    filter((target) => isResolvedTarget(target)),
                ),
                vdomMap: ({ node }) => new SlideView({ slide: node.layout }),
            }),
            new NavBar({ router }),
        ]
    }
}

//---------------------------
// Tests
//---------------------------

function setup() {
    mockMissingUIComponents()
    const router = new Router({ navigation, scrollingDebounceTime: 0 })
    const view = new PresentationLayout({
        router,
    })
    document.body.innerHTML = ''
    document.body.append(render(view))
    return router
}

describe('Test custom layout', () => {
    let router: Router<NavLayout, NavHeader>
    beforeAll(() => {
        router = setup()
    })
    it('Should correctly navigate', async () => {
        await router.navigateTo({ path: '/' })
        const home = await firstValueFrom(router.target$)
        if (!isResolvedTarget(home)) {
            throw new Error(`Node at path '/' should be resolved`)
        }
        expectTruthy(
            document.querySelector<HTMLElement>(
                `.${PresentationLayout.CssSelector}`,
            ),
        )
        expectTruthy(
            document.querySelector<HTMLElement>(`.${SlideView.CssSelector}`),
        )
        expectTruthy(
            document.querySelector<HTMLElement>(`.${NavBar.CssSelector}`),
        )
        const buttonsHome = document.querySelectorAll<HTMLElement>(`button`)
        expect(buttonsHome).toHaveLength(1)
        expect(buttonsHome[0].classList.contains('down')).toBeTruthy()
        buttonsHome[0].dispatchEvent(new MouseEvent('click'))

        const einstein = await firstValueFrom(router.target$.pipe(skip(1)))
        expect(einstein.path).toBe('/einstein')
        const buttonsEinstein = document.querySelectorAll<HTMLElement>(`button`)
        expect(buttonsEinstein).toHaveLength(2)
        expect(buttonsEinstein[0].classList.contains('up')).toBeTruthy()
        expect(buttonsEinstein[1].classList.contains('right')).toBeTruthy()
    })
})
