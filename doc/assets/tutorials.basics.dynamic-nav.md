
# Dynamic  Navigation

In the <cross-link target="basics">Getting Started</cross-link> tutorial, we introduced how to set up **static**
navigation, where all pages and their hierarchy are predefined. 
However, in many real-world applications, navigation structures are not always known in advance, and needs to be 
resolved at run time. This page explores how to handle such scenarios effectively.

To illustrate this concept, we will build a file-browsing application for the {{mkdocs-ts}} package as published on
<ext-link target="webpm">WebPM</ext-link>. Below is a preview of the final application in action:

<cell-output cell-id="app-start" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;"> </cell-output>

Since the package structure is not predetermined, it will be dynamically retrieved via HTTP requests to the WebPM 
backend. 

<note level='warning'>
Any changes in the file structure after loading the application will not be reflected—this tutorial focuses on
handling **dynamic** (resolved at run time) but **immutable** structures.
For handling mutable navigation structures that update in real time, refer to the next tutorial:
<cross-link target="mutable-nav">Mutable Navigation</cross-link>.
</note>

---

## Requirements

Before getting started, we need to install the required packages and CSS dependencies:

<js-cell>
const version = "{{mkdocs-version}}"

const { MkDocs, rxjs, clients } = await webpm.install({
    esm:[
        `mkdocs-ts#${version} as MkDocs`, 
        '@w3nest/http-clients#^0.1.3 as clients',
        'rxjs#^7.8.2 as rxjs',
    ],
    css: [
        // Required by mkdocs-ts itself:
        'bootstrap#5.3.3~bootstrap.min.css',
        `mkdocs-ts#${version}~assets/mkdocs-light.css`,
        // Required by the code of this page
        'fontawesome#5.12.1~css/all.min.css',
    ]
})
display({MkDocs, rxjs, clients})
</js-cell>

Alongside the core {{mkdocs-ts}} package, the following additional libraries are included:

*  **`@w3nest/http-clients`**: A collection of clients for the W3Nest ecosystem, including the **WebPM** client,
   which allows us to dynamically fetch package files content.
*  **`rxjs`**: Used here primarily to handle data streams from the **WebPM** client.
   It also plays a key role in {{mkdocs-ts}}, enabling reactivity throughout the application.

---

## Client

Before navigating the file system of {{mkdocs-ts}}, we need to configure an HTTP client to retrieve files and folders.

<js-cell>
const toId = (name) => window.btoa(name)
const fromId = (name) => window.atob(name)
const toNavPath = (path) => path.split('/')
    .filter(d => d !=='')
    .reduce((acc,e)=> `${acc}/${toId(e)}`,"")

const toFilePath = (link) => link.split('/')
    .filter(d => d !=='')
    .reduce((acc,e)=> `${acc}/${fromId(e)}`,"")

const libraryId = toId('mkdocs-ts')
const client = new clients.AssetsGateway.Client().webpm
</js-cell>

<note level="question" title="toId?">
Since we are dealing with URLs, it is sometimes necessary to generate **URL-safe identifiers**. This function ensures that names are properly encoded.
</note>

Now, let's define a helper function to request the contents of a folder:

<js-cell>
const queryExplorer = async (version, path) => {
    return rxjs.firstValueFrom(client.queryExplorer$({
        libraryId,
        version,
        restOfPath: path
    }))
}
</js-cell>

Its primary purpose is to transform an Observable based API to a Promise based API.

<note level="question" title="Why `version` in argument?" expandable="true">
In this tutorial, the **version** of `mkdocs-ts` remains constant across all examples, so it could have been omitted 
as an argument.
However, this code will also be used in the
<cross-link target="mutable-nav">Mutable Navigation</cross-link> tutorial,
where the version can change dynamically.
By keeping version as an argument, the helper remains flexible.
</note>

Let's retrieve and display the contents of the root folder:

<js-cell>
const root = await queryExplorer(version, '/')
display(root)
</js-cell>


---

## Views

This section covers the creation of multiple views for our application.
We use <ext-link target="rx-vdom">Rx-vDOM</ext-link>, as it integrates naturally with {{mkdocs-ts}}.
However, as noted in the <cross-link target="basics">Getting Started</cross-link> tutorial,
you are free to use standard HTMLElements or your preferred UI framework.

To first demonstrate the views independently of the full navigation system
(which requires the <api-link target="Router"></api-link> instance created later on this page),
let’s define a mock router:

<js-cell>
const mockRouter = {
    path$: new rxjs.BehaviorSubject('/')
}
</js-cell>

This allows us to simulate navigation behavior without needing the complete router setup.

### Item

The **item view** displays a row consisting of:

*  An **icon** (file or folder)
*  A **name**, which is a clickable link to navigate within the application
*  A **size** indicator for files


