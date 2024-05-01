import { Subject } from 'rxjs'
import { display } from './display-utils'
import { parseScript } from 'esprima'
import { Scope } from './state'
import { AnyVirtualDOM } from '@youwol/rx-vdom'

/**
 * Execute a given javascript source content.
 *
 * @param _args
 * @param _args.src The source to execute
 * @param _args.scope The entering scope.
 * @param _args.output$ Subject in which output views are sent (when using `display` function).
 * @returns Promise over the scope at exit
 */
export async function executeJs({
    src,
    scope,
    output$,
}: {
    src: string
    scope: Scope
    output$: Subject<AnyVirtualDOM>
}): Promise<Scope> {
    const extractKeys = (obj: { [k: string]: unknown } | string[]) =>
        (Array.isArray(obj) ? obj : Object.keys(obj)).reduce(
            (acc, e) => `${acc} ${e},`,
            '',
        )

    const ast = parseProgram(src)
    const declarations = extractGlobalDeclarations(ast)

    const footer = `
return { 
    const:{ ${extractKeys(scope.const)} ${extractKeys(declarations.const)} },
    let:{ ${extractKeys(scope.let)} ${extractKeys(declarations.let)} }
}
    `

    const srcPatched = `
return async (scope, {display}) => {
    // header
const {${extractKeys(scope.const)}} = scope.const
let {${extractKeys(scope.let)}} = scope.let

    // original src
    
${src}

    // footer
    // e.g
${footer}
}
    `
    const displayInOutput = (element: HTMLElement) => display(element, output$)
    return await new Function(srcPatched)()(scope, { display: displayInOutput })
}
/////
function find_children({
    node,
    skipKeys,
    match,
}: {
    node: unknown
    skipKeys: string[]
    match: (node: unknown) => boolean
}) {
    const references = []

    function traverse(obj: unknown) {
        if (!obj) {
            return
        }
        if (typeof obj === 'object') {
            if (match(obj)) {
                references.push(obj)
            }
            for (const [k, value] of Object.entries(obj)) {
                if (!skipKeys.includes(k)) {
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
    const ast = parseScript(`(async function({webpm}, {display}){${src}})()`)
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
