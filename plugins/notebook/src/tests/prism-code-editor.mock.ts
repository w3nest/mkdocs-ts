jest.mock('prism-code-editor', () => ({
    createEditor: jest.fn(() => ({})),
}))
jest.mock('prism-code-editor/prism/languages/javascript', () => ({}))
jest.mock('prism-code-editor/prism/languages/python', () => ({}))
jest.mock('prism-code-editor/prism/languages/markdown', () => ({}))
