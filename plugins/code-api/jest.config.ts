import { Config } from 'jest'

const jestConfig: Config = {
    transform: { '^.+\\.tsx?$': ['ts-jest', {}] },
    testRunner: 'jest-circus',
    testEnvironment: 'jsdom',
    modulePathIgnorePatterns: ['<rootDir>/.w3nest', '<rootDir>/dist'],
    coverageDirectory: 'tooling/jest',
}
export default jestConfig
