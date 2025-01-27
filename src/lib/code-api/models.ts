/**
 *  This file gathers the models definition describing an API.
 *
 *  This is the role of backend API generators to construct them and store them appropriately.
 */

/**
 * EntityPath defines ownership between symbols (separated by a dot) and referenced from the actual owning module.
 *
 * *E.g*, for a particular module the attribute `foo` of class `Bar` is `Foo.bar`.
 */
export type EntityPath = string

/**
 * Documentation section.
 */
export interface DocumentationSection {
    /**
     * Section's title.
     */
    title?: string
    /**
     * Associated semantic.
     */
    semantic: Semantic
    /**
     * Section's content.
     */
    content: string
    /**
     * Content's type.
     */
    contentType: string
}

/**
 * An entity documentation.
 */
export interface Documentation {
    /**
     * List of the sections.
     */
    sections: DocumentationSection[]
}

/**
 * Entity code's description.
 */
export interface Code {
    /**
     * Entity's declaration.
     */
    declaration: string
    /**
     * Optional associated implementation.
     */
    implementation?: string
    /**
     * File path in which the declaration is included.
     */
    filePath: string
    /**
     * Starting line of the declaration.
     */
    startLine: number
    /**
     * Ending line of the declaration.
     */
    endLine: number

    /**
     * References to other entities in the declaration.
     */
    references: Record<string, EntityPath>
}

/**
 * Semantic representation.
 *
 * They represent metadata transmitted to the frontend renderer to display appropriately the elements.
 */
export interface Semantic {
    /**
     * Role, a unique meaning (*e.g.* `Class`, `Interface`, `TypeAlias`, *etc.*).
     */
    role: string
    /**
     * Some labels.
     */
    labels: string[]
    /**
     * Some attributes.
     */
    attributes: Record<string, string>
    /**
     * Some relation with other entities (grouped by a category keyword, *e.g.* `InheritedBy`).
     */
    relations: Record<string, EntityPath[]>
}
/**
 * Base structure to represent an entity within the code, e.g. class, structure, function, variable,
 * *etc.*.
 */
export interface Entity {
    /**
     * Name.
     */
    name: string
    /**
     * Documentation.
     */
    documentation: Documentation
    /**
     * Code information.
     */
    code: Code
    /**
     * Semantic associated.
     */
    semantic: Semantic
    /**
     * The path (e.g. `ModuleFoo.TypeBar.attrBaz`).
     *
     * It starts with the library name, each segment separated by `.`.
     */
    path: EntityPath
    /**
     * The navigation path, *e.g.* `@nav/api/submoduleA/Foo.bar`.
     */
    navPath: string
}
/**
 * Callable representation.
 */
export type Callable = Entity

/**
 * Attribute representation.
 */
export type Attribute = Entity

/**
 * Type representation.
 */
export interface Type extends Entity {
    /**
     * List of owned callable.
     */
    callables: Callable[]
    /**
     * List of owned attributes.
     */
    attributes: Attribute[]
}

/**
 * File representation.
 */
export interface File {
    /**
     * Name.
     */
    name: string
    /**
     * Path.
     */
    path: string
    /**
     * Documentation.
     */
    documentation: Documentation
}

/**
 * Child module representation.
 */
export type ChildModule = Omit<Entity, 'code' | 'documentation'> & {
    /**
     * Whether it includes children modules.
     */
    isLeaf: boolean
}

/**
 * Module representation.
 */
export type Module = Omit<Entity, 'code'> & {
    /**
     * Children modules.
     */
    children: ChildModule[]
    /**
     * Callable components.
     */
    callables: Callable[]
    /**
     * Types components.
     */
    types: Type[]
    /**
     * Attributes components.
     */
    attributes: Attribute[]
    /**
     * Files components.
     */
    files: File[]
}

/**
 * Representation of the project to document
 */
export interface Project {
    /**
     * Its name.
     */
    name: string
    /**
     * The base path of the corresponding node in the documentation.
     */
    docBasePath: string
}