<js-cell>
const rowView = ({parentPath, name, type, size}) => ({
    tag: 'div',
    class: 'd-flex align-items-center my-2',
    children: [
        {
            tag: 'i',
            class: type === 'file' ? 'fas fa-file' : 'fas fa-folder'
        },
        {   tag: 'div', class: 'mx-2' },
        {
            tag: 'a',
            innerText: name,
            href: `@nav${toNavPath(`${parentPath}/${name}`)}`
        },
        {   tag: 'div', class: 'flex-grow-1' },
        {   tag: 'div', innerText: `${size/1000} kB` },
    ]
})
</js-cell>

We can test the folder and file rendering using the `root` data:

<note level="warning" title="Do not click on links" >
The links won't work just yet, as they depend on the complete navigation system being set up later. 
</note>

<js-cell>
for(let folder of root.folders ){
    display(rowView({...folder, type:'folder', parentPath:'/'}))
}
for(let file of root.files ){
    display(rowView({...file, type:'file', parentPath:'/'}))
}
</js-cell>


### Folder

The **folder view** essentially includes the above items, it is completed by a path view defined in the 
<cross-link target='basics-utils'>Code Utilities</cross-link> page.

<js-cell>
// The header displaying the full current router path is available in another page
const { pathView } = await load("/tutorials/basics/code-utils")

const folderView = ( resp, parentPath, router) => ({
    tag: 'div',
    children: [
        pathView(router),
        {   
            tag: 'div',
            class: 'p-3 border rounded',
            children: [
                ...resp.folders.map((folder) => {
                    return rowView({parentPath , name:folder.name, type:'folder', size:folder.size})
                }),
                ...resp.files.map((file) => {
                    return rowView({parentPath , name:file.name, type:'file', size:file.size})
                })
            ]
        }
    ],
})

</js-cell>

We can test the view using the `root` data:

<js-cell>
const rootFolderView = await folderView(root, '/', mockRouter)
display(rootFolderView)
</js-cell>

### File

The **file view** display a file content:
*  **As an image** if it is a `.svg` or `.png` file
*  **As formatted text in an editor** for all other file types.

Leveraging <api-link target='CodeSnippetView'></api-link>, the file view is:

<js-cell>

const fileView = ({language, content, path}, router) => {
    return {
        tag: 'div',
        children: [
            pathView(router),
            ['svg', 'png'].includes(language)
                ? { 
                    tag: 'img',
                    src: `data:image/${language}+xml;base64,${content}`, 
                    style: {maxWidth: '100%' }
                }
                : new MkDocs.MdWidgets.CodeSnippetView({ language, content }) 
        ],
    }
}
</js-cell>
    
Let's define a helper to retrieve the `{language, content, path}` argument from the **WebPM** `client`.
While this factory setup is not critical to understanding the file display logic, readers can expand the following 
section for details.

<note level="abstract" title='Formatter' icon="fas fa-code" expandable="true" mode="stateful">
To correctly display files based on their type, we need a formatter, processing the raw content of a file based on its 
extension.

It consists of several helper functions, each tailored for different file types:

*  Binary content (like images) → Render as HTML 
*  Code files (.ts, .py, etc.) → Use a syntax-highlighted editor
*  JSON files → Pretty-print using JSON.stringify()
*  Other text files (.html, .css, etc.) → Display as plain text


<js-cell>
const fromBlob = (language) =>
    async (resp, path) => ({
        language,
        path,
        content: typeof(resp) === 'string' ?  resp : await resp.text()
})
const fromImg = (language) => async (resp, path) => ({
    path,
    language,
    content: await blobToBase64(resp) // Convert to Base64
})

const blobToBase64 = (blob) => new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1]) // Remove e.g. "data:image/png;base64,"
    reader.readAsDataURL(blob)
})

const fromJson = () => 
    (resp, path) => ({path, language: 'json', content:JSON.stringify(resp, null, 4)})

const fromText = (language) => 
    (resp, path) => ({path, language, content:resp})

const factory = {
    '.ts': fromBlob('javascript'),
    '.js': fromBlob('javascript'),
    '.py': fromBlob('python'),
    '.xml': fromBlob('xml'),
    '.svg': fromImg('svg'),
    '.png': fromImg('png'),
    '.scss': fromBlob('css'),
    '.json': fromJson(),
    '.map': fromJson(),
    '.html': fromText('htmlmixed'),
    '.css': fromText('css'),
}
const formatContent = async (file, resp) => {
    for( let [k, v] of Object.entries(factory)){
        if(file.endsWith(k)){
            try{
                return await v(resp, file)
            }
            catch(e){
                console.error(e)
                console.log("Response", resp)
                return {language:'markdown', path:file, content: 'Failed to load content'}
            }
            
        }
    }
    return (resp instanceof Blob) ? await fromBlob('unknown')(resp, file) : await fromText('unknown')(resp, file)
}
</js-cell>
</note>

