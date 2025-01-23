import { Observable, Subject } from 'rxjs'
import { display, DisplayFactory } from './display-utils'
import { parseScript } from 'esprima'
import { AstParsingError, Output, RunTimeError, Scope } from './state'
import { ContextTrait, NoContext } from '../context'
/* eslint-disable */

type AstType =
    | 'Identifier'
    | 'VariableDeclaration'
    | 'BlockStatement'
    | 'FunctionDeclaration'
    | 'CallExpression'
    | 'ObjectExpression'
    | 'MemberExpression'
    | 'ClassDeclaration'

export interface AstNode<T extends AstType = AstType> {
    type: T
    name: string
    kind: 'const' | 'let'
}
interface AstBlockStatementTrait {
    body: AstNode
}

function hasBlockStatementTrait(
    node: AstNode,
): node is AstNode & AstCallExpressionTrait {
    return node.type === 'BlockStatement'
}

function isAstNode(node: unknown): node is AstNode {
    if (node === null || typeof node !== 'object') {
        return false
    }
    return 'type' in node
}

interface AstCallExpressionTrait {
    callee: { object: AstNode }
    arguments: AstNode[]
}

function hasCallExpressionTrait(
    node: AstNode,
): node is AstNode & AstCallExpressionTrait {
    return node.type === 'CallExpression'
}

interface AstFunctionDeclarationTrait {
    body: AstNode & { body: AstNode }
}

function hasFunctionDeclarationTrait(
    node: AstNode,
): node is AstNode & AstFunctionDeclarationTrait {
    return node.type === 'FunctionDeclaration'
}

interface AstObjectExpressionTrait {
    properties: { value: AstNode }[]
}

function hasObjectExpressionTrait(
    node: AstNode,
): node is AstNode & AstObjectExpressionTrait {
    return node.type === 'ObjectExpression'
}

interface AstMemberExpressionTrait {
    object: AstNode
}

function hasMemberExpressionTrait(
    node: AstNode,
): node is AstNode & AstMemberExpressionTrait {
    return node.type === 'MemberExpression'
}

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
    
${patchedReactive?.wrapped ?? ''}
    
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
 * @param ctx Execution context used for logging and tracing.
 * @returns Promise over the scope at exit
 */
export async function executeJs(
    {
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
        output$: Subject<Output>
        displayFactory: DisplayFactory
        load: (
            path: string,
            ctx: ContextTrait,
        ) => Promise<{ [_k: string]: unknown }>
        reactive?: boolean
        invalidated$: Observable<unknown>
    },
    ctx?: ContextTrait,
): Promise<Scope> {
    ctx = (ctx || new NoContext()).start('executeJs', ['Exec'])
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
    try {
        const scopeOut = await new Function(srcPatched)()(scope, {
            display: displayInOutput,
            load: (path: string) => load(path, ctx),
            invalidated$,
            output$,
        })
        ctx.info('JS cell execution done', { src, scopeIn: scope, scopeOut })
        ctx.exit()
        return scopeOut
    } catch (e) {
        const evalLoc = extractEvalLocation(e['stack'])
        console.error('Run time exec failure', { e, srcPatched, evalLoc })
        ctx.exit()
        throw new RunTimeError({
            description: e['message'],
            line: evalLoc ? evalLoc.line - 10 : -1,
            column: evalLoc ? evalLoc.column : -1,
            src: src.split('\n'),
            scopeIn: scope,
        })
    }
}

