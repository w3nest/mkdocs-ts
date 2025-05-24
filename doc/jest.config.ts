import { Config } from 'jest'

const jestConfig: Config = {
    transform: { '^.+\\.tsx?$': ['ts-jest', {}] },
    modulePathIgnorePatterns: [],
}
export default jestConfig
