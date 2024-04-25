/**
 * This file gathers parsing function to convert typedoc + typescript data into mkdocs [CodeApi](@nav:/api/CodeApi)
 * models.
 */
import * as Path from 'path'
import {
    TYPEDOC_KINDS,
    ClassTrait,
    CommentSection,
    DocCode,
    DOC_KINDS,
    DocInlineTag,
    DocText,
    TypedocNode,
    ProjectTrait,
    SignaturesTrait,
    SymbolTrait,
} from './typedoc-models'

import { mkdirSync, writeFileSync } from 'node:fs'
import { deleteDirectoryIfExists } from './utils'
import { generateTsInputs, TsSrcElements } from './generate-ts-inputs'
import { generateTypedocInputs } from './generate-typedoc-inputs'
import {
    Attribute,
    Documentation,
    Module,
    Semantic,
    File,
    Type,
    Code,
    Callable,
    ChildModule,
} from '../../lib/code-api'
import fs from 'fs'
import path from 'node:path'

/**
 * Global project information.
 */
export type ProjectGlobals = {
    /**
     * Map `node.id` => navigation path
     */
    navigations: { [k: number]: string }
    /**
     * Map `navigation path` => source information
     */
    tsInputs: TsSrcElements
    /**
     * Map `node.id` => `TypedocNode`
     */
    typedocIdMap: { [k: number]: TypedocNode }
    /**
     * Map `node.id` => parent's node `TypedocNode`
     */
    typedocParentIdMap: { [k: number]: TypedocNode }
}

const noSemantic: Semantic = {
    role: '',
    labels: [],
    attributes: {},
    relations: {},
}
const semantics = {
    [TYPEDOC_KINDS.CLASS]: {
        ...noSemantic,
        role: 'class',
    },
    [TYPEDOC_KINDS.ALIAS]: {
        ...noSemantic,
        role: 'type-alias',
    },
    [TYPEDOC_KINDS.FUNCTION]: {
        ...noSemantic,
        role: 'function',
    },
    [TYPEDOC_KINDS.CONSTRUCTOR]: {
        ...noSemantic,
        role: 'constructor',
    },
    [TYPEDOC_KINDS.METHOD]: {
        ...noSemantic,
        role: 'method',
    },
    [TYPEDOC_KINDS.ATTRIBUTE]: {
        ...noSemantic,
        role: 'attribute',
    },
    [TYPEDOC_KINDS.VARIABLE]: {
        ...noSemantic,
        role: 'global',
    },
    [TYPEDOC_KINDS.INTERFACE]: {
        ...noSemantic,
        role: 'interface',
    },
}

const noDoc: Documentation = {
    sections: [],
}

function getSummaryDoc(content: string, semantic = noSemantic): Documentation {
    return {
        sections: [
            {
                content,
                contentType: 'markdown',
                semantic,
            },
        ],
    }
}

export function gatherTsFiles({
    typedocNode,
}: {
    typedocNode: TypedocNode & ProjectTrait
}) {
    const nodeWithSources = find_children(
        typedocNode,
        (n: TypedocNode) => n['sources'],
    )
    const files = nodeWithSources
        .map(({ sources }) => sources.map((source) => source.fileName))
        .flat()
    return new Set(files)
}
/**
 * Entry point function to generate API files.
 *
 * @param _options The args
 * @param _options.projectFolder The folder of the project to document.
 * @param _options.outputFolder The output folder.
 * @param _options.baseNav The base path of the API node in the navigation (*e.g.* `/api`).
 */
