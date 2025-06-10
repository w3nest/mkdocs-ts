import { generateApiFiles } from '../node_modules/@mkdocs-ts/code-api/src/mkapi-backends/mkapi-typescript'

const w3nestApps = 'https://w3nest.org/apps/'

const externals: any = {
    'rx-vdom': ({ name }: { name: string }) => {
        return `${w3nestApps}/@rx-vdom/doc/latest?nav=/api.${name}`
    },
    'mkdocs-ts': ({ name }: { name: string }) => {
        const baseUrl = `${w3nestApps}/@mkdocs-ts/doc/latest?nav=/api/mkdocs-ts`
        const urls = {
            Navigation: `${baseUrl}.Navigation`,
            'DefaultLayout.NavLayout': `${baseUrl}/DefaultLayout.NavLayout`,
            'DefaultLayout.NavHeader': `${baseUrl}/DefaultLayout.NavHeader`,
            NavHeader: `${baseUrl}/DefaultLayout.NavHeader`,
        }
        return urls[name]
    },
}

generateApiFiles({
    projectFolder: `${__dirname}/..`,
    outputFolder: `${__dirname}/../assets/api`,
    externals,
})
