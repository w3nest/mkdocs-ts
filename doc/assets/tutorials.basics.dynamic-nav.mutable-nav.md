# Mutable Navigation

This tutorial extends the concept of dynamic navigation by showcasing how to handle mutations within the navigation 
tree.
The files explorer application constructed <cross-link target="dynamic-nav">here</cross-link> is completed
to include a version selector in the side navigation panel.
Most of the implementation is reused from the previous tutorial. The following cell imports the necessary functions:

<js-cell>
const { MkDocs,
        version,
        libraryId, 
        client, 
        routes, 
        folderView,
        fileView, 
        tocView, 
        queryExplorer }  = await load("/tutorials/basics/dynamic-nav")

</js-cell>



---

## Version Selector

Let's start by defining the selectable input exposing the versions of {{mkdocs-ts}}, 
retrieved using the `client.getLibraryInfo$` method.

<js-cell>
const { rxjs } = await webpm.install({esm:["rxjs#^7.5.6 as rxjs"]})

const selectedVersion$ = new rxjs.BehaviorSubject(version)
const dropDown = {
    tag: 'select',
    onchange: (ev) => selectedVersion$.next(ev.target.value),
    children: {
        policy: 'replace',
        source$: client.getLibraryInfo$({libraryId, queryParameters:{maxCount:10} }),
        vdomMap: (resp) => {
            return resp.versions.map( (version) => {
                return {
                    tag:'option',
                    innerText: version,
                    value: version,
                    selected: {
                        source$: selectedVersion$,
                        vdomMap: (v) => v === version
                    } 
                }
            })
        }
    }
}
display(dropDown, Views.mx2, "Selection:", Views.mx1, selectedVersion$)
</js-cell>

---

## Navigation & App

The navigation object is now reactive, dynamically updating based on the `selectedVersion$` observable. 
This is achieved using the <api-link target="LazyRoutesCb$"></api-link> API:


<js-cell>
const routes$ = selectedVersion$.pipe(
    rxjs.map( (version) => async ({path, router}) => routes({path, router, version}))
)
</js-cell>

Additionally, the <api-link target="DefaultLayout.NavLayout"></api-link> of the root page—displaying the root folder's 
contents—must also react to `selectedVersion$`.

Let's first define the root folder content observable:
<js-cell>

const rootFolder$ = selectedVersion$.pipe(
    rxjs.switchMap((version) => rxjs.from(queryExplorer(version, '/'))),
    rxjs.shareReplay({refCount: true, bufferSize:1})
)
</js-cell>

And use a <ext-link target="RxChild">RxChild</ext-link> to create a reactive `content` and `toc` for the layout:

<js-cell>

const layout = {
    content: ({router}) => ({
        source$: rootFolder$,
        vdomMap: (resp) => folderView(resp, '', router),
        sideEffects: (rxElement) => MkDocs.replaceLinks({router, elem: rxElement.element, fromMarkdown: false})
    }),
    toc: () => ({
        source$: rootFolder$,
        vdomMap: tocView
    })
}
</js-cell>

<note level="hint">
Per the <api-link target="DefaultLayout.NavLayout"></api-link> documentation, developers must explicitly update 
the TOC if changes occur after the initial rendering. 
This is why the `toc` is also declared using an <ext-link target="RxChild">RxChild</ext-link>.
</note>

<note level="question" title="`MkDocs.replaceLinks`" expandable="true">
The <api-link target="replaceLinks"></api-link> function is called on each view update because anchor (`<a>`)
elements contain `href` attributes formatted as `@nav/path/to/target` (in the definition of `ItemView`), 
which is specific to {{mkdocs-ts}}.
Normally, the <api-link target="DefaultLayout.PageView"></api-link> automatically processes these links during the initial
rendering to enable proper navigation. 
However, since the content is dynamic here, we must explicitly call `replaceLinks` at each update to ensure 
updated links function correctly.

Another option to define anchors in your views, avoiding the `@nav/path/to/target` 'magic', is to redefine the 
`onclick` callback when creating them, *e.g.*:

<code-snippet language="javascript">
function createAnchor(title, targetPath, router) {
    const anchor = document.createElement('a')
    anchor.innerText = title
    anchor.onclick = (ev) => {
        e.preventDefault()
        router.fireNavigateTo(targetPath)
    }
}
</code-snippet>

</note>

The application is finally defined and displayed:

<js-cell cell-id="app">
const topBanner = {
    logo: {
        icon: { tag:'div', innerText:'🗃️' },
        title: 'Explorer'
    },
    expandedContent: { 
        tag:'div', 
        class:'fw-bolder text-center', 
        innerText: 'Dynamic & Mutable Navigation'
    },
    badge: dropDown
}

const navigation = {
    name: 'Explorer',
    layout,
    header: { icon: { tag: 'i', class: 'fas fa-folder-open' } },
    routes: routes$
}

const { withNavBar } = await load("/tutorials/basics/code-utils")

const view = await withNavBar({navigation, layout:({router}) => {
    return new MkDocs.DefaultLayout.Layout({
        router,
        topBanner
    })
}})

display(view)
</js-cell>

<cell-output cell-id="app" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;">
</cell-output>