export function generateApiFiles({
    projectFolder,
    outputFolder,
    baseNav,
}: {
    projectFolder: string
    outputFolder: string
    baseNav: string
}) {
    const projectPackageJson = fs.readFileSync(
        path.resolve(projectFolder, 'package.json'),
        'utf8',
    )
    // module name should not include '/', before finding a better solution
    const project = JSON.parse(projectPackageJson).name.split('/').slice(-1)[0]
    function generateApiFilesRec(
        modulePath: string,
        typedocNode: TypedocNode & ProjectTrait,
        tsInputs: TsSrcElements,
        writeFolder: string,
    ) {
        const doc = parseModule({
            baseNav,
            typedocNode,
            modulePath,
            tsInputs: tsInputs,
        })

        const filePath = `${writeFolder}/${modulePath}.json`
        const directory = Path.dirname(filePath)
        // Create missing directories if they don't exist
        mkdirSync(directory, { recursive: true })
        writeFileSync(filePath, JSON.stringify(doc, null, 4) + '\n', 'utf8')

        for (const m of doc.children) {
            generateApiFilesRec(
                m.path.replace('.', '/'),
                typedocNode,
                tsInputs,
                writeFolder,
            )
        }
    }
    deleteDirectoryIfExists(outputFolder)

    const typedocData = generateTypedocInputs(projectFolder)
    const files = gatherTsFiles({ typedocNode: typedocData })
    const tsData = generateTsInputs(projectFolder, files, {})
    generateApiFilesRec(project, typedocData, tsData, outputFolder)
}
const paths = {}

const zeroOrderLevelKinds = [
    TYPEDOC_KINDS.PROJECT,
    TYPEDOC_KINDS.MODULE,
    TYPEDOC_KINDS.ENTRY_MODULE,
]
const firstLevelKinds = [
    TYPEDOC_KINDS.CLASS,
    TYPEDOC_KINDS.ALIAS,
    TYPEDOC_KINDS.FUNCTION,
    TYPEDOC_KINDS.VARIABLE,
    TYPEDOC_KINDS.INTERFACE,
]

const secondLevelKinds = [
    TYPEDOC_KINDS.METHOD,
    TYPEDOC_KINDS.ATTRIBUTE,
    TYPEDOC_KINDS.CONSTRUCTOR,
]

export function generateNavigationPathsInModule(
    basePath: string,
    module: string,
    elem: TypedocNode,
) {
    const toNav = (p: string) => `@nav${p.replace('//', '/')}`
    for (const child of elem?.children || []) {
        if (zeroOrderLevelKinds.includes(child.kind)) {
            paths[child.id] = toNav(`${basePath}/${module}/${child.name}`)
            generateNavigationPathsInModule(
                basePath,
                `${module}/${child.name}`,
                child,
            )
            continue
        }
        if (firstLevelKinds.includes(child.kind)) {
            paths[child.id] = toNav(`${basePath}/${module}.${child.name}`)
            const children = find_children(child, (n: TypedocNode) =>
                secondLevelKinds.includes(n.kind),
            )
            children.forEach((c) => {
                paths[c.id] = toNav(
                    `${basePath}/${module}.${child.name}.${c.name}`,
                )
            })
            continue
        }
        generateNavigationPathsInModule(basePath, module, child)
    }
    return paths
}

/**
 * Parse a module from typedoc & TS inputs.
 *
 * @param _args the arguments
 * @param _args.typedocNode Typedoc's module node.
 * @param _args.modulePath The module path.
 * @param _args.tsInputs The (global) typescript inputs.
 * @param _args.basePath The base path of the API node in the navigation (*e.g.* `/api`).
 */