function extractEvalLocation(
    errorMessage: string,
): { line: number; column: number } | null {
    const evalRegex = /eval\s\(eval\sat\s.+?,\s<anonymous>:(\d+):(\d+)\)/
    const match = errorMessage.match(evalRegex)

    if (match && match.length >= 3) {
        return {
            line: parseInt(match[1], 10),
            column: parseInt(match[2], 10),
        }
    }

    return null
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
    node: AstNode
    skipKeys?: string[]
    skipNode?: (n: AstNode) => boolean
    leafs?: (n: AstNode) => AstNode[] | undefined
    match: (node: AstNode) => boolean
}): AstNode[] {
    const references: AstNode[] = []
    function traverse(obj: AstNode | AstNode[]) {
        if (!obj) {
            return
        }
        if (leafs && !Array.isArray(obj)) {
            const nodeLeafs = leafs(obj)
            if (nodeLeafs) {
                traverse(nodeLeafs)
                return
            }
        }
        if (isAstNode(obj)) {
            if (match(obj)) {
                references.push(obj)
            }
            for (const [k, value] of Object.entries(obj)) {
                if (
                    (skipKeys ?? []).includes(k) ||
                    (skipNode ?? (() => false))(obj)
                ) {
                    // noinspection ContinueStatementJS
                    continue
                }
                traverse(value)
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

function patchSpreadOperators(jsCode: string) {
    let stack: any[] = []
    let patchedCode = ''
    let i = 0

    while (i < jsCode.length) {
        const char = jsCode[i]

        if (char === '{' || char === '(' || char === '[') {
            stack.push({ char, index: i })
            patchedCode += char
        } else if (char === '}' || char === ')' || char === ']') {
            stack.pop()
            patchedCode += char
        } else if (jsCode.slice(i, i + 3) === '...') {
            // Peek the stack for the closest opening delimiter
            const closest = stack.length ? stack[stack.length - 1].char : null

            if (closest === '{') {
                patchedCode += '_patch_spread:'
            } else {
                // If the closest is '(' or '[', skip adding '...'
            }
            i += 2 // Skip the next two characters of '...'
        } else {
            patchedCode += char
        }

        i++
    }

    return patchedCode
}

export function parseProgram(src: string): AstNode[] {
    try {
        /*
        We should move to use `acornjs` as javascript AST parser
         */
        let srcPatched = src
            .replace(/\?\./g, '.')
            .replace(/\?\?/g, '||')
            .replace(/\.\[/g, '[')
        srcPatched = patchSpreadOperators(srcPatched)
        // Following '\n' is to avoid error if the last line is commented
        const ast = parseScript(
            `(async function({webpm}, {display}){${srcPatched}\n})()`,
        )
        return ast.body[0].expression.callee.body.body
    } catch (e) {
        console.error('AST parsing failed', e)
        throw new AstParsingError({
            description: e['description'],
            line: e['lineNumber'],
            column: e['column'],
            src: src.split('\n'),
        })
    }
}

export function extractGlobalDeclarations(body: AstNode[]): {
    const: string[]
    let: string[]
} {
    const declarations = body.filter((a) => a.type === 'VariableDeclaration')
    const classes = body.filter((a) => a.type === 'ClassDeclaration')
    const functions = body.filter((a) => a.type === 'FunctionDeclaration')

    const extractName = (d: AstNode) => {
        //d.init = undefined
        const children = find_children({
            node: d,
            skipKeys: ['init'],
            match: (e: AstNode) =>
                e.type === 'Identifier' && e.name !== undefined,
        })
        return children.map((child: { name: string }) => child.name)
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
    const classesName: string[] = classes.map((c) => c['id'].name)
    const functionsName: string[] = functions.map((c) => c['id'].name)

    return {
        const: [
            ...new Set(consts),
            ...new Set(classesName),
            ...new Set(functionsName),
        ],
        let: [...new Set(lets)],
    }
}

export function extractUndefinedReferences(
    body,
    scope: string[] = [],
): string[] {
    let allIds: string[] = find_children({
        node: body,
        skipNode: (n) =>
            ['BlockStatement', 'FunctionDeclaration'].includes(n.type),
        match: (d: AstNode) => d.type === 'Identifier',
        leafs: (n: AstNode): AstNode[] | undefined => {
            if (hasCallExpressionTrait(n)) {
                return [n.callee.object, ...n.arguments]
            }
            if (hasFunctionDeclarationTrait(n)) {
                return [n.body]
            }
            if (hasObjectExpressionTrait(n)) {
                return n.properties.map((p) => p.value)
            }
            if (hasMemberExpressionTrait(n)) {
                return [n.object]
            }
            return undefined
        },
    }).map((n) => n.name)
    allIds = [...new Set(allIds)]
    const declarations = extractGlobalDeclarations(body)
    scope = [...declarations.let, ...declarations.const, ...scope]
    const undefs = allIds.filter((id) => !scope.includes(id))

    const blocks = find_children({
        node: body,
        match: (n) => hasBlockStatementTrait(n),
        skipNode: (n) => ['FunctionDeclaration'].includes(n.type),
    }) as (AstNode<'BlockStatement'> & AstBlockStatementTrait)[]

    const undefsBlocks = blocks
        .map((b) => extractUndefinedReferences(b.body, scope))
        .flat()

    const fcts = find_children({
        node: body,
        match: (n) => hasFunctionDeclarationTrait(n),
    }) as (AstNode<'FunctionDeclaration'> & AstFunctionDeclarationTrait)[]

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
/* eslint-enable */
