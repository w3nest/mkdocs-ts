import { Observable, Subject } from 'rxjs'
import { display, DisplayFactory } from './display-utils'
import { parseScript } from 'esprima'
import { Output, Scope } from './state'
import { AnyVirtualDOM } from 'rx-vdom'

export function extractKeys(obj: { [k: string]: unknown } | string[]) {
    return (Array.isArray(obj) ? obj : Object.keys(obj)).reduce(
        (acc, e) => `${acc} ${e},`,
        '',
    )
}
/**
 * Execute a given javascript statement. This execution is reactive by default.
 *
 * @param _args
 * @param _args.src The source to execute
 * @param _args.scope The entering scope.
 * @param _args.output$ Subject in which output views are sent (when using `display` function).
 * @param _args.displayFactory Factory to display HTML elements when `display` is called.
 * @param _args.invalidated$ Observable that emits when the associated cell is invalidated.
 * @returns Promise over the scope at exit
 */
export async function executeJsStatement({
    src,
    scope,
    output$,
    displayFactory,
    invalidated$,
}: {
    src: string
    scope: Scope
    output$: Subject<Output>
    displayFactory: DisplayFactory
    invalidated$: Observable<unknown>
}) {
    const displayInOutput = (...element: HTMLElement[]) =>
        display(output$, displayFactory, ...element)
    const ast = parseProgram(src)
    const declarations = extractGlobalDeclarations(ast)
    const patchedReactive = patchReactiveCell({
        ast,
        scope,
        declarations,
        src: `display(${src})`,
    })

    const srcPatched = `
return async (scope, {display, invalidated$, output$}) => {
    // header
const {${extractKeys(scope.const)}} = scope.const
let {${extractKeys(scope.let)}} = scope.let

    // original src
    
${patchedReactive.wrapped}
    
}
    `
    const scopeOut = await new Function(srcPatched)()(scope, {
        display: displayInOutput,
        invalidated$,
        output$,
    })
    console.log('JS statement execution done', { scopeIn: scope, scopeOut })
    return scopeOut
}

/**
 * Execute a given javascript source content.
 *
 * @param _args
 * @param _args.src The source to execute
 * @param _args.scope The entering scope.
 * @param _args.output$ Subject in which output views are sent (when using `display` function).
 * @param _args.displayFactory Factory to display HTML elements when `display` is called.
 * @param _args.load The function used to load a submodule from another notebook page.
 * @param _args.invalidated$ Observable that emits when the associated cell is invalidated.
 * @param _args.reactive If true, observables & promises are resolved before cell execution using a `combineLatest`
 * policy.
 * @returns Promise over the scope at exit
 */
export async function executeJs({
    src,
    scope,
    output$,
    displayFactory,
    load,
    reactive,
    invalidated$,
}: {
    src: string
    scope: Scope
    output$: Subject<AnyVirtualDOM>
    displayFactory: DisplayFactory
    load: (path: string) => Promise<{ [k: string]: unknown }>
    reactive?: boolean
    invalidated$: Observable<unknown>
}): Promise<Scope> {
    const ast = parseProgram(src)
    const declarations = extractGlobalDeclarations(ast)
    const displayInOutput = (...element: HTMLElement[]) =>
        display(output$, displayFactory, ...element)

    let footer = `
return { 
    const:{ ${extractKeys(scope.const)} ${extractKeys(declarations.const)} },
    let:{ ${extractKeys(scope.let)} ${extractKeys(declarations.let)} },
    python:{ ${extractKeys(scope.python)} },
}
    `
    let wrapped = src
    if (reactive) {
        const patched = patchReactiveCell({ ast, scope, declarations, src })
        footer = patched ? patched.footer : footer
        wrapped = patched ? patched.wrapped : wrapped
    }
    const srcPatched = `
return async (scope, {display, output$, load, invalidated$}) => {
    // header
const {${extractKeys({ ...scope.const, ...scope.python })}} = {...scope.const, ...scope.python}
let {${extractKeys(scope.let)}} = scope.let

    // original src
    
${wrapped}
    
    // footer
${footer}
}
    `
    const scopeOut = await new Function(srcPatched)()(scope, {
        display: displayInOutput,
        load,
        invalidated$,
        output$,
    })
    console.log('JS cell execution done', { src, scopeIn: scope, scopeOut })
    return scopeOut
}

