import {
    executeJs,
    extractGlobalDeclarations,
    parseProgram,
} from '../lib/notebook/js-execution'

test('extract global declarations 1', () => {
    const input = `
const x = 2
let y = 3

{  
    const foo = 5
}
const bar = { z: x + y}

{  let baz = 5 } 

const { alpha, beta } = { alpha:10, beta: 11}
let { gamma: [a, b] } = { gamma: [3, 4] }

y = 5
`
    const ast = parseProgram(input)
    const declarations = extractGlobalDeclarations(ast)
    expect(declarations).toEqual({
        const: ['x', 'bar', 'alpha', 'beta'],
        let: ['y', 'gamma', 'a', 'b'],
    })
})

test('extract global declarations 2', () => {
    const input = `
const { MkDocs } = await webpm.install({
    modules:['@youwol/mkdocs-ts#0.3.4 as MkDocs']
})
`
    const ast = parseProgram(input)
    const declarations = extractGlobalDeclarations(ast)
    expect(declarations).toEqual({
        const: ['MkDocs'],
        let: [],
    })
})

test('execute', async () => {
    let scope = { const: {}, let: {} }
    scope = await executeJs({
        src: `
const x = 2
let y = 3
`,
        scope,
        output$: undefined,
    })
    expect(scope).toEqual({
        const: { x: 2 },
        let: { y: 3 },
    })
    scope = await executeJs({
        src: `
y = y + 1
const foo = { z: x + y}
`,
        scope,
        output$: undefined,
    })
    expect(scope).toEqual({
        const: { x: 2, foo: { z: 6 } },
        let: { y: 4 },
    })
    scope = await executeJs({
        src: `
const bar = { a: x + foo.z + y }
`,
        scope,
        output$: undefined,
    })
    expect(scope).toEqual({
        const: { x: 2, foo: { z: 6 }, bar: { a: 12 } },
        let: { y: 4 },
    })
})
