
# Code Utilities

## Path View

<js-cell>

const pathView = (router) => {
    const homeView = (router) => {
        return {
            tag: 'a',
            class:'fas fa-home',
            href: '/',
            onclick: (ev)=>{ ev.preventDefault(); router.fireNavigateTo({path: '/'}) }
        }
    }
    const segmentView = ( path, router) => {
        return {
            tag: 'a',
            innerText: router.explorerState.getNodeResolved(`/${path}`).name,
            href: path,
            onclick: (ev)=>{ ev.preventDefault(); router.fireNavigateTo({path}) }
        }
    }
    const sepView = {
        tag: 'div',
        class: 'mx-1',
        innerText: '/'
    }
    return {
        tag: 'div',
        class: 'text-center w-100 bg-light my-1 rounded d-flex align-items-center justify-content-center', 
        children: {
            policy: 'replace',
            source$: router.path$,
            vdomMap: (path) => {
                const segments = path.split('/').filter(e => e !== "")
                return [ 
                    homeView(router), 
                    segments.map( (segment, i) => {
                        const segmentPath = segments.slice(0,i+1).join('/')
                        return [sepView, segmentView(segmentPath, router)]
                    })
                ].flat(2)
            }
        }
    }
}
</js-cell>