export function parseModule({
    typedocNode,
    modulePath,
    tsInputs,
    baseNav,
}: {
    typedocNode: TypedocNode
    modulePath: string
    tsInputs: TsSrcElements
    baseNav: string
}): Module {
    const symbolIdMap: { [key: number]: TypedocNode } = {}
    const parentSymbolIdMap: { [key: number]: TypedocNode } = {}
    const navMap = generateNavigationPathsInModule(baseNav, '', typedocNode)
    function constructSymbolsMap(elem: TypedocNode, parentId: number | null) {
        symbolIdMap[elem.id] = elem
        if (parentId) {
            parentSymbolIdMap[elem.id] = symbolIdMap[parentId]
        }
        if (!elem.children) {
            return
        }
        for (const child of elem.children) {
            constructSymbolsMap(child, elem.id)
        }
    }

    constructSymbolsMap(typedocNode, null)
    const projectGlobals: ProjectGlobals = {
        navigations: navMap,
        tsInputs,
        typedocIdMap: symbolIdMap,
        typedocParentIdMap: parentSymbolIdMap,
    }

    function getModuleRec(fromElem: TypedocNode, parts: string[]): TypedocNode {
        if (parts.length === 0) {
            return fromElem
        }
        if (
            parts.length === 1 &&
            fromElem.name === parts[0] &&
            [TYPEDOC_KINDS.PROJECT, TYPEDOC_KINDS.MODULE].includes(
                fromElem.kind,
            )
        ) {
            return fromElem
        }
        const child = fromElem.children.find(
            (c) =>
                [TYPEDOC_KINDS.MODULE, TYPEDOC_KINDS.ENTRY_MODULE].includes(
                    c.kind,
                ) && c.name === parts[0],
        )
        if (child) {
            return getModuleRec(child, parts.slice(1))
        }
        throw new Error(`Module not found: ${parts.join('.')}`)
    }

    const module = getModuleRec(typedocNode, modulePath.split('/').slice(1))

    if (
        ![
            TYPEDOC_KINDS.MODULE,
            TYPEDOC_KINDS.PROJECT,
            TYPEDOC_KINDS.ENTRY_MODULE,
        ].includes(module.kind)
    ) {
        throw new Error(`Kind of module not knows (got ${module.kind})`)
    }

    const path = modulePath

    const subModules = module.children.filter((child) =>
        [TYPEDOC_KINDS.MODULE, TYPEDOC_KINDS.ENTRY_MODULE].includes(child.kind),
    )
    const types = module.children
        .filter((child) =>
            [
                TYPEDOC_KINDS.CLASS,
                TYPEDOC_KINDS.INTERFACE,
                TYPEDOC_KINDS.ALIAS,
            ].includes(child.kind),
        )
        .filter((cls) => cls.comment)
        .map((cls) => cls as unknown as TypedocNode & SymbolTrait & ClassTrait)
        .map((cls) =>
            parseType({
                typedocNode: cls,
                parentPath: path,
                projectGlobals,
            }),
        )
    const functions = module.children
        .filter((child) => child.kind === TYPEDOC_KINDS.FUNCTION)
        .map((func) => func as unknown as TypedocNode & SignaturesTrait)
        .filter((func) => func.signatures[0].comment)
        .map((func) =>
            parseCallable({
                typedocNode: func,
                parentPath: path,
                projectGlobals,
                semantic: { ...noSemantic, role: 'function' },
            }),
        )
    const globals = module.children
        .filter((child) => child.kind === TYPEDOC_KINDS.VARIABLE)
        .filter((attr) => attr.comment)
        .map((attr) => attr as unknown as TypedocNode & SymbolTrait)
        .map((attr) =>
            parseAttribute({
                typedocNode: attr,
                projectGlobals,
                parentPath: modulePath,
            }),
        )

    const documentation = module.comment
        ? parseDocumentation({
              semantic: noSemantic,
              typedocNode: module.comment.summary,
              parent: module,
              projectGlobals,
          })
        : noDoc

    const files = [
        ...new Set(
            module.children.map((child) => child['sources'][0].fileName),
        ),
    ].map((file) => parseFile({ path: file, projectGlobals }))

    return {
        name: module.name,
        documentation,
        path: '',
        attributes: globals,
        types: types,
        callables: functions,
        files,
        children: subModules.map((child) =>
            parseChildModule({ typedocNode: child, parentPath: path }),
        ),
        semantic: noSemantic,
    }
}

/**
 * Parse a child module.
 *
 * @param _args
 * @param _args.typedocNode Input node.
 * @param _args.parentPath Parent path.
 * @returns Ouput structure.
 */
export function parseChildModule({
    typedocNode,
    parentPath,
}: {
    typedocNode: TypedocNode
    parentPath: string
}): ChildModule {
    return {
        name: typedocNode.name,
        path: `${parentPath}.${typedocNode.name}`,
        isLeaf: !typedocNode.children.some((c) =>
            [TYPEDOC_KINDS.MODULE, TYPEDOC_KINDS.ENTRY_MODULE].includes(c.kind),
        ),
    }
}

/**
 * Parse a file.
 *
 * @param _args
 * @param _args.path Path of the file.
 * @param _args.projectGlobals Global project information.
 * @returns Ouput structure.
 */
