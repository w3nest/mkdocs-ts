import { Config } from 'jest'

const jestConfig: Config = {
    preset: '@youwol/jest-preset',
    modulePathIgnorePatterns: [],
    testPathIgnorePatterns: ['mkdocs-ts-doc'],
}
export default jestConfig
