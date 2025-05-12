
# Custom Layout

This tutorial demonstrates how to create custom layouts using {{mkdocs-ts}}. 
We will design a **PowerPoint-style** application that allows users to navigate through slides showcasing famous 
physicists.

Below is a preview of the final application in action:

<cell-output cell-id="app-start" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;"> </cell-output>


<note level="hint">
This scenario is fully implemented in TypeScript as a test of {{mkdocs-ts}}, you can find it 
<github-link target="tests.custom-layout">here</github-link>.
</note>

## Requirements 

Before we begin, let's install the required dependencies:

<js-cell>
const version = "{{mkdocs-version}}"

const { MkDocs, rxjs, clients } = await webpm.install({
    esm:[
        `mkdocs-ts#${version} as MkDocs`, 
        'rxjs#^7.8.2 as rxjs',
    ],
    css: [
        'bootstrap#5.3.3~bootstrap.min.css',
        `mkdocs-ts#${version}~assets/mkdocs-light.css`,
        'fontawesome#5.12.1~css/all.min.css',
    ]
})
display({MkDocs, rxjs, clients})
</js-cell>


##  Data Model

A custom layout requires a structured `TLayout` (for slide content) and `THeader` (for navigation)
involved in <api-link target='Navigation'></api-link> node.

### `TLayout`

Each slide consists of:

*  A **title** and **subtitle** (with a quote).
*  A **picture** and **text elements** (description of contributions).

This is for example the data of the **Marie Curie**'s slide:

<js-cell>
const slideCurie = {
    title: 'Marie Curie',
    subTitle: {   
        quote: 'Nothing in life is to be feared, it is only to be understood.',
        author: 'M. Curie'
    },
    elements: [
        {   
            picture: '../assets/Marie_Curie_c1920.jpg',
            width: '50%'
        },
        {   
            paragraph: `
*  Discovery of **Radium** and **Polonium**,
*  First woman to win not only one but two **Nobel Prizes** (Physics 1903, Chemistry 1911),
*  Defined the science of radioactivity,
*  Pioneered medical applications of radiation,
`
        }
    ]
}
</js-cell>

The other slides are defined in the following expandable note.

<note level="abstract" expandable="true" mode="stateful" title="Slides">
<js-cell>
const slides = {
    Welcome: {
        title: 'The Minds That Shaped Physics',
        subTitle: {   
            quote: 'The most incomprehensible thing about the universe is that it is comprehensible.',
            author: 'A. Einstein'
        },
        elements: [
            {   
                picture: '../assets/solar-eclipse.png',
                width: '50%',
            },
            {   
                text: 'From the motion of planets to the secrets of quantum mechanics—explore the theories that shaped ' +
                'our world.',
            }
        ]
    },
    Einstein: {
        title: 'Albert Einstein',
        subTitle: {   
            quote: 'Imagination is more important than knowledge.',
            author: 'A. Einstein'
        },
        elements: [
            {   
                picture: '../assets/Albert_Einstein_sticks_his_tongue_1951.jpg',
                width: '50%'
            },
            {   
                paragraph: `
*  Theory of General Relativity (1915),
*  Photoelectric Effect (Nobel Prize 1921),
*  On the Electrodynamics of Moving Bodies,
*  Does the Inertia of a Body Depend Upon Its Energy Content?,
`
            }
        ]
    },
    Curie: slideCurie,
    Newton: {
        title: 'Isaac Newton',
        subTitle: {   
            quote: 'If I have seen further, it is by standing on the shoulders of giants.',
            author: 'I. Newton'
        },
        elements: [
            {   
                picture: '../assets/GodfreyKneller-IsaacNewton-1689.jpg',
                width: '50%'
            },
            {   
                paragraph: `
*  Three Laws of Motion (Principia, 1687),
*  Universal Gravitation Theory,
*  Philosophiæ Naturalis Principia Mathematica (1687),
    `
            }
        ]
    },
    Feynman: {
        title: 'Richard Feynman',
        subTitle: {   
            quote: 'I think I can safely say that nobody understands quantum mechanics.',
            author: 'R. Feynman'
        },
        elements: [
            {   
                picture: '../assets/RichardFeynman-PaineMansionWoods1984_copyrightTamikoThiel_bw.jpg',
                width: '50%'
            },
            {   
                paragraph: `
*  Developed Feynman Diagrams,
*  Contributions to Quantum Electrodynamics (QED),
*  Space-Time Approach to Quantum Electrodynamics (1949),
    `
            }
        ]
    }
}
</js-cell>
</note>