export function parseFile({
    path,
    projectGlobals,
}: {
    path: string
    projectGlobals: ProjectGlobals
}): File {
    const symbols = projectGlobals.tsInputs
    const comment = symbols[path].comment
    return {
        name: Path.basename(path),
        path: path,
        documentation: {
            sections: [
                {
                    semantic: noSemantic,
                    content: comment,
                    contentType: 'markdown',
                },
            ],
        },
    }
}

/**
 * Parse documentation section.
 *
 * @param _args
 * @param _args.title title of the document section.
 * @param _args.typedocNode Input node.
 * @param _args.parent Parent node.
 * @param _args.projectGlobals Project's global.
 * @returns Documentation structure.
 */
export function parseDocumentation({
    semantic,
    title,
    typedocNode,
    parent,
    projectGlobals,
}: {
    semantic: Semantic
    title?: string
    typedocNode: CommentSection
    parent: TypedocNode
    projectGlobals: ProjectGlobals
}): Documentation {
    return {
        sections: [
            {
                title,
                content: parseDocumentationElements({
                    typedocNodes: typedocNode,
                    parent,
                    projectGlobals,
                }),
                contentType: 'markdown',
                semantic,
            },
        ],
    }
}

function parseDocumentationElements({
    typedocNodes,
    parent,
    projectGlobals,
}: {
    typedocNodes: (DocText | DocInlineTag | DocCode)[]
    parent: TypedocNode
    projectGlobals: ProjectGlobals
}): string {
    return typedocNodes
        .map((element) => {
            if (
                element.kind === DOC_KINDS.TEXT ||
                element.kind === DOC_KINDS.CODE
            ) {
                return element.text
            }
            if (element.kind === DOC_KINDS.INLINE_TAG) {
                if (!('target' in element)) {
                    throw new Error(
                        `Can not resolve @link ${element['text']} in element ${parent.name}`,
                    )
                }
                const ref = projectGlobals.navigations[element.target]
                return `[${element.text}](${ref})`
            }
            return ''
        })
        .join(' ')
}

/**
 * Parse a symbol to extract code information.
 *
 * @param _args
 * @param _args.typedocNode Input node.
 * @param _args.references Symbol's type references in declaration.
 * @param _args.parentElement Parent node of the documentation.
 * @param _args.projectGlobals Project's global.
 * @returns Code element.
 */
export function parseCode({
    typedocNode,
    projectGlobals,
    references,
    parentElement,
}: {
    typedocNode: TypedocNode & SymbolTrait
    projectGlobals: ProjectGlobals
    references: { [_name: string]: string }
    parentElement?: TypedocNode
}): Code {
    const symbols = projectGlobals.tsInputs
    const signatureNode =
        typedocNode['signatures'] && typedocNode['signatures'][0]
    const name = signatureNode?.name || typedocNode.name

    const source = typedocNode.sources[0]
    const file_path = source.fileName
    const key = parentElement
        ? `${file_path}:${parentElement.name}.${name}`
        : `${file_path}:${name}`
    if (!(key in symbols)) {
        console.warn(`Can not find reference of ${key}`)
        return {
            filePath: '',
            declaration: '',
            implementation: '',
            startLine: 1,
            endLine: 2,
            references: {},
        }
    }
    const symbol = symbols[key]
    const implementation = symbol.implementation || ''
    const nav = projectGlobals.navigations[typedocNode.id]
    return {
        filePath: source.fileName,
        declaration: symbol.declaration,
        implementation,
        startLine: source.line,
        endLine: source.line + implementation.split('\n').length,
        references: { [name]: `${nav}`, ...references },
    }
}

/**
 * Parse a callable to extract code information.
 *
 * @param _args
 * @param _args.typedocNode Input node.
 * @param _args.semantic Semantic definition of the callable.
 * @param _args.parentElement Parent node of the documentation.
 * @param _args.projectGlobals Project's global.
 * @returns Callable element.
 */
