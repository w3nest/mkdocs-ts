/**
 * This file gathers the models of typedoc's generated outputs.
 *
 * Only the subset used in the backend is described.
 *
 */

/**
 * The kind handles by the backend.
 */
export const TYPEDOC_KINDS = {
    PROJECT: 1,
    ENTRY_MODULE: 2,
    MODULE: 4,
    VARIABLE: 32,
    FUNCTION: 64,
    CLASS: 128,
    INTERFACE: 256,
    CONSTRUCTOR: 512,
    ATTRIBUTE: 1024,
    SIGNATURE: 4096,
    METHOD: 2048,
    ALIAS: 2097152,
}

/**
 * Type definition of all managed possible kinds.
 */
export type Kind = (typeof TYPEDOC_KINDS)[keyof typeof TYPEDOC_KINDS]

/**
 * Comment can have contribution from various kind.
 * Those are the one handled by the backend.
 */
export const DOC_KINDS = {
    /**
     * Simple text.
     */
    TEXT: 'text',
    /**
     * An anchor.
     */
    INLINE_TAG: 'inline-tag',
    /**
     * A code snippet.
     */
    CODE: 'code',
}

/**
 * Simple text element in documentation.
 */
export type DocText = {
    kind: 'text'
    text: string
}

/**
 * Anchor element in documentation.
 */
export type DocInlineTag = {
    kind: 'inline-tag'
    tag: '@link'
    text: string
    target: number
}

/**
 * Code element in documentation.
 */
export type DocCode = {
    kind: 'code'
    text: string
}

/**
 * A typedocNodes in the comment.
 */
export type CommentSection = (DocText | DocInlineTag | DocCode)[]

/**
 * A comment.
 */
export type Comment = {
    /**
     * The summary.
     */
    summary: CommentSection
}

/**
 * Source specification
 */
export type Source = {
    /**
     * Filename including the snippet.
     */
    fileName: string
    /**
     * Starting line.
     */
    line: number
}

/**
 * Trait specific of a symbol.
 */
export type SymbolTrait = {
    sources: Source[]
    typeParameters?: TypedocNode[] | null
}
/**
 * Trait specific of a class.
 */
export type ClassTrait = SymbolTrait & {
    extendedTypes: TypedocNode[] | null
    implementedTypes: TypedocNode[] | null
}

/**
 * Trait specific of a signature.
 */
export type SignatureTrait = SymbolTrait & {
    extendedTypes: TypedocNode[] | null
    implementedTypes: TypedocNode[] | null
    parameters: TypedocNode[] | null
    type: TypedocNode
    comment: string
}
/**
 * Trait specific of a function.
 */
export type SignaturesTrait = SymbolTrait & {
    signatures: (TypedocNode & SignatureTrait)[]
}
export function hasSignatureTrait(node: unknown): node is SignaturesTrait {
    return (
        (node as SignaturesTrait).signatures &&
        (node as SignaturesTrait).signatures.length > 0
    )
}
/**
 * Trait for comment having block tags.
 */
export type BlockTagsTrait = {
    blockTags: { tag: string; content: (DocText | DocInlineTag | DocCode)[] }[]
}
export function hasBlockTagsTrait(node: unknown): node is BlockTagsTrait {
    return (node as BlockTagsTrait).blockTags !== undefined
}

/**
 * Base type for typedoc node.
 */
export type TypedocNode = {
    id: number
    name: string
    kind: Kind
    flags: Record<string, string>
    comment?: Comment
    children: TypedocNode[]
}
/**
 * Trait specific of a method.
 */
export type MethodTrait = SignaturesTrait & {
    inheritedFrom?: {
        type: string
        target: number
        name: string
    }
}

export type InheritedTrait = {
    inheritedFrom: {
        target: number
    }
}
export function hasInheritedTrait(node: unknown): node is InheritedTrait {
    return (node as InheritedTrait).inheritedFrom !== undefined
}

export type SymbolId = {
    sourceFileName: string | null
    qualifiedName: string
}

export type ProjectTrait = {
    symbolIdMap: Record<string, SymbolId>
}