function patchReactiveCell({
    ast,
    scope,
    declarations,
    src,
}: {
    ast: unknown
    scope: Scope
    declarations: { const: string[]; let: string[] }
    src: string
}) {
    const undefs = extractUndefinedReferences(ast)

    const observables = Object.entries({
        ...scope.const,
        ...scope.let,
    }).filter(
        ([k, v]) =>
            undefs.includes(k) &&
            (v instanceof Observable || v instanceof Promise),
    ) as unknown as [string, Observable<unknown> | Promise<unknown>][]

    if (observables.length === 0) {
        return undefined
    }
    const keys = observables.reduce((acc, [k, v]) => {
        return v instanceof Observable
            ? `${acc}${k},`
            : `${acc}rxjs.from(${k}),`
    }, '')
    const footerInner = `
return { 
    const:{ ${extractKeys(declarations.const)} },
    let:{ ${extractKeys(declarations.let)} }
}
    `
    const extractKeysOutter = (
        obj: { [k: string]: unknown } | string[],
        type: 'const' | 'let',
    ) =>
        (Array.isArray(obj) ? obj : Object.keys(obj)).reduce(
            (acc, e) =>
                `${acc} ${e}: scope$.pipe( rxjs.map((scope) => scope.${type}.${e})),`,
            '',
        )

    const footer = `
return { 
    const:{ ${extractKeys(scope.const)} ${extractKeysOutter(declarations.const, 'const')} },
    let:{ ${extractKeys(scope.let)} ${extractKeysOutter(declarations.let, 'let')} },
    python:{ ${extractKeys(scope.python)} },
}
    `

    const wrapped = `
const scope$ = rxjs.combineLatest([${keys}]).pipe( 
    rxjs.takeUntil(invalidated$),
    rxjs.map( async ([${keys}]) => {
        output$.next(undefined)
        ${src}
        // Footer
        ${footerInner}
    }), 
    rxjs.switchMap((d) => rxjs.from(d)),
    rxjs.shareReplay({bufferSize:1, refCount: true}))
scope$.subscribe()
            `

    return { wrapped, footer }
}

function find_children({
    node,
    skipKeys,
    skipNode,
    match,
    leafs,
}: {
    node: unknown
    skipKeys?: string[]
    skipNode?: (n) => boolean
    leafs?: (n) => unknown[]
    match: (node: unknown) => boolean
}) {
    const references = []
    skipKeys = skipKeys || []
    skipNode = skipNode || (() => false)
    function traverse(obj: unknown) {
        if (!obj) {
            return
        }
        if (leafs && leafs(obj)) {
            traverse(leafs(obj))
            //references.push(...leafs(obj))
            return
        }
        if (typeof obj === 'object') {
            if (match(obj)) {
                references.push(obj)
            }
            for (const [k, value] of Object.entries(obj)) {
                if (!skipKeys.includes(k) && !skipNode(obj)) {
                    traverse(value)
                }
            }
        } else if (Array.isArray(obj)) {
            for (const item of obj) {
                traverse(item)
            }
        }
    }

    traverse(node)
    return references
}

export function parseProgram(src: string) {
    // Missing the case of '...' not suported by esprima
    const srcPatched = src.replace(/\?\./g, '.')
    const ast = parseScript(
        `(async function({webpm}, {display}){${srcPatched}})()`,
    )
    return ast.body[0].expression.callee.body.body
}

export function extractGlobalDeclarations(body): {
    const: string[]
    let: string[]
} {
    const declarations = body.filter((a) => a['type'] === 'VariableDeclaration')
    const extractName = (d) => {
        //d.init = undefined
        const children = find_children({
            node: d,
            skipKeys: ['init'],
            match: (e) => e['type'] === 'Identifier' && e['name'] !== undefined,
        })
        return children.map((child) => child.name)
    }
    const consts: string[] = declarations
        .filter((d) => d.kind === 'const')
        .map(extractName)
        .flat()
        .filter((d) => d !== undefined)
    const lets: string[] = declarations
        .filter((d) => d.kind === 'let')
        .map(extractName)
        .flat()
        .filter((d) => d !== undefined)

    return {
        const: [...new Set(consts)],
        let: [...new Set(lets)],
    }
}

export function extractUndefinedReferences(body, scope: string[] = []) {
    let allIds = find_children({
        node: body,
        skipNode: (n) =>
            ['BlockStatement', 'FunctionDeclaration'].includes(n.type),
        match: (d) => d['type'] === 'Identifier',
        leafs: (n) => {
            if (n.type === 'CallExpression') {
                return [n.callee.object, ...n.arguments]
            }
            if (n.type === 'FunctionDeclaration') {
                return [n.body]
            }
            if (n.type === 'ObjectExpression') {
                return n.properties.map((p) => p.value)
            }
            if (n.type === 'MemberExpression') {
                return [n.object]
            }
        },
    }).map((n) => n.name)
    allIds = [...new Set(allIds)]
    const declarations = extractGlobalDeclarations(body)
    scope = [...declarations.let, ...declarations.const, ...scope]
    const undefs = allIds.filter((id) => !scope.includes(id))

    const blocks = find_children({
        node: body,
        match: (n) => n['type'] === 'BlockStatement',
        skipNode: (n) => ['FunctionDeclaration'].includes(n.type),
    })
    const undefsBlocks = blocks
        .map((b) => extractUndefinedReferences(b.body, scope))
        .flat()

    const fcts = find_children({
        node: body,
        match: (n) => n['type'] === 'FunctionDeclaration',
    })
    const undefsFct = fcts
        .map((b) => {
            let params = find_children({
                node: b,
                skipKeys: ['body'],
                match: (d) => d['type'] === 'Identifier',
            }).map((n) => n.name)
            params = [...new Set(params)]
            return extractUndefinedReferences(b.body.body, [
                ...scope,
                ...params,
            ])
        })
        .flat()

    return [undefs, ...undefsBlocks, ...undefsFct].flat()
}
