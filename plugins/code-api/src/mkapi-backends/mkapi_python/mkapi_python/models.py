"""
Python version of the target TypeScript [models](@nav/api/CodeApi.models.ts).
"""

# pylint: disable=invalid-name

import dataclasses
from typing import Optional

EntityPath = str
"""
Entity path is the python path of a module, e.g. `moduleFoo.ClassBar.attBaz`.
"""


@dataclasses.dataclass(frozen=True)
class Semantic:
    """
    Semantic representation.

    They represent metadata transmitted to the frontend renderer to display appropriately the elements.
    """

    role: str
    """
    Role, a unique meaning (*e.g.* `Class`, `Interface`, `TypeAlias`, *etc.*).
    """
    labels: list[str]
    """
    Some labels.
    """
    attributes: dict[str, str]
    """
    Some attributes.
    """
    relations: dict[str, list[str]]
    """
    Some relation with other entities (grouped by a category keyword, *e.g.* `InheritedBy`).
    """


@dataclasses.dataclass(frozen=True)
class DocumentationSection:
    """
    Documentation section.
    """

    content: str
    """
    Section's content.
    """
    contentType: str
    """
    Content's type.
    """
    semantic: Semantic
    """
    Associated semantic.
    """
    title: Optional[str] = None
    """
    Section's title.
    """


@dataclasses.dataclass(frozen=True)
class Documentation:
    """
    An entity documentation.
    """

    sections: list[DocumentationSection]
    """
    List of the sections.
    """


@dataclasses.dataclass(frozen=True)
class Code:
    """
    Entity code's description.
    """

    declaration: str
    """
    Entity's declaration.
    """
    filePath: str
    """
    File path in which the declaration is included.
    """
    startLine: int
    """
    Starting line of the declaration.
    """
    endLine: int
    """
    Ending line of the declaration.
    """
    references: dict[str, EntityPath]
    """
    References to other entities in the declaration.
    """
    implementation: Optional[str] = None
    """
    Optional associated implementation.
    """


@dataclasses.dataclass(frozen=True)
class Entity:
    """
    Base structure to represent an entity within the code, e.g. class, structure, function, variable, *etc.*.
    """

    name: str
    """
    Name.
    """
    documentation: Documentation
    """
    Documentation
    """
    code: Code
    """
    Code information.
    """
    semantic: Semantic
    """
    Associated semantic.
    """
    path: EntityPath
    """
    The path (e.g. `ModuleFoo.TypeBar.attrBaz`).
    
    It starts with the library name, each segment separated by `.`.
    """
    navPath: EntityPath
    """
    The navigation path, *e.g.* `@nav/api/submoduleA/Foo.bar`.
    """


Callable = Entity
"""
Type alias for Callable.
"""

Attribute = Entity
"""
Type alias for Attribute.
"""


@dataclasses.dataclass(frozen=True)
class Type(Entity):
    """
    Type representation.
    """

    callables: list[Callable]
    """
    List of owned callable.
    """
    attributes: list[Attribute]
    """
    List of owned attributes.
    """


@dataclasses.dataclass(frozen=True)
class File:
    """
    File representation.
    """

    name: str
    """
    Name.
    """
    path: str
    """
    Path.
    """
    documentation: Documentation
    """
    Documentation.
    """


@dataclasses.dataclass(frozen=True)
class ChildModule:
    """
    Child module representation.
    """

    name: str
    """
    Name.
    """
    path: EntityPath
    """
    Path (*e.g.* `ModuleFoo.ModuleBar`).
    """
    isLeaf: bool
    """
    Whether it includes children modules.
    """
    semantic: Semantic
    """
    Associated semantic.
    """
    navPath: EntityPath
    """
    The navigation path, *e.g.* `@nav/api/submoduleA/Foo.bar`.
    """


@dataclasses.dataclass(frozen=True)
# pylint: disable=too-many-instance-attributes
class Module:
    """
    Module representation.
    """

    name: str
    """
    Name.
    """
    documentation: Documentation
    """
    Documentation
    """

    semantic: Semantic
    """
    Associated semantic.
    """
    path: EntityPath
    """
    The path (e.g. `ModuleFoo.TypeBar.attrBaz`).
    """

    children: list[ChildModule]
    """
    Children modules.
    """
    callables: list[Callable]
    """
    Callable components.
    """
    types: list[Type]
    """
    Types components.
    """
    attributes: list[Attribute]
    """
    Attributes components.
    """
    files: list[File]
    """
    Files components.
    """
