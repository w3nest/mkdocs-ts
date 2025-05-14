# Typescript

{{mkdocs-ts}} places a strong emphasis on type safety, particularly when defining and using 
<api-link target='Navigation'></api-link>. This section explains how TypeScript infers and propagates the 
`TLayout` and `THeader` generic parameters throughout your application.

In most cases, TypeScript automatically infers the correct (expected) types, making development seamless. 
However, there are scenarios where adding explicit type annotations can improve clarity or resolve type mismatches.

This page provides guidance on:

*  When and how to add **type annotations** for better readability and maintainability.

*  How to **debug type-related** issues when inference does not work as expected.

*  Best practices for **minimizing explicit type hints**, ensuring TypeScript correctly deduces derived types while 
   keeping code clean and maintainable.

For practical examples, the {{mkdocs-ts}} GitHub repository contains several compile-time tests illustrating these 
concepts. You can find them in this <github-link target="github-static-tests">folder</github-link>.

<note level="hint"> 
A strict and well-defined type system may sometimes feel restrictive, but it plays a crucial role in 
**preventing errors at compile time**, leading to more robust and maintainable applications. 
</note>


## Defining Types for Navigation

When creating a <api-link target="Navigation"></api-link> object, it's recommended to explicitly specify the 
`TLayout` & `THeader` generics. While TypeScript may infer them correctly, doing so ensures:

*  **Clear intent**, making your code easier to understand.
*  **Easier debugging**, as errors will be localized rather than propagated through the codebase.

### Dynamic Routes

For dynamic routing (<api-link target="DynamicRoutes"></api-link>), explicitly defining the return type using 
<api-link target="LazyRoutesReturn"></api-link> prevents inference issues.

**Example (Incorrect Inference)**

The following code causes a compilation error because the return type of routes is inferred as a `union` rather than 
the expected `Record<string, ...>`:

<code-snippet language="javascript">
type TLayout = DefaultLayout.NavLayout
type THeader = DefaultLayout.NavHeader

const emptyDiv = { tag: 'div' }
const navigation: Navigation<TLayout, THeader> = {
    name: 'home',
    layout: () => emptyDiv,
    // The return type is inferred `{ foo?: ...} | { bar?: ...}` instead `Record<string, ...>`
    routes: ({ path }) => {
        if (path) {
            return {
                '/foo': {
                    name: 'Foo',
                    layout: () => emptyDiv,
                },
            }
        }
        if (!path) {
            return {
                '/bar': {
                    name: 'Bar',
                    layout: () => emptyDiv,
                },
            }
        }
    },
}
</code-snippet>

**Corrected Version**

<code-snippet language="javascript">

const navigation: Navigation<TLayout, THeader> = {
    name: 'home',
    layout: () => emptyDiv,
    routes: ({ path }) : LazyRoutesReturn<TLayout, THeader> => {
        /*Same code*/
    },
}
</code-snippet>

## Working with Layouts

### Default Layout

If you're using the <api-link target="DefaultLayout.Layout"></api-link>, your `navigation` object should be 
typed as follows:

<code-snippet language="javascript">
import { Navigation, DefaultLayout } from 'mkdocs-ts'

const navigation : Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader>

</code-snippet>

This allows **type inference** to work correctly when defining a `Router` and `Layout`:

<code-snippet language="javascript">
import { Router, DefaultLayout } from 'mkdocs-ts'

const router = new Router({navigation})
// Inferred as Router<DefaultLayout.NavLayout, DefaultLayout.NavHeader>

const view = DefaultLayout.Layout({router})
// The default layout do expect a Router<DefaultLayout.NavLayout, DefaultLayout.NavHeader>
</code-snippet>

## Custom Layout

When using a **custom layout**, you need to define new types for the 
layout and header within the navigation object. 
These are equivalent to <api-link target="DefaultLayout.NavLayout"></api-link> and 
<api-link target="DefaultLayout.NavHeaderSpec"></api-link> for the default layout.

**Example**

Explicit type definitions for a custom layout, based on the
<cross-link target="custom-layout">Custom Layout</cross-link> tutorial:

<code-snippet language="javascript" highlightedLines="25 26">
import { AnyView } from 'mkdocs-ts'

export interface Quote{
    quote: string
    author: string
}
export interface Text{
    text: string
}
export interface Picture{
    picture: string
    width: string
}
export interface Paragraph{
    paragraph: string
}

export type SlideElement = Quote | Picture | Paragraph | Text

export interface Slide{
    title: string
    subTitle: SlideElement
    elements: SlideElement[]
}

export type NavLayout = Slide
export type NavHeader = { icon: AnyView }
</code-snippet>

The complete implementation of the example can be found in this 
<github-link target="tests.custom-layout">test suite</github-link>.
Some compile-time errors are discussed in this
<github-link target="static-tests.custom-layout">compile-time test</github-link>.

## Composite Layout

When using <api-link target="CompositeLayout"></api-link>, type manipulation is required to combine multiple layouts
into a unified structure. The class documentation explains how to relate them.

**Example**

Below is an example taken from a <github-link target="static-tests.composite-layout">test</github-link>:  

<code-snippet language="javascript">
import {
    CompositeLayout,
    DefaultLayout,
    LayoutUnion,
    Navigation,
    Router,
} from '../../lib'
import { PresentationLayout, Slide } from '../lib/custom-layout.test'

type LayoutOptionsMap = {
    default: DefaultLayout.NavLayout
    presentation: Slide
}
const navigation: Navigation<
    // LayoutUnion is the helper expressing the global structure from individual counterpart
    LayoutUnion<LayoutOptionsMap>,
    // The two layouts share the same structure regarding headers, otherwise it should be their intersection
    DefaultLayout.NavHeader
> = {
    name: 'Default Example',
    layout: {
        // layout is inferred `{ kind:'default' } & DefaultLayout.NavLayout`
        kind: 'default',
        content: ({ router }) => {
            // `router` is inferred `Router<DefaultLayout.NavLayout, unknown>`
            return document.createElement('div')
        },
    },
    routes: {
        '/presentation': {
            name: 'Presentation Example',
            layout: {
                // `layout` is inferred `{ kind:'presentation' } & Slide`
                kind: 'presentation',
                title: '',
                subTitle: { kind: 'text', text: 'foo' },
                elements: [],
            },
        },
    },
}
// `router` is inferred `Router<LayoutUnion<LayoutOptionsMap>, DefaultLayout.NavHeader>`
const router = new Router({ navigation })
const _ = new CompositeLayout({
    router,
    layoutsFactory: {
        default: ({ router }) => {
            // `router` is inferred `Router<DefaultLayout.NavLayout, DefaultLayout.NavHeader>`
            return new DefaultLayout.Layout({ router })
        },
        presentation: ({ router }) => {
            // `router` is inferred `Router<Slide, DefaultLayout.NavHeader>`
            return new PresentationLayout({ router })
        },
    },
    onPending: 'default',
    onNotFound: 'default',
})
</code-snippet>


## Debugging

TypeScript error messages can be verbose and sometimes misleading. Here are two strategies to 
isolate and fix type mismatches:
 
*  Comment out sections of your Navigation object to pinpoint the problematic part.

*  Add type annotations progressively, starting from high-level components and working downward to ensure proper 
   inference.
