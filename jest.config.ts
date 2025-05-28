import { Config } from 'jest'

const reporters = ['default', 'jest-junit']

const jestConfig: Config = {
    transform: { '^.+\\.tsx?$': ['ts-jest', {}] },
    testRunner: 'jest-circus',
    testEnvironment: 'jsdom',
    reporters,
    modulePathIgnorePatterns: ['<rootDir>/.w3nest', '<rootDir>/dist'],
    testPathIgnorePatterns: ['plugins'],
}
export default jestConfig
