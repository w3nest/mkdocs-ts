
const runTimeDependencies = {
    "externals": {
        "rxjs": "^7.5.6",
        "@youwol/mkdocs-ts": "^0.3.2",
        "@youwol/webpm-client": "^3.0.0"
    },
    "includedInBundle": {}
}
const externals = {
    "rxjs": "window['rxjs_APIv7']",
    "@youwol/mkdocs-ts": "window['@youwol/mkdocs-ts_APIv03']",
    "@youwol/webpm-client": "window['@youwol/webpm-client_APIv3']"
}
const exportedSymbols = {
    "rxjs": {
        "apiKey": "7",
        "exportedSymbol": "rxjs"
    },
    "@youwol/mkdocs-ts": {
        "apiKey": "03",
        "exportedSymbol": "@youwol/mkdocs-ts"
    },
    "@youwol/webpm-client": {
        "apiKey": "3",
        "exportedSymbol": "@youwol/webpm-client"
    }
}

const mainEntry : {entryFile: string,loadDependencies:string[]} = {
    "entryFile": "./main.ts",
    "loadDependencies": [
        "rxjs",
        "@youwol/mkdocs-ts",
        "@youwol/webpm-client"
    ]
}

const secondaryEntries : {[k:string]:{entryFile: string, name: string, loadDependencies:string[]}}= {}

const entries = {
     '@youwol/mkdocs-ts-doc': './main.ts',
    ...Object.values(secondaryEntries).reduce( (acc,e) => ({...acc, [`@youwol/mkdocs-ts-doc/${e.name}`]:e.entryFile}), {})
}
export const setup = {
    name:'@youwol/mkdocs-ts-doc',
        assetId:'QHlvdXdvbC9ta2RvY3MtdHMtZG9j',
    version:'0.3.3-wip',
    shortDescription:"Documentation app for project @youwol/mkdocs-ts.",
    developerDocumentation:'https://platform.youwol.com/applications/@youwol/cdn-explorer/latest?package=@youwol/mkdocs-ts-doc&tab=doc',
    npmPackage:'https://www.npmjs.com/package/@youwol/mkdocs-ts-doc',
    sourceGithub:'https://github.com/youwol/mkdocs-ts-doc',
    userGuide:'https://l.youwol.com/doc/@youwol/mkdocs-ts-doc',
    apiVersion:'03',
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
            return window[`@youwol/mkdocs-ts-doc_APIv03`]
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
            `@youwol/mkdocs-ts-doc#0.3.3-wip~dist/@youwol/mkdocs-ts-doc/${entry.name}.js`
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
            return window[`@youwol/mkdocs-ts-doc/${entry.name}_APIv03`]
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
