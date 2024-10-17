
const runTimeDependencies = {
    "externals": {
        "@youwol/http-primitives": "^0.2.3",
        "@youwol/rx-tree-views": "^0.3.4",
        "@youwol/rx-vdom": "^1.0.1",
        "@youwol/webpm-client": "^3.0.0",
        "codemirror": "^5.52.0",
        "esprima": "^4.0.1",
        "highlight.js": "11.2.0",
        "marked": "^4.2.3",
        "rxjs": "^7.5.6"
    },
    "includedInBundle": {}
}
const externals = {
    "@youwol/http-primitives": {
        "commonjs": "@youwol/http-primitives",
        "commonjs2": "@youwol/http-primitives",
        "root": "@youwol/http-primitives_APIv02"
    },
    "@youwol/rx-tree-views": {
        "commonjs": "@youwol/rx-tree-views",
        "commonjs2": "@youwol/rx-tree-views",
        "root": "@youwol/rx-tree-views_APIv03"
    },
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
    "codemirror": {
        "commonjs": "codemirror",
        "commonjs2": "codemirror",
        "root": "codemirror_APIv5"
    },
    "esprima": {
        "commonjs": "esprima",
        "commonjs2": "esprima",
        "root": "esprima_APIv4"
    },
    "highlight.js": {
        "commonjs": "highlight.js",
        "commonjs2": "highlight.js",
        "root": "highlight.js_APIv11"
    },
    "marked": {
        "commonjs": "marked",
        "commonjs2": "marked",
        "root": "marked_APIv4"
    },
    "rxjs": {
        "commonjs": "rxjs",
        "commonjs2": "rxjs",
        "root": "rxjs_APIv7"
    },
    "rxjs/fetch": {
        "commonjs": "rxjs/fetch",
        "commonjs2": "rxjs/fetch",
        "root": [
            "rxjs_APIv7",
            "fetch"
        ]
    },
    "rxjs/operators": {
        "commonjs": "rxjs/operators",
        "commonjs2": "rxjs/operators",
        "root": [
            "rxjs_APIv7",
            "operators"
        ]
    }
}
const exportedSymbols = {
    "@youwol/http-primitives": {
        "apiKey": "02",
        "exportedSymbol": "@youwol/http-primitives"
    },
    "@youwol/rx-tree-views": {
        "apiKey": "03",
        "exportedSymbol": "@youwol/rx-tree-views"
    },
    "@youwol/rx-vdom": {
        "apiKey": "1",
        "exportedSymbol": "@youwol/rx-vdom"
    },
    "@youwol/webpm-client": {
        "apiKey": "3",
        "exportedSymbol": "@youwol/webpm-client"
    },
    "codemirror": {
        "apiKey": "5",
        "exportedSymbol": "codemirror"
    },
    "esprima": {
        "apiKey": "4",
        "exportedSymbol": "esprima"
    },
    "highlight.js": {
        "apiKey": "11",
        "exportedSymbol": "highlight.js"
    },
    "marked": {
        "apiKey": "4",
        "exportedSymbol": "marked"
    },
    "rxjs": {
        "apiKey": "7",
        "exportedSymbol": "rxjs"
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

const secondaryEntries : {[k:string]:{entryFile: string, name: string, loadDependencies:string[]}}= {
    "CodeApi": {
        "entryFile": "./lib/code-api/index.ts",
        "loadDependencies": [
            "@youwol/rx-vdom",
            "@youwol/http-primitives"
        ],
        "name": "CodeApi"
    },
    "Notebook": {
        "entryFile": "./lib/notebook/index.ts",
        "loadDependencies": [
            "@youwol/rx-vdom",
            "rxjs",
            "@youwol/rx-tree-views",
            "esprima"
        ],
        "name": "Notebook"
    }
}

const entries = {
     '@youwol/mkdocs-ts': './index.ts',
    ...Object.values(secondaryEntries).reduce( (acc,e) => ({...acc, [`@youwol/mkdocs-ts/${e.name}`]:e.entryFile}), {})
}
export const setup = {
    name:'@youwol/mkdocs-ts',
        assetId:'QHlvdXdvbC9ta2RvY3MtdHM=',
    version:'0.6.4',
    shortDescription:"Typescript based mkdocs like solution",
    developerDocumentation:'https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@youwol/mkdocs-ts&tab=doc',
    npmPackage:'https://www.npmjs.com/package/@youwol/mkdocs-ts',
    sourceGithub:'https://github.com/youwol/mkdocs-ts',
    userGuide:'https://l.youwol.com/doc/@youwol/mkdocs-ts',
    apiVersion:'06',
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
            return window[`@youwol/mkdocs-ts_APIv06`]
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
            `@youwol/mkdocs-ts#0.6.4~dist/@youwol/mkdocs-ts/${entry.name}.js`
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
            return window[`@youwol/mkdocs-ts/${entry.name}_APIv06`]
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
