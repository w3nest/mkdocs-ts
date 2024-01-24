
const runTimeDependencies = {
    "externals": {
        "@youwol/rx-vdom": "^1.0.1",
        "@youwol/webpm-client": "^3.0.0",
        "rxjs": "^7.5.6",
        "marked": "^4.2.3",
        "highlight.js": "11.2.0",
        "@youwol/os-top-banner": "^0.2.0",
        "@youwol/rx-tree-views": "^0.3.1"
    },
    "includedInBundle": {}
}
const externals = {
    "@youwol/rx-vdom": {
        "commonjs": "@youwol/rx-vdom",
        "commonjs2": "@youwol/rx-vdom",
        "root": "@youwol/rx-vdom_APIv1"
    },
    "@youwol/webpm-client": {
        "commonjs": "@youwol/webpm-client",
        "commonjs2": "@youwol/webpm-client",
        "root": "@youwol/webpm-client_APIv3"
    },
    "rxjs": {
        "commonjs": "rxjs",
        "commonjs2": "rxjs",
        "root": "rxjs_APIv7"
    },
    "marked": {
        "commonjs": "marked",
        "commonjs2": "marked",
        "root": "marked_APIv4"
    },
    "highlight.js": {
        "commonjs": "highlight.js",
        "commonjs2": "highlight.js",
        "root": "hljs_APIv11"
    },
    "@youwol/os-top-banner": {
        "commonjs": "@youwol/os-top-banner",
        "commonjs2": "@youwol/os-top-banner",
        "root": "@youwol/os-top-banner_APIv02"
    },
    "@youwol/rx-tree-views": {
        "commonjs": "@youwol/rx-tree-views",
        "commonjs2": "@youwol/rx-tree-views",
        "root": "@youwol/rx-tree-views_APIv03"
    }
}
const exportedSymbols = {
    "@youwol/rx-vdom": {
        "apiKey": "1",
        "exportedSymbol": "@youwol/rx-vdom"
    },
    "@youwol/webpm-client": {
        "apiKey": "3",
        "exportedSymbol": "@youwol/webpm-client"
    },
    "rxjs": {
        "apiKey": "7",
        "exportedSymbol": "rxjs"
    },
    "marked": {
        "apiKey": "4",
        "exportedSymbol": "marked"
    },
    "highlight.js": {
        "apiKey": "11",
        "exportedSymbol": "hljs"
    },
    "@youwol/os-top-banner": {
        "apiKey": "02",
        "exportedSymbol": "@youwol/os-top-banner"
    },
    "@youwol/rx-tree-views": {
        "apiKey": "03",
        "exportedSymbol": "@youwol/rx-tree-views"
    }
}

const mainEntry : {entryFile: string,loadDependencies:string[]} = {
    "entryFile": "./index.ts",
    "loadDependencies": [
        "@youwol/rx-vdom",
        "@youwol/webpm-client",
        "rxjs",
        "marked",
        "highlight.js",
        "@youwol/os-top-banner",
        "@youwol/rx-tree-views"
    ]
}

const secondaryEntries : {[k:string]:{entryFile: string, name: string, loadDependencies:string[]}}= {}

const entries = {
     '@youwol/mkdocs-ts': './index.ts',
    ...Object.values(secondaryEntries).reduce( (acc,e) => ({...acc, [`@youwol/mkdocs-ts/${e.name}`]:e.entryFile}), {})
}
export const setup = {
    name:'@youwol/mkdocs-ts',
        assetId:'QHlvdXdvbC9ta2RvY3MtdHM=',
    version:'0.1.1',
    shortDescription:"Typescript based mkdocs like solution",
    developerDocumentation:'https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@youwol/mkdocs-ts&tab=doc',
    npmPackage:'https://www.npmjs.com/package/@youwol/mkdocs-ts',
    sourceGithub:'https://github.com/youwol/mkdocs-ts',
    userGuide:'https://l.youwol.com/doc/@youwol/mkdocs-ts',
    apiVersion:'01',
    runTimeDependencies,
    externals,
    exportedSymbols,
    entries,
    secondaryEntries,
    getDependencySymbolExported: (module:string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    },

    installMainModule: ({cdnClient, installParameters}:{
        cdnClient:{install:(unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const parameters = installParameters || {}
        const scripts = parameters.scripts || []
        const modules = [
            ...(parameters.modules || []),
            ...mainEntry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@youwol/mkdocs-ts_APIv01`]
        })
    },
    installAuxiliaryModule: ({name, cdnClient, installParameters}:{
        name: string,
        cdnClient:{install:(unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const entry = secondaryEntries[name]
        if(!entry){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const parameters = installParameters || {}
        const scripts = [
            ...(parameters.scripts || []),
            `@youwol/mkdocs-ts#0.1.1~dist/@youwol/mkdocs-ts/${entry.name}.js`
        ]
        const modules = [
            ...(parameters.modules || []),
            ...entry.loadDependencies.map( d => `${d}#${runTimeDependencies.externals[d]}`)
        ]
        return cdnClient.install({
            ...parameters,
            modules,
            scripts,
        }).then(() => {
            return window[`@youwol/mkdocs-ts/${entry.name}_APIv01`]
        })
    },
    getCdnDependencies(name?: string){
        if(name && !secondaryEntries[name]){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const deps = name ? secondaryEntries[name].loadDependencies : mainEntry.loadDependencies

        return deps.map( d => `${d}#${runTimeDependencies.externals[d]}`)
    }
}
