/**
 * This file gathers implementations that parse project's source code using typescript's AST parser to
 * extract additional information required by the backend.
 *
 */
import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'

function getScore(s: string) {
    s = s.endsWith('{\n}') ? s.slice(0, -3) : s
    const ignore = [' ', '\n', '\t', ',', ';']
    return [...s]
        .map((char) => {
            if (ignore.includes(char)) {
                return 0
            }
            if (["'", '"', '`'].includes(char)) {
                return "'".charCodeAt(0)
            }
            return char.charCodeAt(0)
        })
        .reduce((acc, e) => acc + e, 0)
}

function getDeclaration(
    node:
        | ts.ClassDeclaration
        | ts.ClassElement
        | ts.FunctionDeclaration
        | ts.MethodDeclaration
        | ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile,
) {
    // can not use getDeclaration for e.g. function foo(): { a: number} {...}
    const methodDeclarationNode = {
        ...node,
        body: undefined,
        methods: [],
        members: [],
        jsDoc: undefined,
    }
    const withDoc = ts
        .createPrinter()
        .printNode(ts.EmitHint.Unspecified, methodDeclarationNode, sourceFile)

    // How to access the jsDoc ?
    const jsDocs = getJsDoc(node)
    const doc: string = jsDocs && jsDocs[0].getText(sourceFile)
    const docLinesCount = doc ? doc.split('\n').length : 0
    const processed = withDoc
        .split('\n')
        .slice(docLinesCount)
        .reduce((acc, e) => acc + '\n' + e, '')
    const commentRegex = /\/\/.*$/gm
    const noComment = processed.replace(commentRegex, '')
    const score = getScore(noComment)

    const raw = node.getText(sourceFile)
    let s = 0
    let i = 0
    for (; i < raw.length; i++) {
        if (i < raw.length - 1 && raw[i] === '/' && raw[i + 1] === '/') {
            while (raw[i] !== '\n') {
                i++
            }
        }
        s += getScore(raw[i])
        if (s >= score) {
            // noinspection BreakStatementJS
            break
        }
    }
    return raw.substring(0, i + 1)
}

function getEscapedName(node: { name?: unknown }): string {
    if (node.name['escapedText']) {
        return node.name['escapedText'] as string
    }
    return node.name ? `${node.name as string}` : ''
}

type JsDoc = { comment: string; getText: (src: ts.SourceFile) => string }

type JsDocTrait = { jsDoc: JsDoc[] }

function getJsDoc(node: unknown): JsDoc[] {
    if (!node || !(node as JsDocTrait).jsDoc) {
        return undefined
    }
    return node['jsDoc'] as JsDoc[]
}

function getPrefix(
    rootPath: string,
    file: string,
    node: ts.NamedDeclaration = undefined,
) {
    if (!node) {
        return file.replace(rootPath, '')
    }
    return `${file.replace(rootPath, '')}:${getEscapedName(node)}`
}

function getFileDoc(node: ts.SourceFile) {
    const jsDoc = getJsDoc(node.statements?.[0])
    if (!jsDoc) {
        return ''
    }
    let parsed = ''
    for (const doc of jsDoc) {
        parsed +=
            typeof doc.comment === 'string'
                ? doc.comment
                : ts.displayPartsToString(doc.comment)
    }
    return parsed
}
/**
 * Process a typescript file to extract associated {@link TsSrcElements}.
 *
 * @param rootPath Project's root path.
 * @param filePath File to process
 * @param elements Dictionary in which new elements are added.
 */
export function processFile(
    rootPath: string,
    filePath: string,
    elements: TsSrcElements,
) {
    const sourceFile = ts.createSourceFile(
        filePath,
        fs.readFileSync(filePath, 'utf8'),
        ts.ScriptTarget.Latest,
    )
    const file = filePath
    function visit(node: ts.Node) {
        if (ts.isSourceFile(node)) {
            elements[getPrefix(rootPath, file)] = {
                comment: getFileDoc(node),
            }
        }
        if (ts.isVariableDeclaration(node) && node.name) {
            elements[getPrefix(rootPath, file, node)] = {
                declaration: node.getText(sourceFile),
            }
        }

        if (ts.isTypeAliasDeclaration(node) && node.name) {
            elements[getPrefix(rootPath, file, node)] = {
                declaration: node.getText(sourceFile),
            }
        }
        if (ts.isFunctionDeclaration(node) && node.name) {
            elements[getPrefix(rootPath, file, node)] = {
                declaration: getDeclaration(node, sourceFile),
                implementation: node.getText(sourceFile),
            }
        }
        if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
            if (ts.isClassDeclaration(node)) {
                const constructor = node.members.find((member) =>
                    ts.isConstructorDeclaration(member),
                )
                if (constructor) {
                    const className = getEscapedName(node)
                    const prefix = `${file.replace(rootPath, '')}:${className}.new ${className}`
                    elements[prefix] = {
                        declaration: getDeclaration(constructor, sourceFile),
                        implementation: constructor.getText(sourceFile),
                    }
                }
            }
            elements[getPrefix(rootPath, file, node)] = {
                declaration: getDeclaration(node, sourceFile),
                implementation: node.getText(sourceFile),
            }
            node.members.forEach((member: ts.Node) => {
                if (ts.isMethodDeclaration(member)) {
                    elements[
                        `${getPrefix(rootPath, file, node)}.${getEscapedName(member)}`
                    ] = {
                        declaration: getDeclaration(member, sourceFile),
                        implementation: member.getText(sourceFile),
                    }
                }
                if (ts.isPropertyDeclaration(member)) {
                    elements[
                        `${getPrefix(rootPath, file, node)}.${getEscapedName(member)}`
                    ] = { declaration: member.getText(sourceFile) }
                }
                if (
                    ts.isPropertySignature(member) ||
                    ts.isMethodSignature(member)
                ) {
                    elements[
                        `${getPrefix(rootPath, file, node)}.${getEscapedName(member)}`
                    ] = { declaration: member.getText(sourceFile) }
                }
            })
        }
        ts.forEachChild(node, visit)
    }

    visit(sourceFile)
}

/**
 * Gather additional source code information w/ typedoc required for parsing
 */
export interface TsSrcElement {
    /**
     * The declaration of the symbol as included in the source file (if any).
     */
    declaration?: string
    /**
     * The implementation of the symbol as included in the source file (if any).
     */
    implementation?: string
    /**
     * The code-comment of the symbol as included in the source file (if any).
     */
    comment?: string
}

/**
 * Gather additional  source code information w/ typedoc required for parsing for all files.
 * Keys are in the form "FILE_PATH:ENTITY_PATH".
 */
export type TsSrcElements = { [k: string]: TsSrcElement }

/**
 * Generate the global dictionary of typescript inputs required for parsing.
 *
 * @param rootPath root path of the project to parse.
 * @param files set of files to process by typescript compiler.
 * @param elements aggregated entities so far.
 */
export function generateTsInputs(
    rootPath: string,
    files: Set<string>,
    elements: TsSrcElements = {},
): TsSrcElements {
    rootPath = rootPath.endsWith('/') ? rootPath : `${rootPath}/`
    files.forEach((file) => {
        const filePath = path.join(rootPath, file)
        processFile(rootPath, filePath, elements)
    })
    return elements
}
