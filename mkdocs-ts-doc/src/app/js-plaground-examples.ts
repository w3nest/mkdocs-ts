import { setup } from '../auto-generated'

export const example1 = `
<!DOCTYPE html>
<html lang="en">
    <head><script src="https://webpm.org/^3.0.0/webpm-client.js"></script></head>
    
    <body id="content" class='vh-100 vw-100'></body>    
    
    <script type="module">
        const { MkDocs, RxDom } = await webpm.install({
            modules:[ 
                '@youwol/mkdocs-ts#${setup.version} as MkDocs',
                '@youwol/rx-vdom as RxDom'
            ],
            css: [
                'bootstrap#4.4.1~bootstrap.min.css',
                'fontawesome#5.12.1~css/all.min.css',
                '@youwol/fv-widgets#latest~dist/assets/styles/style.youwol.css',
                '@youwol/mkdocs-ts#${setup.version}~assets/mkdocs-light.css'
                ],
            displayLoadingScreen: true
        })
        const src =  \`
# Hello 👋

This is a minimal example to demonstrate how to get started with **@youwol/mkdocs-ts**.
Please refer to the tutorial section to learn about the multiple features proposed.
        \`
        const NotebookModule = await MkDocs.installNotebookModule()

        const nav = {
            name: 'CDN example',
            tableOfContent: MkDocs.Views.tocView,
            html: ({ router }) => MkDocs.parseMd({
                src,
                router
            }),
        }
        const router = new MkDocs.Router({ 
            navigation: nav, 
            // For real scenario the following parameters is not needed.
            // Here it is used to not re-locate the browser when navigating in this example.
            mockBrowserLocation: { 
                initialPath:'https://foo.com/?nav=/', 
                history:[]
            }
        })

        const app = new MkDocs.Views.DefaultLayoutView({
            router,
            name: 'Getting started',
        })

        document.body.append(RxDom.render({
            tag: 'div',
            style:{ height:'inherit' },
            children:[app]
        }))
        
    </script>
</html>
`
