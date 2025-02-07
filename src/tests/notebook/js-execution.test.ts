import {
    executeJs,
    extractUndefinedReferences,
    extractGlobalDeclarations,
    parseProgram,
    Output,
    ExecCellError,
} from '../../lib/notebook'
import { Subject } from 'rxjs'
import { DisplayFactory } from '../../lib/notebook'

const error$ = new Subject<ExecCellError | undefined>()

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

    const ast = parseProgram(input, 'foo')
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

    const ast = parseProgram(input, 'foo')
    const declarations = extractGlobalDeclarations(ast)
    expect(declarations).toEqual({
        const: ['MkDocs'],
        let: [],
    })
})

describe('Class definition', () => {
    it('Should find the class', async () => {
        const input = `
class Foo extends Bar{
    
}
`
        const ast = parseProgram(input, 'foo')
        const declarations = extractGlobalDeclarations(ast)
        expect(declarations).toEqual({
            const: ['Foo'],
            let: [],
        })
    })

    it('Should not find the class', async () => {
        const input = `
{
    class Foo extends Bar{
    
    }
}
`
        const ast = parseProgram(input, 'foo')
        const declarations = extractGlobalDeclarations(ast)
        expect(declarations).toEqual({
            const: [],
            let: [],
        })
    })
})

describe('Function definition', () => {
    it('Should find the function', async () => {
        const input = `
function foo(){
    console.log('foo')
}
`
        const ast = parseProgram(input, 'foo')
        const declarations = extractGlobalDeclarations(ast)
        expect(declarations).toEqual({
            const: ['foo'],
            let: [],
        })
    })

    it('Should not find the function', async () => {
        const input = `
{
    function foo(){
        console.log('foo')
    }
}
`
        const ast = parseProgram(input, 'foo')
        const declarations = extractGlobalDeclarations(ast)
        expect(declarations).toEqual({
            const: [],
            let: [],
        })
    })
})

describe('esprima patches', () => {
    it('tests with `.?`', async () => {
        const displayFactory: DisplayFactory = []
        const invalidated$ = new Subject()
        const scope = await executeJs({
            cellId: 'foo',
            src: `
const x = { y: 2}
let y = x?.y 
`,
            scope: { const: {}, let: {}, python: {} },
            output$: new Subject<Output>(),
            error$,
            displayFactory,
            load: () => Promise.resolve({}),
            invalidated$,
        })
        expect(scope).toEqual({
            const: { x: { y: 2 } },
            let: { y: 2 },
            python: {},
        })
    })
    it('tests with `?.[]`', async () => {
        const displayFactory: DisplayFactory = []
        const invalidated$ = new Subject()
        const scope = await executeJs({
            cellId: 'foo',
            src: `
const x = [1]
let y = x?.[0] 
`,
            scope: { const: {}, let: {}, python: {} },
            output$: new Subject<Output>(),
            error$,
            displayFactory,
            load: () => Promise.resolve({}),
            invalidated$,
        })
        expect(scope).toEqual({
            const: { x: [1] },
            let: { y: 1 },
            python: {},
        })
    })
    it('tests with `...` w/ array', async () => {
        const displayFactory: DisplayFactory = []
        const invalidated$ = new Subject()
        const scope = await executeJs({
            cellId: 'foo',
            src: `
const x = [1]
let y = [...x]
`,
            scope: { const: {}, let: {}, python: {} },
            output$: new Subject<Output>(),
            error$,
            displayFactory,
            load: () => Promise.resolve({}),
            invalidated$,
        })
        expect(scope).toEqual({
            const: { x: [1] },
            let: { y: [1] },
            python: {},
        })
    })
    it('tests with `...` w/ object', async () => {
        const displayFactory: DisplayFactory = []
        const invalidated$ = new Subject()
        const scope = await executeJs({
            cellId: 'foo',
            src: `
const x = { foo : 1 }
let y = { ...x }
`,
            scope: { const: {}, let: {}, python: {} },
            output$: new Subject<Output>(),
            error$,
            displayFactory,
            load: () => Promise.resolve({}),
            invalidated$,
        })
        expect(scope).toEqual({
            const: { x: { foo: 1 } },
            let: { y: { foo: 1 } },
            python: {},
        })
    })
    it('tests with `...` in function', async () => {
        const displayFactory: DisplayFactory = []
        const invalidated$ = new Subject()
        const scope = await executeJs({
            cellId: 'foo',
            src: `
const x = [ 1, 2, 3]
const fct = (v0, v1, v2) => [v0, v1, v2]
const z = fct(...x)
`,
            scope: { const: {}, let: {}, python: {} },
            output$: new Subject<Output>(),
            error$,
            displayFactory,
            load: () => Promise.resolve({}),
            invalidated$,
        })
        expect(scope.const.z).toEqual([1, 2, 3])
    })
})

describe('Errors encountered (& fixed)', () => {
    it('tests with last line commented', async () => {
        const displayFactory: DisplayFactory = []
        const invalidated$ = new Subject()
        const scope = await executeJs({
            cellId: 'foo',
            src: `const x = { y: 2}//let y = x?.y`,
            scope: { const: {}, let: {}, python: {} },
            output$: new Subject<Output>(),
            error$,
            displayFactory,
            load: () => Promise.resolve({}),
            invalidated$,
        })
        expect(scope).toEqual({
            const: { x: { y: 2 } },
            let: {},
            python: {},
        })
    })
})

test('execute', async () => {
    let scope = { const: {}, let: {}, python: {} }
    const displayFactory: DisplayFactory = []
    const invalidated$ = new Subject()
    scope = await executeJs({
        cellId: 'foo',
        src: `
const x = 2
let y = 3
`,
        scope,
        output$: new Subject<Output>(),
        error$,
        displayFactory,
        load: () => Promise.resolve({}),
        invalidated$,
    })
    expect(scope).toEqual({
        const: { x: 2 },
        let: { y: 3 },
        python: {},
    })
    scope = await executeJs({
        cellId: 'foo',
        src: `
y = y + 1
const foo = { z: x + y}
`,
        scope,
        output$: new Subject<Output>(),
        error$,
        displayFactory,
        load: () => Promise.resolve({}),
        invalidated$,
    })
    expect(scope).toEqual({
        const: { x: 2, foo: { z: 6 } },
        let: { y: 4 },
        python: {},
    })
    scope = await executeJs({
        cellId: 'foo',
        src: `
const bar = { a: x + foo.z + y }
`,
        scope,
        output$: new Subject<Output>(),
        error$,
        displayFactory,
        load: () => Promise.resolve({}),
        invalidated$,
    })
    expect(scope).toEqual({
        const: { x: 2, foo: { z: 6 }, bar: { a: 12 } },
        let: { y: 4 },
        python: {},
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

    const body = parseProgram(input, 'foo')
    const ids = extractUndefinedReferences(body)
    expect(ids).toEqual(['var1', 'console', 'var2', 'var3', 'var4'])
})
