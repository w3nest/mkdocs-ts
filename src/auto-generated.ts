/* eslint-disable */
const runTimeDependencies = {
    "externals": {
        "@w3nest/http-clients": "^0.1.0",
        "@w3nest/rx-tree-views": "^0.1.0",
        "@w3nest/webpm-client": "^0.1.0",
        "codemirror": "^5.52.0",
        "esprima": "^4.0.1",
        "highlight.js": "11.2.0",
        "marked": "^4.2.3",
        "rx-vdom": "^0.1.0",
        "rxjs": "^7.5.6"
    },
    "includedInBundle": {}
}
const externals = {
    "@w3nest/http-clients": {
        "commonjs": "@w3nest/http-clients",
        "commonjs2": "@w3nest/http-clients",
        "root": "@w3nest/http-clients_APIv01"
    },
    "@w3nest/rx-tree-views": {
        "commonjs": "@w3nest/rx-tree-views",
        "commonjs2": "@w3nest/rx-tree-views",
        "root": "@w3nest/rx-tree-views_APIv01"
    },
    "@w3nest/webpm-client": {
        "commonjs": "@w3nest/webpm-client",
        "commonjs2": "@w3nest/webpm-client",
        "root": "@w3nest/webpm-client_APIv01"
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
    "rx-vdom": {
        "commonjs": "rx-vdom",
        "commonjs2": "rx-vdom",
        "root": "rx-vdom_APIv01"
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
    "@w3nest/http-clients": {
        "apiKey": "01",
        "exportedSymbol": "@w3nest/http-clients"
    },
    "@w3nest/rx-tree-views": {
        "apiKey": "01",
        "exportedSymbol": "@w3nest/rx-tree-views"
    },
    "@w3nest/webpm-client": {
        "apiKey": "01",
        "exportedSymbol": "@w3nest/webpm-client"
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
    "rx-vdom": {
        "apiKey": "01",
        "exportedSymbol": "rx-vdom"
    },
    "rxjs": {
        "apiKey": "7",
        "exportedSymbol": "rxjs"
    }
}

const mainEntry : {entryFile: string,loadDependencies:string[]} = {
    "entryFile": "./index.ts",
    "loadDependencies": [
        "rx-vdom",
        "w3nest/webpm-client",
        "rxjs",
        "marked",
        "highlight.js",
        "@w3nest/rx-tree-views"
    ]
}

const secondaryEntries : {[k:string]:{entryFile: string, name: string, loadDependencies:string[]}}= {
    "CodeApi": {
        "entryFile": "./lib/code-api/index.ts",
        "loadDependencies": [
            "rx-vdom",
            "@w3nest/http-clients"
        ],
        "name": "CodeApi"
    },
    "Notebook": {
        "entryFile": "./lib/notebook/index.ts",
        "loadDependencies": [
            "rx-vdom",
            "rxjs",
            "@w3nest/rx-tree-views",
            "esprima"
        ],
        "name": "Notebook"
    }
}

const entries = {
     'mkdocs-ts': './index.ts',
    ...Object.values(secondaryEntries).reduce( (acc,e) => ({...acc, [`mkdocs-ts/${e.name}`]:e.entryFile}), {})
}
export const setup = {
    name:'mkdocs-ts',
        assetId:'bWtkb2NzLXRz',
    version:'0.1.1',
    shortDescription:"Typescript based mkdocs like solution",
    developerDocumentation:'https://platform.youwol.com/apps/@youwol/cdn-explorer/latest?package=mkdocs-ts&tab=doc',
    npmPackage:'https://www.npmjs.com/package/mkdocs-ts',
    sourceGithub:'https://github.com/mkdocs-ts',
    userGuide:'',
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
        cdnClient:{install:(_:unknown) => Promise<WindowOrWorkerGlobalScope>},
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
            return window[`mkdocs-ts_APIv01`]
        })
    },
    installAuxiliaryModule: ({name, cdnClient, installParameters}:{
        name: string,
        cdnClient:{install:(_:unknown) => Promise<WindowOrWorkerGlobalScope>},
        installParameters?
    }) => {
        const entry = secondaryEntries[name]
        if(!entry){
            throw Error(`Can not find the secondary entry '${name}'. Referenced in template.py?`)
        }
        const parameters = installParameters || {}
        const scripts = [
            ...(parameters.scripts || []),
            `mkdocs-ts#0.1.1~dist/mkdocs-ts/${entry.name}.js`
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
            return window[`mkdocs-ts/${entry.name}_APIv01`]
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