export function parseCallable({
    typedocNode,
    semantic,
    projectGlobals,
    parentElement,
}: {
    typedocNode: TypedocNode & SignaturesTrait
    parentPath: string
    semantic: Semantic
    projectGlobals?: ProjectGlobals
    parentElement?: TypedocNode
}): Callable {
    const typedocFct = typedocNode.signatures[0]
    const name = typedocFct.name
    const documentation = parseDocumentationElements({
        typedocNodes: typedocFct.comment.summary,
        parent: typedocFct,
        projectGlobals,
    })
    const params_ref = gather_symbol_references(
        typedocFct['parameters'] as unknown as TypedocNode,
        projectGlobals,
    )
    const returns_ref = gather_symbol_references(
        typedocFct.type,
        projectGlobals,
    )
    if (name == 'getScore') {
        console.log('getScore')
    }
    const functionDoc = getSummaryDoc(documentation)
    const parametersDoc = parseArgumentsDoc({
        fromElement: typedocFct,
        title: 'Arguments',
        parentElement: typedocFct,
        projectGlobals,
    })
    const returnsDoc = parseReturnsDoc({
        typedocNode: typedocFct,
        projectGlobals,
    })

    functionDoc.sections.push(
        ...[parametersDoc, returnsDoc].filter((c) => c !== undefined),
    )
    return {
        name: name,
        documentation: functionDoc,
        path: parentElement ? `${parentElement.name}.${name}` : name, //`${typedocFct.sources[0].fileName}:${path}`,
        code: parseCode({
            typedocNode,
            projectGlobals,
            references: {
                ...params_ref,
                ...returns_ref,
            },
            parentElement,
        }),
        semantic,
    }
}

function parseArgumentsDoc({
    fromElement,
    title,
    parentElement,
    projectGlobals,
}: {
    fromElement: TypedocNode | TypedocNode[]
    title: 'Arguments' | 'Generics'
    parentElement: TypedocNode
    projectGlobals: ProjectGlobals
}) {
    type Targeted = TypedocNode & { type: { type: string } }
    const attributes = find_children(
        fromElement,
        (node: TypedocNode & Targeted) => {
            return (
                [1024, 131072, 32768].includes(node.kind) &&
                !node.name.startsWith('_') &&
                node.comment
            )
        },
    )
    if (attributes.length === 0) {
        return
    }
    const md = attributes.reduce((acc, attr) => {
        const doc = parseDocumentationElements({
            typedocNodes: attr.comment.summary,
            parent: parentElement,
            projectGlobals,
        })
        return `${acc}\n*  **${attr.name}**: ${doc}`
    }, '')
    return {
        title,
        content: md,
        contentType: 'markdown',
        semantic: {
            ...noSemantic,
            role: 'arguments',
        },
    }
}

function parseReturnsDoc({
    typedocNode,
    projectGlobals,
}: {
    typedocNode: TypedocNode
    projectGlobals: ProjectGlobals
}) {
    const returnNode = typedocNode.comment?.['blockTags']?.find(
        (block) => block.tag === '@returns',
    )
    if (!returnNode) {
        return
    }
    return {
        title: 'Returns',
        content: parseDocumentationElements({
            typedocNodes: returnNode.content,
            parent: typedocNode,
            projectGlobals,
        }),
        contentType: 'markdown',
        semantic: {
            ...noSemantic,
            role: 'returns',
        },
    }
}

/**
 * Parse a type to extract code information.
 *
 * @param _args
 * @param _args.typedocNode Input node.
 * @param _args.parentPath Parent navigation path.
 * @param _args.projectGlobals Project's global.
 * @returns Type element.
 */
