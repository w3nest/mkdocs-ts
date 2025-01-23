# Composite Layout

This (short) tutorial covers the <api-link target="CompositeLayout"></api-link> view.
This view acts as a dynamic container that determines and renders a specific 
layout from a predefined set based on the current navigation node.

It builds upon the previous <cross-link target='custom-layout'>Custom Layout</cross-link> tutorial, 
reusing most of its implementation:

<js-cell>
const { 
    SlideView, 
    CustomLayout, 
    MkDocs,
    slides, 
    headers,
    customView }  = await load("/tutorials/basics/custom-layout")

</js-cell>

The presentation was left to:

<js-cell>
display(customView)
</js-cell>

The objective here is to use the default layout of {{mkdocs-ts}} for the first page only, while keeping the 
custom layout for all other pages.

## Factory

The <api-link target="CompositeLayout"></api-link> requires a layout factory, which maps layout **kinds**
to their respective **layout instances**:

<js-cell>
const layoutsFactory = {
    'default': ({router}) => new MkDocs.DefaultLayout.Layout({router}),
    'custom': ({router}) => new CustomLayout({router}),
}
</js-cell>

## Navigation

Each navigation node specifies its layout using the **`kind`** attribute:


<js-cell>
const navigation = { 
    name: 'Welcome',
    header: headers.Welcome,
    layout: {
        kind: 'default',
        content: () => new SlideView({slide: slides.Welcome}),
        toc: 'disabled'
    },
    routes: Object.keys(slides).filter( k => k !== 'Welcome').reduce((acc, name) => ({
        ...acc,
       [`/${name}`]: {
            name,
            header: headers[name],
            layout: { 
                kind: 'custom', 
                ...slides[name] 
            }
        }
    }), {})
}
</js-cell>

This configuration ensures:

*  The root page uses the `default` layout.
 
* All other pages use the `custom` layout.

## Router & App

The router is set up as usual:

<js-cell>
router = new MkDocs.Router({ 
    navigation,
    browserClient: (p) => new MkDocs.MockBrowser(p)
})
</js-cell>

And finally, The <api-link target="CompositeLayout"></api-link> view is instantiated and displayed:

<js-cell cell-id="app">
const { withNavBar } = await load("/tutorials/basics/code-utils")

const compositeView = await withNavBar(navigation, ({router}) => {
    return new MkDocs.CompositeLayout({
        router,
        layoutsFactory: {
            'default': ({router}) => new MkDocs.DefaultLayout.Layout({router}),
            'custom': ({router}) => new CustomLayout({router}),
        },
        onNotFound: 'default',
        onPending: 'default',
    })
})
display(compositeView)

</js-cell>


<cell-output cell-id="app" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;">
</cell-output>

## TypeScript & Type Safety

In TypeScript, {{mkdocs-ts}} ensures type safety across navigation, routers, and views. 
This is particularly important for composite layouts, where mixing elements from different layouts can introduce errors.

For more details, refer to the <cross-link target="typescript">TypeScript page</cross-link>.
