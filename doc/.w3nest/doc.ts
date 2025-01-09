import { generateApiFiles } from '../../src/backends/ts-typedoc/typedoc-parser'

generateApiFiles({
    projectFolder: `${__dirname}/../../`,
    outputFolder: `${__dirname}/../assets/api`,
    baseNav: '/api',
})