export function parseType({
    typedocNode,
    parentPath,
    projectGlobals,
}: {
    typedocNode: TypedocNode & ClassTrait
    parentPath: string
    projectGlobals: ProjectGlobals
}): Type {
    const name = typedocNode.name
    const semantic = semantics[typedocNode.kind]
    const path = `${parentPath}.${name}`
    const documentation = parseDocumentationElements({
        typedocNodes: typedocNode.comment.summary,
        parent: typedocNode,
        projectGlobals,
    })
    const attributes =
        typedocNode.children?.filter(
            (child) => child.kind === TYPEDOC_KINDS.ATTRIBUTE,
        ) || []
    const methods =
        typedocNode.children?.filter((child) =>
            [TYPEDOC_KINDS.CONSTRUCTOR, TYPEDOC_KINDS.METHOD].includes(
                child.kind,
            ),
        ) || []

    const references = gather_symbol_references(typedocNode, projectGlobals)
    const doc = getSummaryDoc(documentation)
    const tParamDoc = parseArgumentsDoc({
        fromElement: typedocNode.typeParameters,
        title: 'Generics',
        parentElement: typedocNode,
        projectGlobals,
    })
    tParamDoc && doc.sections.push(tParamDoc)
    return {
        name: typedocNode.name,
        documentation: doc,
        path: typedocNode.name,
        attributes: attributes
            .filter((attr) => attr.comment)
            .map((attr) => attr as unknown as TypedocNode & SymbolTrait)
            .map((attr) =>
                parseAttribute({
                    typedocNode: attr,
                    projectGlobals,
                    parentPath: path,
                    parentElement: typedocNode,
                }),
            ),
        callables: methods
            .map((meth) => meth as unknown as TypedocNode & SignaturesTrait)
            .filter((meth) => meth.signatures[0].comment)
            .map((meth) =>
                parseCallable({
                    typedocNode: meth,
                    parentPath: path,
                    projectGlobals,
                    semantic: semantics[meth.kind],
                    parentElement: typedocNode,
                }),
            ),
        code: parseCode({
            typedocNode: typedocNode,
            projectGlobals,
            references,
        }),
        semantic,
    }
}

/**
 * Parse an attribute.
 *
 * @param _args
 * @param _args.typedocNode Input node.
 * @param _args.parentElement Parent node of the documentation.
 * @param _args.projectGlobals Project's global.
 * @returns Callable element.
 */
export function parseAttribute({
    typedocNode,
    projectGlobals,
    parentElement,
}: {
    typedocNode: TypedocNode & SymbolTrait
    projectGlobals: ProjectGlobals
    parentPath: string
    parentElement?: TypedocNode
}): Attribute {
    const name = typedocNode.name
    if (typedocNode['inheritedFrom']) {
        typedocNode = projectGlobals.typedocIdMap[
            typedocNode['inheritedFrom'].target
        ] as TypedocNode & SymbolTrait
        parentElement = projectGlobals.typedocParentIdMap[typedocNode.id]
    }
    const references = gather_symbol_references(typedocNode, projectGlobals)
    const documentation = parseDocumentationElements({
        typedocNodes: typedocNode.comment.summary,
        parent: parentElement,
        projectGlobals,
    })
    const semantic = semantics[typedocNode.kind]
    return {
        name: name,
        semantic: semantic,
        documentation: getSummaryDoc(documentation),
        path: parentElement ? `${parentElement.name}.${name}` : name,
        code: parseCode({
            typedocNode: typedocNode,
            projectGlobals,
            references,
            parentElement,
        }),
    }
}

function find_children(jsonObject: unknown, match) {
    const references = []

    function traverse(obj: unknown) {
        if (!obj) {
            return
        }
        if (typeof obj === 'object') {
            if (match(obj)) {
                references.push(obj)
            }
            for (const value of Object.values(obj)) {
                traverse(value)
            }
        } else if (Array.isArray(obj)) {
            for (const item of obj) {
                traverse(item)
            }
        }
    }

    traverse(jsonObject)
    return references
}

function find_references(jsonObject: unknown) {
    const references = []

    function traverse(obj: unknown) {
        if (!obj) {
            return
        }
        if (typeof obj === 'object') {
            if (obj['type'] === 'reference') {
                references.push(obj)
            }
            for (const value of Object.values(obj)) {
                traverse(value)
            }
        } else if (Array.isArray(obj)) {
            for (const item of obj) {
                traverse(item)
            }
        }
    }

    traverse(jsonObject)
    return references
}

function gather_symbol_references(
    element: { [k: string]: unknown },
    projectGlobals: ProjectGlobals,
) {
    const refs = find_references(element)
    const result: { [key: string]: string } = {}
    refs.forEach((ref) => {
        if (typeof ref.target === 'number') {
            const link = projectGlobals.navigations[ref.target]
            result[ref.name] = link ? `${link}` : ref.target.toString()
        }
    })
    return result
}
