
# Dynamic 

Up until now, the navigation structure in our examples has been static, with all pages and their hierarchy known in 
advance. However, this isn't always the case, and **@youwol/mkdocs-ts** provides a formalism to handle dynamic 
scenarios.

In this example, we'll create a document with a **File System** node that represents a structure typically queried using
HTTP requests (for which responses are not known in advance). For simplicity, we'll mock the file structure and content.

Here is the mocked file system structure:
<js-cell>
const mockFS = {
    '': {
        files:[{id:'foo', name:'foo.txt'}],
        folders:[{id:'baz', name:'baz'}]
    },
    'baz': {
        files:[{id:'bar', name:'bar.txt'}],
        folders:[]
    }
}
const filesContent = {
    'foo': '# Foo \n This is the content of the **foo** file.',
    'baz/bar': '# Bar \n This is the content of the **bar** file.'
}
</js-cell>

Next, we'll define a helper function to generate the main HTML content when a folder is selected. 
This function lists the files in the folder and uses anchor elements to link to the files:

<js-cell>
const filesView = (elem) => {
    const path = elem.getAttribute('parent-folder')
    const { files } = mockFS[path]
    return {
        tag: 'div',
        children: files.map((file) => ({
            tag:'a',
            href: `@nav/fs/${path}/${file.id}`,
            class: 'd-flex align-items-center',
            children:[
                {   tag: 'i',
                    class: 'fas fa-file'
                },
                { tag:'i', class:'mx-2'},
                {   tag: 'div',
                    innerText: file.name
                }
            ]
        }))
    }
}
</js-cell>

The key element for defining dynamic navigation is a function that takes the **path** of the selected node 
(and the application's router object if needed) and returns a [CatchAllNav](@nav/api/MainModule.CatchAllNav)
navigation node:


<js-cell>
const resolveDynamicNavigation = async ({path}) => {
    // A file is selected
    if(filesContent[path]){
        return {
            name: path,
            html: ({router}) => MkDocs.parseMd({src:filesContent[path], router}),
            tableOfContent,
        }
    }
    // Otherwise, it is a folder
    const {files, folders} = mockFS[path]
    return {
        name: path,
        html: ({router}) => MkDocs.parseMd({
            src: `
# folder at ${path}

Below are the files of the folder:

<filesView parent-folder='${path}'></filesView>
`,
            views: {
                filesView: filesView
            }
        }),
        tableOfContent,
        children: [
            ...folders.map( folder => ({
                name: folder.name, 
                id: folder.id,
                decoration: {
                    icon:{class:'fas fa-folder px-1'}
                }
            })),
            ...files.map( file => ({
                name: file.name, 
                id: file.id,
                leaf: true,
                decoration: {
                    icon:{class:'fas fa-file px-1'}
                }
            }))
       ],
    }
}
</js-cell>

<note level="info">

The `filesView` helper is directly referenced within the markdown content of the folder's `html` definition.
It uses the 'custom view' feature of Markdown parsing, which are explained in detail on the Markdown 
dedicated [page](@nav/tutorials/markdown).
</note>

Finally, to integrate the implicit navigation resolver, the function above is referenced within its parent node using 
the **`...`** catch-all key:

<js-cell cell-id="example6">
navigation = {
    name: 'Root Node',
    tableOfContent,
    html: ({router}) => {
        return MkDocs.parseMd({router, src:`
# Embedding a files system

<note level='info'>Navigate to the [File System](@nav/fs) node to display the 'dynamic' children. </note>
`})},
    '/fs': {
        name: 'Files system',
        tableOfContent,
        html: ({router}) => {
            return MkDocs.parseMd({router, src:`
# File System

This is an example of dynamic navigation: navigation nodes
are not known in advance.
`})},
        '...': resolveDynamicNavigation
    }
}

displayApp(navigation, display)

</js-cell>

<cell-output cell-id="example6" full-screen="true" style="height:500px;">
</cell-output>

<note level="warning" label="Important">
The path provided to the 'catch-all' callback is relative to the parent node in which it is defined. 
For example, for the global path `/fs/foo/bar/baz`, it becomes `foo/bar/baz` (since `fs` is the parent node of the
reactive navigation).
</note>

<note level="hint">
The callback definition for the **`...`** catch-all accommodates returning `Promise` or `Observable`.
The latter allows the navigation structure to change at runtime (e.g., when the user performs an action).
</note>

