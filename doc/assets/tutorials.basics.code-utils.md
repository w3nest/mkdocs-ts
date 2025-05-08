
# Code Utilities

This page collects various utility functions used throughout the tutorials.
While they help streamline implementation, they are not essential for understanding the core concepts—especially on a 
first read.

<note level="hint"> 
The views presented here are created using the **rx-vdom** library, which enables reactive DOM rendering. 
You can find its documentation <ext-link target="rx-vdom">here</ext-link>
</note>


## Path View

The `pathView` function creates a **breadcrumb-style navigation bar** that visually represents the
<api-link target="Router"></api-link>'s **current navigation path** (`router.path$`).
Each segment of the path is displayed as a clickable link, allowing users to navigate back to any previous level.

<js-cell>

const pathView = (router) => {

    const home = (router) => {
        return {
            tag: 'a', class:'fas fa-home', href: '/',
            onclick: (ev)=>{ ev.preventDefault(); router.fireNavigateTo({path: '/'}) }
        }
    }
    const segment = ( path, router) => {
        return {
            tag: 'a', href: path,
            innerText: router.explorerState.getNodeResolved(`/${path}`).name,
            onclick: (ev)=>{ ev.preventDefault(); router.fireNavigateTo({path}) }
        }
    }
    const sep = { tag: 'div', class: 'mx-1', innerText: '/' }
    return {
        tag: 'div',
        class: 'text-center w-100 bg-light my-1 rounded d-flex align-items-center justify-content-center', 
        children: {
            policy: 'replace',
            source$: router.path$,
            vdomMap: (path) => {
                const segments = path.split('/').filter(e => e !== "")
                return [ 
                    home(router), 
                    segments.map( (_, i) => {
                        const segmentPath = segments.slice(0,i+1).join('/')
                        return [sep, segment(segmentPath, router)]
                    })
                ].flat(2)
            }
        }
    }
}
</js-cell>

<note level='info' expandable='true'>

The function returns a `<div>` container with:
1. **Home button**
2. **Dynamically generated path segments**, each preceded by a `/` separator.

**1. `homeView(router)` (Home Button)**
- A clickable **home icon** (`<a>` tag) that navigates to the root (`'/'`).
- Calls `router.fireNavigateTo({path: '/'})` on click.

**2. `segmentView(path, router)` (Path Segment Links)**
- A clickable link representing a **path segment**.
- Uses `router.explorerState.getNodeResolved` to retrieve the **display name** of the segment.
- Calls `router.fireNavigateTo({path})` on click.

**3. `sepView` (Separator)**
- A simple `/` separator between path segments.

**4. `children` (Reactive Path Rendering)**
- Uses `router.path$` (observable path) to **dynamically generate the breadcrumb trail**.
- **Splits the path into segments**, filtering out empty values.
- Constructs a **flat list** containing:
    1. The **home button**.
    2. A sequence of **`/` separators** and **clickable path segments**.

</note>

## Nav Bar

The `navBarView` function creates a **navigation bar (NavBar) UI component** that allows users to navigate through a 
browser-like history, go to the homepage, and enter a path manually. 
It utilizes a **reactive approach** by binding UI elements to observable state (`source$` streams) provided 
by the <api-link target="Router"></api-link> and its mocked browser client 
(<api-link target="MockBrowser"></api-link>).

<js-cell>

const navBarView = (router) => {
    const browser = router.browserClient
    const basePrevNext = (enabled$) => ({
        tag: 'button',
        disabled: {
            source$: enabled$,
            vdomMap: (enabled) => !enabled
        },
        style: {
            source$: enabled$,
            vdomMap: (enabled) => ({opacity: enabled ? 1 : 0.1})
        },
        class: 'btn btn-sm fas btn-light',
    })
    const prev = (router) => {
        const base = basePrevNext(browser.hasPrev$)
        return {
            ...base,
            class: `${base.class} fa-arrow-left`,
            onclick: (ev)=> browser.prev()
        }
    }
    const next = (router) => {
        const base = basePrevNext(browser.hasNext$)
        return {
            ...base,
            class: `${base.class} fa-arrow-right`,
            onclick: (ev)=> browser.next()
        }
    }
    const home = (router) => {
        return {
            tag: 'a',
            class:'fas fa-home',
            href: '/',
            onclick: (ev)=>{ ev.preventDefault(); router.fireNavigateTo({path: '/'}) }
        }
    }
    const sep = { tag:'div', class: 'mx-1' }

    const path = (router) => ({
        tag: 'input',
        type: 'text',
        class: 'flex-grow-1 rounded',
        onchange: (ev) => router.fireNavigateTo({path:ev.target.value}),
        value: {
            source$: router.target$,
            vdomMap: (target) => target.sectionId ? `${target.path}.${target.sectionId}`: target.path
        }
    })
    return {
        tag: 'div',
        class: 'text-center w-100 bg-light my-1 rounded d-flex align-items-center justify-content-center', 
        children: [
            prev(router),
            sep,
            next(router),
            sep, sep,
            home(router),
            sep,
            path(router)
        ]
    }
}
</js-cell>