<js-cell>
const getContent = async (version, path) => {
    const content = await rxjs.firstValueFrom(client.getResource$({
        libraryId,
        version,
        restOfPath:path
    }))
    return await formatContent(path, content)
}
</js-cell>

Let's use our function to fetch and display the `package.json` file:

<js-cell cell-id='file'>
const resp = await getContent(version,  '/package.json')
const packageJsonView = await fileView(resp, mockRouter)
display(packageJsonView)
</js-cell>

<cell-output cell-id='file' class='overflow-auto' style="max-height: 33vh">
</cell-output>

### TOC

Instead of the standard Table of Contents, we will display metadata about the currently selected file or folder:

<js-cell>
const mdContent = (data) => `
## Metadata
---
*  **Size** : ${data.size/1000} kB
`  

const tocView = (data) => {
    return {
        tag: 'div',
        class: 'mkdocs-TOCView p-2 rounded',
        children: [
            MkDocs.parseMd({src:mdContent(data)})
        ]   
    }
}
</js-cell>

We can test it by displaying metadata for the root folder:

<js-cell>
display(tocView(root))
</js-cell>

---

## Navigation & App

Let's now defined the <api-link target="Navigation"></api-link> object.
Our goal is to create a <api-link target="LazyRoutes"></api-link> object, which maps URL segments to
<api-link target="NavNodeData"></api-link> instances.
For file and folder, the `NavNodeData` are implemented as:

<js-cell>
const navNodeDataFile = (version, path, fileResp, router) => ({ 
    name: fileResp.name,
    header: { icon: { tag: 'i', class: 'fas fa-file' } },
    layout: { 
        content: async () => {    
            const content = await getContent(version, `${toFilePath(path)}/${fileResp.name}`)
            return fileView(content, router)
        }, 
        toc: ({html}) => tocView(fileResp)
    },
    leaf: true
})
const navNodeDataFolder = (version, path, folderResp, router) => ({ 
    name: folderResp.name,
    header: { icon: { tag: 'i', class: 'fas fa-folder' } },
    layout: { 
        content: async () => {
            const folder = `${toFilePath(path)}/${folderResp.name}`
            const resp = await queryExplorer(version, folder)
            return folderView(resp, folder, router)
        }, 
        toc: ({html}) => tocView(folderResp)
    }
})
</js-cell>

Because we assume the file structure remains unchanged while the application is running,
the routes attribute is defined using a <api-link target="LazyRoutesCb"></api-link> function:

<js-cell>
const routes = async ({ version, path, router }) => {
    const folder = path.split('/').reduce((acc,e)=> `${acc}/${fromId(e)}`, "")
    const resp = await queryExplorer(version, folder)
    const files = resp.files.reduce((acc, f) => ({
        ...acc,
        [`/${toId(f.name)}`]: navNodeDataFile(version, path, f, router)
    }), {})
    const folders = resp.folders.reduce((acc, f) => ({ 
        ...acc, 
        [`/${toId(f.name)}`]: navNodeDataFolder(version, path, f, router)  
    }), {})
    return { ...folders, ...files, }
}
</js-cell>
 
We can finally define the navigation and application:


<js-cell cell-id="app">
const rootFolder = await queryExplorer(version, '/') 
const topBanner = {
    logo: {
        icon: { tag:'div', innerText:'🗃️' },
        title: 'Explorer'
    },
    badge: { tag:'i', class:'my-auto', innerText:`🔖 ${version}` },
    expandedContent: { 
        tag:'div', 
        class:'fw-bolder text-center', 
        innerText: 'Dynamic Navigation'
    },
}

const navigation = {
    name: 'Explorer',
    layout: { 
        content: ({router}) => {
            return folderView(rootFolder, '/', router)
        },
        toc: ({html}) => tocView(rootFolder)
    },
    header: { icon: { tag: 'i', class: 'fas fa-folder-open' } },
    routes: ({router, path}) => routes({version, router, path})
}

const { withNavBar } = await load("/tutorials/basics/code-utils")
const view = await withNavBar({navigation, topBanner})
display(view)
</js-cell>


<cell-output cell-id="app" full-screen="true" style="aspect-ratio: 1 / 1; min-height: 0px;">
</cell-output>

<note level="info" title="Top View" expandable="true" mode="stateful">
This cell is associated with a deported view port: the one displayed at the top of this page:

<js-cell cell-id="app-start">
display(await withNavBar({navigation, topBanner}))
</js-cell>
</note>
