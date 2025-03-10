import {
    combineLatest,
    from,
    map,
    Observable,
    Subject,
    switchMap,
    takeUntil,
} from 'rxjs'
import { display } from './display-utils'
import { parseScript } from 'esprima'
import { ExecCellError, Scope } from './state'
import { ContextTrait, NoContext } from '../context'
import { shareReplay } from 'rxjs/operators'
import { ExecInput } from './execution-common'
/* eslint-disable */

/**
 * The different kind of nodes in AST structures.
 */
export type AstType =
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
 * Represents the inputs when executing a JavaScript snippet.
 */
export type ExecJsInput = ExecInput & {
    /**
     * The function used to load a submodule from another notebook page.
     * @param path Navigation path of the page.
     * @param ctx Execution context used for logging and tracing.
     */
    load: (
        path: string,
        ctx: ContextTrait,
    ) => Promise<{ [_k: string]: unknown }>
}

function formatError(params: {
    cellId: string
    e: Error
    scopeIn: Scope
    src: string
    deltaLineInStack: number
}): ExecCellError {
    const { cellId, e, scopeIn, src, deltaLineInStack } = params
    const linesSrc = src.split('\n')
    const base = {
        cellId,
        kind: 'Runtime' as const,
        message: e.message,
        scopeIn,
        src: linesSrc,
    }
    if (!e.stack) {
        return base
    }
    const lines = e.stack.split('\n') ?? []
    const rootIndex = lines.findIndex((l) => l.includes('execute_cell'))
    if (rootIndex === -1) {
        return {
            ...base,
            stackTrace: lines,
        }
    }
    const extracted = lines.slice(0, rootIndex + 1)
    const regex = /eval at (\w+) \(.*:(\d+):\d+\), <anonymous>:(\d+):\d+/
    const match = lines[rootIndex].match(regex)
    if (match) {
        const fctName = match[1]
        const firstLine =
            lines.find((line) => {
                const m = line.match(regex)
                return m && m[1] === fctName
            }) || lines[rootIndex]
        const firstMatch = firstLine.match(regex) || match
        return {
            ...base,
            lineNumber: parseInt(firstMatch[3]) - deltaLineInStack,
            stackTrace: extracted,
        }
    }
    return {
        ...base,
        stackTrace: extracted,
    }
}
/**
 * Execute a given javascript statement. This execution is reactive by default.
 *
 * @param inputs See {@link ExecJsInput}.
 * @returns Promise over the scope at exit
 */
export async function executeJsStatement(inputs: ExecJsInput) {
    return await executeJs$({
        ...inputs,
        src: `display(${inputs.src})`,
    })
}

/**
 * Execute a given **non-reactive** javascript source content.
 *
 * @param inputs  See {@link ExecJsInput}.
 * @param inputs.declarations  Optional parsed declarations if available.
 * @param ctx Execution context used for logging and tracing.
 * @returns Promise over the scope at exit
 */
export async function executeJs(
    inputs: ExecJsInput & { declarations?: { const: string[]; let: string[] } },
    ctx?: ContextTrait,
): Promise<Scope> {
    ctx = (ctx || new NoContext()).start('executeJs', ['Exec'])
    const { src, scope, output$, error$, displayFactory, load, invalidated$ } =
        inputs

    let declarations = inputs.declarations
    if (!declarations) {
        const ast = parseProgram(src, inputs.cellId, error$)
        declarations = extractGlobalDeclarations(ast)
    }
    const displayInOutput = (...element: HTMLElement[]) =>
        display(output$, displayFactory, ...element)

    const srcPatched = `
async function execute_cell(scope, {display, output$, error$, load, invalidated$, formatError, rawSrc}){

    try{
    
        const {${extractKeys({ ...scope.const, ...scope.python })}} = {...scope.const, ...scope.python}
        let {${extractKeys(scope.let)}} = scope.let
${src}
        
        return { 
            const:{ ${extractKeys(scope.const)} ${extractKeys(declarations.const)} },
            let:{ ${extractKeys(scope.let)} ${extractKeys(declarations.let)} },
            python:{ ${extractKeys(scope.python)} },
        }
    }
    catch(e) {
        const error = formatError({cellId:'${inputs.cellId}',e, scopeIn: scope, src: rawSrc, deltaLineInStack:9})
        error$.next(error)
        throw e
    }
}
return execute_cell
`
    let fctUser: Function
    try {
        fctUser = new Function(srcPatched)
    } catch (e) {
        const error = {
            cellId: inputs.cellId,
            kind: 'AST' as const,
            message: e.message,
            scopeIn: inputs.scope,
            src: inputs.src.split('\n'),
        }
        error$.next(error)
        throw e
    }

    const scopeOut = await fctUser()(scope, {
        display: displayInOutput,
        load: (path: string) => load(path, ctx),
        invalidated$,
        output$,
        error$,
        formatError,
        rawSrc: src,
    })
    ctx.info('JS cell execution done', { src, scopeIn: scope, scopeOut })
    ctx.exit()
    return scopeOut
}