<note level="info" expandable="true">
The function returns a `<div>` container with:
1. **Prev button**
2. **Separator**
3. **Next button**
4. **Two separators**
5. **Home button**
6. **Separator**
7. **Path input field** (for manual navigation)

The navigation bar is styled with **Bootstrap classes** for layout and responsiveness.

**1. `basePrevNext(enabled$)` (Helper Function)**
- Defines shared properties for the **previous** and **next** navigation buttons.
- Reactively updates the **disabled state** and **opacity** based on `enabled$` (observable indicating whether navigation is possible).

**2. `prev(router)` (Previous Button)**
- A button (`<button>`) that navigates to the **previous page** in the history.
- Uses `router.browserClient.hasPrev$` to enable/disable the button dynamically.
- Calls `router.browserClient.prev()` on click.

**3. `next(router)` (Next Button)**
- Similar to `prev()`, but navigates to the **next page**.
- Uses `router.browserClient.hasNext$` to enable/disable.

**4. `home(router)` (Home Button)**
- A home button (`<a>` tag) that navigates to the root (`'/'`).
- Calls `router.fireNavigateTo({path: '/'})` on click.

**5. `sep` (Separator)**
- A simple `<div>` element used as spacing between buttons.

**6. `path(router)` (Path Input Field)**
- A text input (`<input>` field) that allows users to manually enter a navigation path.
- Its value is dynamically bound to `router.target$`, reflecting the current path.
- Updates the navigation when the input changes.

</note>

---

## App View

The following `withNavBar` function is an asynchronous function responsible for initializing and rendering the main 
application view from a given `navigation` and (optional) `layout` generator in the multiple tutorials.

It returns a **virtual DOM (rx-vdom)** view stacking vertically:

- A **mocked browser's navigation bar** at the top (see `navBarView` above).

- A **main content area**, which fills the remaining space and contains the selected layout.

<js-cell>
const withNavBar = async ({navigation, topBanner, layout}) => {
    const version = "{{mkdocs-version}}"
    const { MkDocs } = await webpm.install({
        esm:[ `mkdocs-ts#${version} as MkDocs`]
    })
    const router = new MkDocs.Router({
        navigation, 
        browserClient: ({router}) => new MkDocs.MockBrowser({router})
    })
    layout = layout 
        ? layout({router}) 
        : new MkDocs.DefaultLayout.Layout({router,topBanner})
    return {
        tag: 'div',
        class:'border p-1 d-flex flex-column w-100 h-100',
        children:[
            navBarView(router),
            {
                tag: 'div',
                class: 'w-100 flex-grow-1', style: {minHeight:'0px'},
                children: [
                    layout
                ]           
            },
        ]
    }
}
</js-cell>

<note level="info" expandable="true">

**Dependency Installation**
    - It dynamically installs **mkdocs-ts** using **WebPM**, ensuring the correct version (`{{mkdocs-version}}`) is 
    loaded. If the library is already loaded, no installation proceeds. 

**Router Initialization**
    - Creates an instance of `MkDocs.Router`, which manages navigation.
    - Uses `MkDocs.MockBrowser` as a browser client for handling navigation events.

**Layout Selection**
    - If a `layout` function is provided, it is called with the router.
    - Otherwise, the **default layout** (<api-link target="DefaultLayout.Layout"></api-link>) is used.

**View Structure**
    - Returns a **virtual DOM (rx-vdom)** representation of the app:
        - A **navigation bar** (`navBarView`) at the top.
        - A **main content area**, which fills the remaining space and contains the selected layout.

</note>
