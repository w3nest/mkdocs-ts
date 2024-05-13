import {
    executeJs,
    extractUndefinedReferences,
    extractGlobalDeclarations,
    parseProgram,
} from '../lib/notebook/js-execution'
import { Subject } from 'rxjs'

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
    const invalidated$ = new Subject()
    scope = await executeJs({
        src: `
const x = 2
let y = 3
`,
        scope,
        output$: undefined,
        load: undefined,
        invalidated$,
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
        load: undefined,
        invalidated$,
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
        load: undefined,
        invalidated$,
    })
    expect(scope).toEqual({
        const: { x: 2, foo: { z: 6 }, bar: { a: 12 } },
        let: { y: 4 },
    })
})

test('extract referenced variable', () => {
    const input = `
const x = 2
let y = 3

{  
    const foo = 5
}
const bar = { z: var1 + y}

{  
    let baz = var3.y
} 

const { alpha, beta } = { alpha:10, beta: 11}
let { gamma: [a, b] } = { gamma: [3, 4] }
console.log(var2.z)
y = 5
function baz(i, j, {k, l}, [m,{n,o}]){
    return a + i + j + k + l + m + n + o + var4.x.y
}
`
    const body = parseProgram(input)
    const ids = extractUndefinedReferences(body)
    expect(ids).toEqual(['var1', 'console', 'var2', 'var3', 'var4'])
})