### `THeader`

It defines the structure of the navigation node's header, representing an icon from 
<ext-link target='fontawesome'>Font Awesome</ext-link>:

<js-cell>
const headers = {
    Welcome: { icon: {tag:'i', class:'fas fa-home'}},
    Einstein: { icon: {tag:'i', class:'fas fa-atom'}},
    Curie: { icon: {tag:'i', class:'fas fa-radiation'}},
    Newton: { icon: {tag:'i', class:'fas fa-apple-alt'}},
    Feynman: { icon: {tag:'i', class:'fas fa-code-branch'}}
}
</js-cell>

<note level="hint">
We could have here defined the icon using only the relevant class name (*e.g.* `Welcome: 'fa-home'`}.
For reasons that will be detailed in the <cross-link target="composite-layout">Composite Layout</cross-link> tutorial,
we align the API with the one used for header in the default layout 
(see <api-link target="DefaultLayout.NavHeaderSpec"></api-link>).
</note>


## Navigation System

The navigation system includes 4 transitions between the slides defined in the navigation:
*  **left**: navigate to the previous sibling.
*  **right**: navigate to the next sibling.
*  **up**: navigate to the parent.
*  **down**: navigate to the first child.

### Navigation Paths

The available navigation paths required for the **left**/**right**/**up**/**down** transitions need to be updated at 
each router's re-location, exposed through <api-link target="Router.target$"></api-link>.

The next cell finds out the path of the eventual parent (`up`), siblings (`left` & `right`), and first child (`down`),
from `router.target$`:

<js-cell>

const getNav$ = (router) => {
    const tree = router.explorerState
    return router.target$.pipe(
        rxjs.map( (target) => {
            if(!MkDocs.isResolvedTarget(target)){ 
                // If the path is not resolved, no items displayed
                return {}
            }
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
        rxjs.shareReplay({refCount: true, bufferSize: 1}),
    )
}
</js-cell>

It constructs and returns an <ext-link target="Observable">Observable</ext-link>: each time `router.target$` is updated, 
the returned `Observable` emits a new object with the 4 corresponding transition paths.


<note level="question" title="explorerState?">
When instantiating a <api-link target="Router"></api-link> instance, one of the first action realized is the 
initialization of a <api-link target="Router.explorerState"></api-link> from the given
<api-link target="Navigation"></api-link>.

This is a convenient structure to query resolved nodes.
Their IDs are the corresponding path computed from the input `Navigation`.
</note>


### Navigation Bar

The navigation bar dynamically updates based on available links for `top`/`bottom`/`left`/`right` navigation.

Let's start by implementing an item for the navigation:


<js-cell>
const navItem = (direction, nav, router) => {
    if(!nav[direction]){
        return { tag: 'div' }
    }
    return {
        tag: 'button',
        class: `btn btn-sm btn-dark mx-1`,
        children: {
            policy: 'replace',
            source$: rxjs.from(router.getNav({path:nav[direction]})),
            vdomMap: (navNode) => [
                { tag: 'i', class: `fas fa-chevron-${direction}`},
                { tag: 'i', class: `mx-2`},
                { tag: 'i', innerText: navNode.name},
                { tag: 'i', class: `mx-1`},
                navNode.header.icon,
            ] 
        },  
        onclick: () => {
            router && router.fireNavigateTo({path:nav[direction]})
        }
    }
}
</js-cell>

This function takes a direction (`'top' | 'bottom' | 'left' | 'right'`), and navigation object 
(`{top?:string, bottom?:string, left?:string, right?:string}` - `string` being the corresponding path) 
and a router as arguments.

The returned navigation item is a **button** that triggers navigation when clicked.
It connects to <api-link target='Router.getNav'></api-link>, a promise resolving the navigation node for the
given path. The `vdomMap` is then called upon resolution, returning the (virtual) DOM children.

Then, the navigation bar is implemented:

<js-cell>
class NavBar{
    constructor({router}){
        Object.assign(this, {
            tag: 'div',
            class: 'd-flex align-items-center w-100 border-top py-1'
        })
        this.children = ['up', 'down', 'left', 'right'].map((direction) => ({
            source$: getNav$(router),
            vdomMap: (nav) => navItem(direction, nav, router)
        }))
    }
}
</js-cell>

Here is a short description of the reactive flows involved:
*  At first, the `navBar` is a `div` featuring a couple of class tokens and four children
  (associated to `up`, `down`, *etc.* ) - only **placeholders** before the first update of `nav$`.
*  When the router navigates to a given path, the `nav$` object emit the updated navigation object.
   The placeholders are replaced with the **interactive buttons**, created using the `navItem(direction, nav, router)`.

## Slides View

Each slide consists of **text**, **picture**, **quotes**, **paragraph**.
We define below the `factory` function for these elements:

<js-cell>
const quote = (element) => {
    return {
        tag: 'div',
        class: 'border-start p-2',
        children: [
           { tag:'i', innerText: `\"${element.quote}\"` },
           { tag:'div', innerText: `--${element.author}`}
        ]
    }
}
const picture = (element) => {
    return {
        tag:'div',
        class: 'w-100 flex-grow-1 d-flex justify-content-center py-1',
        style: { minHeight: '0px' },
        children:[{ tag: 'img', src: element.picture, style: { maxHeight: '100%' , maxWidth: '100%'}}]
    }
}
const text = (element) => {
    return {
        tag:'div',
        class: 'd-flex w-75 mx-auto',
        style: { fontSize: '1.5rem' },
        children:[{ tag: 'p', class: 'text-center w-100', innerText: element.text }]
    }
}
const paragraph = (element) => ({
    tag:'div',
    class: 'd-flex w-100 justify-content-center py-3',
    children:[MkDocs.parseMd({src: element.paragraph})]
})

const factory = (element) => {
    if(element['quote']){
        return quote(element)
    }
    if(element['picture']){
        return picture(element)
    }
    if(element['text']){
        return text(element)
    }
    if(element['paragraph']){
        return paragraph(element)
    }
}
</js-cell>

Leading to the implementation of the slide view, defining **header** & **content** from the signal 
<api-link target="Router.target$"></api-link>:

<js-cell>

class SlideView{
    constructor({slide}){
        Object.assign(this,{
            tag: 'div',
            class: 'flex-grow-1 d-flex flex-column w-100',
            style: { minHeight: '0px' }
        })
        const header = {
            tag: 'header',
            children:[
                { tag: 'h1', innerText: slide.title },
                { tag: 'h2', children:[ factory(slide.subTitle) ] }
            ]
        }
        const content = {
            tag: 'div',
            class: 'd-flex flex-column flex-grow-1',
            style: { minHeight:'0px'},
            children: slide.elements.map( elem => factory(elem) )
        }
        this.children = [ header, content ]
    }
}
</js-cell>


## Custom Layout

The layout simply wrap the previously defined `SlideView` & `NavBar`:

<js-cell>
const errorView = (path, reason, router) => MkDocs.parseMd({ 
    src:`
<note level="warning">
The slide at location \`${path}\` can not be resolved: \`${reason}\`

[Home](@nav/)
</note>`,
    router 
})

class CustomLayout{
    constructor({router}){
        Object.assign(this,{
            tag: 'div',
            class: 'h-100 w-100 d-flex flex-column bg-light p-5 rounded',
        })
        this.children = [ 
            {   
                source$: router.target$,
                vdomMap: (target) => {
                    if(!MkDocs.isResolvedTarget(target)){
                        return errorView(target.path, target.reason, router)
                    }
                    return new SlideView({slide: target.node.layout})
                }
            },
            new NavBar({router})      
        ]
    }
}
</js-cell>


<note level="warning">
For the sake of simplicity, the above cell does not account for the case of 
<api-link target="UnresolvedTarget"></api-link> that may be emitted from 
<api-link target="Router.target$"></api-link>.
</note>


## Navigation & App

We can finally define the navigation and application:

<js-cell cell-id="app">
const navigation = { 
    name: 'Welcome',
    header: headers.Welcome,
    layout: slides.Welcome,
    routes: Object.keys(slides).filter( k => k !== 'Welcome').reduce((acc, name) => ({
        ...acc,
       [`/${name}`]: {
            name,
            header: headers[name],
            layout: slides[name]
        }
    }), {})
}

const { withNavBar } = await load("/tutorials/basics/code-utils")

const customView = await withNavBar(navigation, ({router}) => {
    return new CustomLayout({
        router,
    })
})
display(customView)

</js-cell>

<cell-output cell-id="app" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;">
</cell-output>

<note level="info" title="Top View" expandable="true" mode="stateful">
This cell is associated with a deported view port: the one displayed at the top of this page:

<js-cell cell-id="app-start">
display(customView)
</js-cell>
</note>
