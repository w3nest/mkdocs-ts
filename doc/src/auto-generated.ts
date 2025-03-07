/* eslint-disable */
const runTimeDependencies = {
    "externals": {
        "@w3nest/webpm-client": "^0.1.4",
        "mathjax": "^3.1.4",
        "mkdocs-ts": "^0.3.2",
        "rx-vdom": "^0.1.3",
        "rxjs": "^7.5.6"
    },
    "includedInBundle": {}
}
const externals = {
    "@w3nest/webpm-client": "window['@w3nest/webpm-client_APIv01']",
    "mathjax": "window['mathjax_APIv3']",
    "mkdocs-ts": "window['mkdocs-ts_APIv03']",
    "rx-vdom": "window['rx-vdom_APIv01']",
    "rxjs": "window['rxjs_APIv7']"
}
const exportedSymbols = {
    "@w3nest/webpm-client": {
        "apiKey": "01",
        "exportedSymbol": "@w3nest/webpm-client"
    },
    "mathjax": {
        "apiKey": "3",
        "exportedSymbol": "mathjax"
    },
    "mkdocs-ts": {
        "apiKey": "03",
        "exportedSymbol": "mkdocs-ts"
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

const mainEntry: { entryFile: string; loadDependencies: string[] } =
    {
    "entryFile": "./main.ts",
    "loadDependencies": [
        "rxjs",
        "rx-vdom",
        "mkdocs-ts",
        "@w3nest/webpm-client",
        "mathjax"
    ]
}

const secondaryEntries: {
    [k: string]: { entryFile: string; name: string; loadDependencies: string[] }
} = {}

const entries = {
    '@mkdocs-ts/doc': './main.ts',
    ...Object.values(secondaryEntries).reduce(
        (acc, e) => ({ ...acc, [e.name]: e.entryFile }),
        {},
    ),
}
export const setup = {
    name: '@mkdocs-ts/doc',
    assetId: 'QG1rZG9jcy10cy9kb2M=',
    version: '0.3.2-wip',
    webpmPath: '/api/assets-gateway/webpm/resources/QG1rZG9jcy10cy9kb2M=/0.3.2-wip',
    apiVersion: '03',
    runTimeDependencies,
    externals,
    exportedSymbols,
    entries,
    secondaryEntries,
    getDependencySymbolExported: (module: string) => {
        return `${exportedSymbols[module].exportedSymbol}_APIv${exportedSymbols[module].apiKey}`
    },

    installMainModule: ({
        cdnClient,
        installParameters,
    }: {
        cdnClient: {
            install: (_: unknown) => Promise<WindowOrWorkerGlobalScope>
        }
        installParameters?
    }) => {
        const parameters = installParameters || {}
        const scripts = parameters.scripts || []
        const modules = [
            ...(parameters.modules || []),
            ...mainEntry.loadDependencies.map(
                (d) => `${d}#${runTimeDependencies.externals[d]}`,
            ),
        ]
        return cdnClient
            .install({
                ...parameters,
                modules,
                scripts,
            })
            .then(() => {
                return window[`@mkdocs-ts/doc_APIv03`]
            })
    },
    installAuxiliaryModule: ({
        name,
        cdnClient,
        installParameters,
    }: {
        name: string
        cdnClient: {
            install: (_: unknown) => Promise<WindowOrWorkerGlobalScope>
        }
        installParameters?
    }) => {
        const entry = secondaryEntries[name]
        if (!entry) {
            throw Error(
                `Can not find the secondary entry '${name}'. Referenced in template.py?`,
            )
        }
        const parameters = installParameters || {}
        const scripts = [
            ...(parameters.scripts || []),
            `@mkdocs-ts/doc#0.3.2-wip~dist/${entry.name}.js`,
        ]
        const modules = [
            ...(parameters.modules || []),
            ...entry.loadDependencies.map(
                (d) => `${d}#${runTimeDependencies.externals[d]}`,
            ),
        ]
        return cdnClient
            .install({
                ...parameters,
                modules,
                scripts,
            })
            .then(() => {
                return window[`@mkdocs-ts/doc_APIv03`][`${entry.name}`]
            })
    },
    getCdnDependencies(name?: string) {
        if (name && !secondaryEntries[name]) {
            throw Error(
                `Can not find the secondary entry '${name}'. Referenced in template.py?`,
            )
        }
        const deps = name
            ? secondaryEntries[name].loadDependencies
            : mainEntry.loadDependencies

        return deps.map((d) => `${d}#${runTimeDependencies.externals[d]}`)
    },
}
