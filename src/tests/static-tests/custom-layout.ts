import { Navigation, DefaultLayout } from '../../lib'

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

// OK: all kinds have `as const`
const slideWelcome = {
    title: 'The Minds That Shaped Physics',
    subTitle: {
        kind: 'quote' as const,
        quote: 'The most incomprehensible thing about the universe is that it is comprehensible.',
        author: 'A. Einstein',
    },
    elements: [
        {
            kind: 'picture' as const,
            picture: '../assets/solar-eclipse.png',
            width: '50%',
        },
        {
            kind: 'text' as const,
            text:
                'From the motion of planets to the secrets of quantum mechanics—explore the theories that shaped ' +
                'our world.',
        },
    ],
}

// OK: explicitly typed
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

// Not OK: `kind: 'quote'` missing `as const` while no type annotation
const slideCurie = {
    title: 'Marie Curie' as const,
    subTitle: {
        kind: 'quote',
        quote: 'Nothing in life is to be feared, it is only to be understood.',
        author: 'M. Curie',
    },
    elements: [
        {
            kind: 'picture' as const,
            picture: '../assets/Marie_Curie_c1920.jpg',
            width: '50%',
        },
        {
            kind: 'paragraph' as const,
            paragraph: `
*  Discovery of **Radium** and **Polonium**,
*  First woman to win not only one but two **Nobel Prizes** (Physics 1903, Chemistry 1911),
*  Defined the science of radioactivity,
*  Pioneered medical applications of radiation,
`,
        },
    ],
}

// Not OK: typo in `subTitle.qote`
const slideNewton = {
    title: 'Isaac Newton',
    subTitle: {
        kind: 'quote' as const,
        qote: 'If I have seen further, it is by standing on the shoulders of giants.',
        author: 'I. Newton',
    },
    elements: [
        {
            kind: 'picture' as const,
            picture: '../assets/GodfreyKneller-IsaacNewton-1689.jpg',
            width: '50%',
        },
        {
            kind: 'paragraph' as const,
            paragraph: `
*  Three Laws of Motion (Principia, 1687),
*  Universal Gravitation Theory,
*  Philosophiæ Naturalis Principia Mathematica (1687),
    `,
        },
    ],
}

const _: Navigation<NavLayout, NavHeader> = {
    name: 'Welcome',
    layout: slideWelcome,
    routes: {
        '/einstein': {
            name: 'Einstein',
            layout: slideEinstein,
        },
        '/curie': {
            name: 'Curie',
            // @ts-expect-error The "kind:'quote' miss the 'as const'
            layout: slideCurie,
        },
        '/newton': {
            name: 'Newton',
            // @ts-expect-error typo in subTitle (`qote` instead `quote`)
            layout: slideNewton,
        },
    },
}
