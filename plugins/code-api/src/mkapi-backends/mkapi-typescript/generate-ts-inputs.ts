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
    // eslint-disable-next-line @typescript-eslint/no-misused-spread
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
export function removeExtraIndentation(input: string): string {
    /**
     * When using 'const raw = node.getText(sourceFile)' the first line does not have tabs (expected, its starts with
     * declaration), but it happens that following lines all have extra indentation.
     *
     * The function removes extra leading tabs from the second line onward in a string.
     */
    const lines = input.split('\n')
    if (lines.length <= 1) return input

    // Find the minimum indentation (excluding the first line)
    const minIndent = lines
        .slice(1)
        .filter((line) => line.trim().length > 0)
        .reduce((min, line) => {
            const match = /^\s*/.exec(line)
            const leadingSpaces = match ? match[0].length : 0
            return Math.min(min, leadingSpaces)
        }, Infinity)

    // Remove the extra indentation from the second line onward
    return lines
        .map((line, index) => (index === 0 ? line : line.slice(minIndent)))
        .join('\n')
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
    const doc = jsDocs?.[0].getText(sourceFile)
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
    const declaration = raw.substring(0, i + 1)
    return removeExtraIndentation(declaration)
}

function getImplementation(
    node:
        | ts.ClassDeclaration
        | ts.ClassElement
        | ts.FunctionDeclaration
        | ts.MethodDeclaration
        | ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile,
) {
    return removeExtraIndentation(node.getText(sourceFile))
}

function getEscapedName(
    node: ts.NamedDeclaration,
    srcFile: ts.SourceFile,
): string {
    function hasEscapedTrait(name: unknown): name is { escapedText: string } {
        return (name as { escapedText?: string }).escapedText !== undefined
    }
    if (hasEscapedTrait(node.name)) {
        return node.name.escapedText
    }
    return node.name ? node.name.getText(srcFile) : ''
}

interface JsDoc {
    comment: string | ts.SymbolDisplayPart[]
    getText: (src: ts.SourceFile) => string
}

interface JsDocTrait {
    jsDoc?: JsDoc[]
}

function getJsDoc(node: unknown): JsDoc[] | undefined {
    if (!node || !(node as JsDocTrait).jsDoc) {
        return undefined
    }
    return (node as JsDocTrait).jsDoc
}

function getPrefix({
    rootPath,
    sourceFile,
    node,
}: {
    rootPath: string
    sourceFile: ts.SourceFile
    node?: ts.NamedDeclaration
}) {
    const file = sourceFile.fileName
    if (!node) {
        return file.replace(rootPath, '')
    }
    return `${file.replace(rootPath, '')}:${getEscapedName(node, sourceFile)}`
}

function getFileDoc(node: ts.SourceFile) {
    const jsDoc = getJsDoc(node.statements[0])
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
        const params = {
            rootPath,
            sourceFile,
        }
        if (ts.isSourceFile(node)) {
            elements[getPrefix(params)] = {
                comment: getFileDoc(node),
            }
        }
        if (ts.isVariableDeclaration(node)) {
            elements[getPrefix({ ...params, node })] = {
                declaration: node.getText(sourceFile),
            }
        }

        if (ts.isTypeAliasDeclaration(node)) {
            elements[getPrefix({ ...params, node })] = {
                declaration: node.getText(sourceFile),
            }
        }
        if (ts.isFunctionDeclaration(node)) {
            elements[getPrefix({ ...params, node })] = {
                declaration: getDeclaration(node, sourceFile),
                implementation: getImplementation(node, sourceFile),
            }
        }
        if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
            if (ts.isClassDeclaration(node)) {
                const constructor = node.members.find((member) =>
                    ts.isConstructorDeclaration(member),
                )
                if (constructor) {
                    const className = getEscapedName(node, sourceFile)
                    const prefix = `${file.replace(rootPath, '')}:${className}.${className}`
                    elements[prefix] = {
                        declaration: getDeclaration(constructor, sourceFile),
                        implementation: getImplementation(
                            constructor,
                            sourceFile,
                        ),
                    }
                    // for typedoc < 0.27.0 (I believe, at least was required for 0.26.11)
                    const prefixOld = `${file.replace(rootPath, '')}:${className}.new ${className}`
                    elements[prefixOld] = elements[prefix]
                }
            }
            elements[getPrefix({ ...params, node })] = {
                declaration: getDeclaration(node, sourceFile),
                implementation: getImplementation(node, sourceFile),
            }
            node.members.forEach((member: ts.Node) => {
                if (ts.isMethodDeclaration(member)) {
                    elements[
                        `${getPrefix({ ...params, node })}.${getEscapedName(member, sourceFile)}`
                    ] = {
                        declaration: getDeclaration(member, sourceFile),
                        implementation: getImplementation(member, sourceFile),
                    }
                }
                if (ts.isPropertyDeclaration(member)) {
                    elements[
                        `${getPrefix({ ...params, node })}.${getEscapedName(member, sourceFile)}`
                    ] = { declaration: member.getText(sourceFile) }
                }
                if (
                    ts.isPropertySignature(member) ||
                    ts.isMethodSignature(member)
                ) {
                    elements[
                        `${getPrefix({ ...params, node })}.${getEscapedName(member, sourceFile)}`
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
export type TsSrcElements = Record<string, TsSrcElement>

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