/**
 * Execute a given **reactive** javascript source content.
 *
 * @param inputs  See {@link ExecJsInput}.
 * @param ctx Execution context used for logging and tracing.
 * @returns Promise over the scope at exit
 */
export async function executeJs$(
    inputs: ExecJsInput,
    ctx?: ContextTrait,
): Promise<Scope> {
    ctx = (ctx || new NoContext()).start('executeJs$', ['Exec'])

    const { src, error$, scope, invalidated$, output$ } = inputs
    const ast = parseProgram(src, inputs.cellId, error$)
    const declarations = extractGlobalDeclarations(ast)
    const undefs = extractUndefinedReferences(ast)

    ctx.info('Found undefined references in script', undefs)
    const select = (scopeConstLet: Record<string, unknown>) => {
        return Object.entries(scopeConstLet)
            .filter(
                ([k, v]) =>
                    undefs.includes(k) &&
                    (v instanceof Observable || v instanceof Promise),
            )
            .map(([k, v]) => {
                return [k, v instanceof Promise ? from(v) : v]
            }) as unknown as [string, Observable<unknown> | Promise<unknown>][]
    }
    const reactivesConst = select(scope.const)
    const reactivesLet = select(scope.let)
    const reactives = [...reactivesLet, ...reactivesConst]
    ctx.info('Undefined references bound to input scope observable retrieved', {
        reactivesConst,
        reactivesLet,
    })
    const values$ = reactives.map(([_, v]) => v)

    const extractValues = (values: unknown[]) => {
        return values.reduce((acc: Record<string, unknown>, e, i) => {
            const key = reactives[i][0]
            return {
                ...acc,
                [key]: e,
            }
        }, {}) as unknown as Record<string, unknown>
    }
    const scope$ = combineLatest(values$).pipe(
        takeUntil(invalidated$),
        map(async (values) => {
            const reactScope = extractValues(values)
            const patchedScope = {
                ...scope,
                const: { ...scope.const, ...reactScope },
            }
            output$.next(undefined)
            return await executeJs(
                { ...inputs, scope: patchedScope, declarations },
                ctx,
            )
        }),
        switchMap((d) => from(d)),
        shareReplay({ bufferSize: 1, refCount: true }),
    )
    scope$.subscribe()

    const reactScopeConstOut = declarations.const.reduce((acc, k) => {
        return {
            ...acc,
            [k]: scope$.pipe(map((scopeOut) => scopeOut.const[k])),
        }
    }, {})
    const reactScopeLetOut = declarations.let.reduce((acc, k) => {
        return {
            ...acc,
            [k]: scope$.pipe(map((scopeOut) => scopeOut.let[k])),
        }
    }, {})

    ctx.info('Output scope observable created', {
        reactScopeConstOut,
        reactScopeLetOut,
    })
    ctx.exit()
    return {
        ...scope,
        let: { ...scope.let, ...reactScopeLetOut },
        const: { ...scope.const, ...reactScopeConstOut },
    }
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
    skipNode?: (parent: AstNode, key: string, node: AstNode) => boolean
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
                    (skipNode ?? (() => false))(obj, k, value)
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

export function parseProgram(
    src: string,
    cellId: string,
    error$?: Subject<ExecCellError | undefined> | undefined,
): AstNode[] {
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
        const error = {
            cellId,
            kind: 'AST' as const,
            message: e['description'],
            lineNumber: e['lineNumber'],
            column: e['column'],
            src: src.split('\n'),
        }
        error$ && error$.next(error)
        throw e
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
        skipNode: (parent) =>
            ['BlockStatement', 'FunctionDeclaration'].includes(parent.type),
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
        skipNode: (parent) => ['FunctionDeclaration'].includes(parent.type),
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
