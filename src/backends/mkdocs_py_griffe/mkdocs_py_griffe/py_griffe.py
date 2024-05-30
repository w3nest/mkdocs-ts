"""
The python backend module to produce API files from python modules.

"""

import dataclasses
import functools
import json
import os
import re
from collections import defaultdict
from pathlib import Path, PosixPath
from typing import Any, Literal, NamedTuple, Sequence

import griffe
from griffe.dataclasses import Alias as AstAlias
from griffe.dataclasses import Attribute as AstAttribute
from griffe.dataclasses import Class as AstClass
from griffe.dataclasses import Docstring as AstDocstring
from griffe.dataclasses import Function as AstFunction
from griffe.dataclasses import Module as AstModule
from griffe.docstrings.dataclasses import (DocstringSection,
                                           DocstringSectionAdmonition,
                                           DocstringSectionParameters,
                                           DocstringSectionReturns,
                                           DocstringSectionText)
from griffe.expressions import ExprName

from mkdocs_py_griffe.models import (Attribute, Callable, ChildModule, Code,
                                     Documentation, DocumentationSection, File,
                                     Module, Semantic, Type)

INIT_FILENAME = "__init__.py"
"""
The '__init__.py' filename to recognize module.
"""


class Configuration(NamedTuple):
    """
    Represents the configuration to generate API files using :func:`generate_api`.
    """

    base_nav: str
    """
    The base URL for the navigation.
    """
    out: Path
    """
    Path of the output folder in which API files are generated.
    """
    external_links: dict[str, str] = {}
    """
    External links to cross-reference, e.g.:
    ```
    {   
        "float": "https://docs.python.org/fr/3/library/stdtypes.html#numeric-types-int-float-complex",
        "list": "https://docs.python.org/3/library/stdtypes.html#lists",
        "dict": "https://docs.python.org/3/library/stdtypes.html#mapping-types-dict",
    }
    ```
    The function :func:`std_links` is available is includes common standard Python links.
    """


class Project(NamedTuple):
    """
    Represents the project, holding global symbols.
    """

    config: Configuration
    """
    The configuration.
    """
    root_ast: AstModule
    """
    The root AST from griffe of the documented module.
    """
    all_symbols: list[str]
    """
    The list of all symbols defined in the documented module.
    """


NO_SEMANTIC = Semantic(role="", labels=[], attributes={}, relations={})
"""
No semantic.
"""

MODULE_SEMANTIC = Semantic(role="module", labels=[], attributes={}, relations={})
"""
Semantic for global variables.
"""

GLOBAL_SEMANTIC = Semantic(role="global", labels=[], attributes={}, relations={})
"""
Semantic for global variables.
"""

FUNCTION_GLOBAL_SEMANTIC = Semantic(
    role="function", labels=[], attributes={}, relations={}
)
"""
Semantic for globals functions.
"""

CLASS_SEMANTIC = Semantic(role="class", labels=[], attributes={}, relations={})
"""
Semantic for class's attributes.
"""

ATTR_SEMANTIC = Semantic(role="attribute", labels=[], attributes={}, relations={})
"""
Semantic for class's attributes.
"""

METHOD_SEMANTIC = Semantic(role="method", labels=[], attributes={}, relations={})
"""
Semantic for class's method.
"""

SphinxCrossLinkTag = Literal['mod', 'class', 'func', 'attr', 'meth', 'glob']
"""
Type of supported tags for sphinx like cross links.
"""

SUPPORTED_CROSS_LINK_TAGS : set[SphinxCrossLinkTag] = {'mod', 'class', 'func', 'attr', 'meth', 'glob'}
"""
The supported tags for sphinx like cross links.

*E.g.*:
```
*  :tag:`symbol`
*  :tag:`a custom text <symbol>`
*  :tag:`a custom text <foo.bar.symbol>`
```
"""

class DocReporter:
    errors: dict[str, set[str]] = defaultdict(set)

    @staticmethod
    def add_error(symbol_path: str, description: str):
        DocReporter.errors[symbol_path].add(description)




def canonical_path(
    ast: AstModule | AstAttribute | AstClass | AstFunction | ExprName,
    project: Project,
):
    return ast.canonical_path.replace(f"{project.root_ast.name}.", "")


class ModuleElements(NamedTuple):
    modules: list[AstModule]
    files: list[AstModule]
    classes: list[AstClass]
    functions: list[AstFunction]
    attributes: list[AstAttribute]


def extract_module(ast: AstModule) -> ModuleElements:

    no_alias = {
        k: v
        for k, v in ast.modules.items()
        if not isinstance(v, griffe.dataclasses.Alias)
    }

    modules = [
        v
        for k, v in no_alias.items()
        if isinstance(v.filepath, PosixPath)
        and v.filepath.name == INIT_FILENAME
        and v.docstring
    ]

    files = [v for k, v in no_alias.items() if k not in modules]
    classes = [
        c
        for v in files
        for c in v.classes.values()
        if isinstance(c, AstClass) and c.docstring
    ]
    functions = [
        f
        for v in files
        for f in v.functions.values()
        if isinstance(f, AstFunction) and f.docstring
    ]
    attributes = [
        a
        for v in files
        for a in v.attributes.values()
        if isinstance(a, AstAttribute) and a.docstring
    ]
    return ModuleElements(
        modules=modules,
        files=files,
        classes=classes,
        functions=functions,
        attributes=attributes,
    )


def is_leaf_module(path: str, project: Project) -> bool:
    module_doc: AstModule = functools.reduce(
        lambda acc, e: acc.modules[e] if e else acc,
        path.split(".")[1:],
        project.root_ast,
    )

    no_alias = {
        k: v for k, v in module_doc.modules.items() if not isinstance(v, AstAlias)
    }
    children = [
        k
        for k, v in no_alias.items()
        if isinstance(v.filepath, PosixPath)
        and v.filepath.name == INIT_FILENAME
        and v.docstring
    ]
    return len(children) == 0


def parse_module(ast: AstModule, path: str, project: Project) -> Module:
    """
    Transforms module documentation as provided by griffe to the mkdocs-ts models.

    Parameters:
        ast: Griffe's module documentation.
        path: The path of the module relative to the root (e.g. `Foo.Bar.Baz`).
        project: Project description.

    Returns:
        The parsed model.
    """
    elements = extract_module(ast=ast)
    children_modules = [
        parse_child_module(ast=m, project=project) for m in elements.modules
    ]
    classes = [
        parse_class(ast=c, project=project) for c in elements.classes if c.has_docstring
    ]
    functions = [
        parse_function(ast=f, semantic=FUNCTION_GLOBAL_SEMANTIC, project=project)
        for f in elements.functions
        if f.has_docstring
    ]
    attributes = [
        parse_attribute(ast=a, semantic=GLOBAL_SEMANTIC, project=project)
        for a in elements.attributes
    ]
    files = [format_file_doc(ast=f, project=project) for f in elements.files]
    sections = get_docstring_sections(ast)

    return Module(
        name=ast.name,
        documentation=format_detailed_docstring(
            sections=sections, parent=ast, project=project
        ),
        semantic=MODULE_SEMANTIC,
        path=path,
        children=children_modules,
        attributes=sorted(attributes, key=lambda m: m.name),
        types=classes,
        callables=functions,
        files=files,
    )


def get_symbol_path(ast: AstClass | AstFunction | AstAttribute | AstModule) -> str:
    path = ast.name
    it = ast
    while it.parent:
        path = f"{it.parent.name}.{path}"
        it = it.parent

    return path


def parse_child_module(ast: AstModule, project: Project) -> ChildModule:
    """
    Transforms sub-module documentation as provided by griffe to the mkdocs-ts models.

    Parameters:
        ast: Griffe's module documentation.
        project: Project description.

    Returns:
        The parsed model.
    """
    return ChildModule(
        name=ast.name,
        path=ast.canonical_path,
        isLeaf=is_leaf_module(path=ast.canonical_path, project=project),
    )


def format_file_doc(ast: AstModule, project: Project) -> File:
    """
    Transforms a file documentation as provided by griffe to the mkdocs-ts models.

    Parameters:
        ast: Griffe's module documentation.
        project: Project description.

    Returns:
        The parsed model.
    """
    return File(
        name=ast.name,
        path=str(ast.filepath.relative_to(project.root_ast.filepath.parent)),
        documentation=format_detailed_docstring(
            get_docstring_sections(ast), parent=ast, project=project
        ),
    )


def parse_function(ast: AstFunction, semantic: Semantic, project: Project) -> Callable:
    """
    Transforms a function documentation as provided by griffe to the mkdocs-ts models.

    Parameters:
        ast: Griffe's function documentation.
        semantic: Target semantic
        project: Project description.

    Returns:
        The parsed model.
    """
    parsed = get_docstring_sections(ast)
    sections = [
        p
        for p in parsed
        if isinstance(p, DocstringSectionText)
        or (isinstance(p, DocstringSectionAdmonition) and p.title != "Return")
    ]
    formatted = format_detailed_docstring(sections, parent=ast, project=project)
    params_doc = parse_parameters(ast, project=project)
    returns_doc = parse_returns(ast, project=project)

    return Callable(
        name=ast.name,
        documentation=Documentation(
            sections=[s for s in [*formatted.sections, returns_doc, params_doc] if s]
        ),
        path=canonical_path(ast=ast, project=project),
        code=parse_code(ast=ast, project=project),
        semantic=semantic,
    )


def parse_class(ast: AstClass, project: Project) -> Type:
    """
    Transforms a class documentation as provided by griffe to the mkdocs-ts models.

    Parameters:
        ast: Griffe's class documentation.
        project: Project description.

    Returns:
        The parsed model.
    """
    bases = find_attributes_of_type(ast.bases, ExprName)
    semantic = Semantic(
        role="class",
        labels=[],
        attributes={},
        relations={"inherits": [b.canonical_path for b in bases]},
    )
    return Type(
        name=ast.name,
        documentation=format_detailed_docstring(
            sections=get_docstring_sections(ast),
            parent=ast,
            project=project,
        ),
        path=canonical_path(ast=ast, project=project),
        semantic=semantic,
        attributes=[
            parse_attribute(ast=attr, semantic=ATTR_SEMANTIC, project=project)
            for attr in ast.attributes.values()
            if attr.docstring and not attr.inherited
        ],
        callables=[
            parse_function(ast=f, semantic=METHOD_SEMANTIC, project=project)
            for f in ast.functions.values()
            if f and f.docstring
        ],
        code=parse_code(ast, project=project),
    )


def parse_parameters(ast: AstFunction, project: Project) -> DocumentationSection | None:
    """
    Transforms a function's parameters documentation as provided by griffe to the mkdocs-ts models.

    Parameters:
        ast: Griffe's function documentation.
        project: Project description.

    Returns:
        The parsed model.
    """
    parsed = get_docstring_sections(ast)

    params = next(
        (p for p in parsed if isinstance(p, DocstringSectionParameters)), None
    )

    def format_param(e):
        with_links = replace_links(
            e.description, parent=ast.canonical_path, project=project
        )
        return f"*  **{e.name}**: {with_links}"

    if not params:
        return None

    content = functools.reduce(
        lambda acc, e: f"{acc}\n{format_param(e)}", params.value, ""
    )
    return DocumentationSection(
        title="Arguments",
        content=content,
        contentType="Markdown",
        semantic=Semantic(role="arguments", labels=[], attributes={}, relations={}),
    )


def parse_returns(ast: AstFunction, project: Project) -> DocumentationSection | None:
    """
    Transforms a function's returns documentation as provided by griffe to the mkdocs-ts models.

    Parameters:
        ast: Griffe's function documentation.
        project: Project description.

    Returns:
        The parsed model.
    """

    parsed = get_docstring_sections(ast)

    returns = next(
        (p for p in parsed if isinstance(p, DocstringSectionReturns)),
        None,
    )
    if returns:
        try:
            returns_doc = replace_links(
                returns.value[0].description,
                parent=ast.canonical_path,
                project=project,
            )
            return DocumentationSection(
                title="Returns",
                content=returns_doc,
                contentType="Markdown",
                semantic=Semantic(
                    role="returns", labels=[], attributes={}, relations={}
                ),
            )
        except Exception as e:
            DocReporter.add_error(
                ast.canonical_path,
                f"Failed to parse return of function {ast.name}: {e}",
            )

    return None


def get_docstring_sections(
    ast: AstClass | AstFunction | AstAttribute | AstModule,
):
    if not ast.docstring:
        # This should not normally happen because only symbols with docstring are reported.
        # However, it is possible to request the documentation of a module that do not
        # have docstring.
        DocReporter.add_error(get_symbol_path(ast), "No docstring available")

    docstring_text = ast.docstring.value if ast.docstring else ""

    docstring = AstDocstring(
        docstring_text,
        parent=ast,
    )
    return docstring.parse("google")


def replace_links(text: str, parent: str, project: Project) -> str:

    cross_ref_pattern = r":(\w+):`([^`]+)`"

    def get_cross_link_candidates(
        link_type: SphinxCrossLinkTag, short_link: str, all_symbols: list[str]
    ):
        short_link_sanitized = (
            short_link if short_link.startswith("youwol") else f".{short_link}"
        )
        parent = ".".join(short_link_sanitized.split(".")[0:-1])

        return (
            [s for s in all_symbols if s.endswith(short_link_sanitized)]
            if link_type in {"mod", "class", "func", "glob"}
            else [s for s in all_symbols if s.endswith(parent)]
        )

    def pick_best_candidate(candidates: list[str]) -> str | None:
        if not candidates:
            return None

        if len(candidates) == 1:
            return candidates[0]
        longest_prefix = [
            os.path.commonprefix([parent, candidate]) for candidate in candidates
        ]
        best_index, _ = max(enumerate(longest_prefix), key=lambda x: len(x[1]))
        return candidates[best_index]

    def replace_function(match: re.Match):
        tag = match.group(1)  # Capture the tag (e.g., func, class, etc.)
        # Capture the value between the backticks
        # (e.g., 'module.foo' or 'custom text <module.foo>')
        content = match.group(2)
        py_path = content
        text = py_path.split(".")[-1]
        pattern = r"<([^>]+)>"
        # Find all matches in the text
        matches = re.findall(pattern, py_path)
        if matches:
            index_start = py_path.find("<")
            text = py_path[0:index_start]
            py_path = match[0]

        candidates = get_cross_link_candidates(
            link_type=tag,
            short_link=py_path,
            all_symbols=project.all_symbols,
        )
        best = pick_best_candidate(candidates)
        if not best:
            print(
                f"[{parent}] => Can not cross reference symbol with path '{py_path}'."
            )
            return f":{tag}:`{content}`"
        if tag in SUPPORTED_CROSS_LINK_TAGS:
            return f"[{text}](@nav{project.config.base_nav}.{best})"

        print(f"[{parent}] => The tag '{tag}' is not known.")
        return f":{tag}:`{content}`"

    return re.sub(cross_ref_pattern, replace_function, text)


def format_detailed_docstring(
    sections: Sequence[DocstringSection],
    parent: AstFunction | AstClass | AstAttribute | AstModule,
    project: Project,
) -> Documentation:
    def admonition(v: DocstringSectionAdmonition) -> DocumentationSection:
        return DocumentationSection(
            content=replace_links(
                v.value.description, parent=parent.canonical_path, project=project
            ),
            contentType="Markdown",
            semantic=Semantic(
                role="admonition",
                labels=[],
                attributes={
                    "tag": (
                        v.value.annotation
                        if isinstance(v.value.annotation, str)
                        else None
                    )
                },
                relations={},
            ),
            title=v.title,
        )

    def text(v: DocstringSectionText) -> DocumentationSection:
        return DocumentationSection(
            content=replace_links(
                v.value, parent=parent.canonical_path, project=project
            ),
            contentType="Markdown",
            semantic=Semantic(role="text", labels=[], attributes={}, relations={}),
            title=v.title,
        )

    def factory(v: DocstringSection):
        if isinstance(v, DocstringSectionAdmonition):
            return admonition(v)
        if isinstance(v, DocstringSectionText):
            return text(v)
        return None

    formatted = [factory(s) for s in sections]
    return Documentation(sections=[s for s in formatted if s])


def parse_attribute(
    ast: AstAttribute, semantic: Semantic, project: Project
) -> Attribute:
    """
    Transforms an attribute documentation as provided by griffe to the mkdocs-ts models.

    Parameters:
        ast: Griffe's module documentation.
        semantic: Target semantic.
        project: Project description.

    Returns:
        The parsed model.
    """
    sections = get_docstring_sections(ast)
    documentation = format_detailed_docstring(
        sections=sections, parent=ast, project=project
    )
    return Attribute(
        name=ast.name,
        semantic=semantic,
        documentation=documentation,
        path=canonical_path(ast=ast, project=project),
        code=parse_code(ast=ast, project=project),
    )


def extract_function_declaration(
    function_str,
):
    def_index = function_str.find("def")
    no_decorator = function_str[def_index:]
    close_parenthesis_index = no_decorator.find(")")
    remaining = no_decorator[close_parenthesis_index:]
    end_index = remaining.find(":")
    return function_str[0 : def_index + close_parenthesis_index + end_index]


def extract_class_declaration(class_str):
    index_doc_start = class_str.find('"""')
    return class_str[0:index_doc_start].rstrip()[0:-1]


def parse_code(ast: AstClass | AstFunction | AstAttribute, project: Project) -> Code:
    """
    Transforms a code documentation from class, function or attribute provided by griffe to the mkdocs-ts models.

    Parameters:
        ast: Griffe's module documentation.
        project: Project description.

    Returns:
        The parsed model.
    """

    def get_nav_path(e: ExprName | AstClass | AstFunction):
        py_path = e.canonical_path
        if py_path.startswith(project.root_ast.name):
            return f"@nav{project.config.base_nav}.{canonical_path(ast=e, project=project)}"
        if py_path in project.config.external_links:
            return project.config.external_links[py_path]
        print("Link unknown", e.canonical_path)
        return e.canonical_path

    file_path = str(ast.filepath.relative_to(project.root_ast.filepath.parent))
    start_line = ast.lineno
    end_line = ast.endlineno
    references = {}
    implementation = ""
    declaration = ""
    if isinstance(ast, AstAttribute):
        types_annotation = find_attributes_of_type(ast.annotation, ExprName)
        types_value = find_attributes_of_type(ast.value, ExprName)
        declaration = functools.reduce(lambda acc, e: f"{acc}\n{e}", ast.lines)
        implementation = None
        references = {
            e.name: get_nav_path(e=e) for e in [*types_annotation, *types_value]
        }

    if isinstance(ast, AstFunction):
        types_annotation = find_attributes_of_type(ast.annotation, ExprName)
        returns_annotation = find_attributes_of_type(ast.returns, ExprName)
        parameters_annotation = find_attributes_of_type(ast.parameters, ExprName)
        all_annotations = [
            *types_annotation,
            *returns_annotation,
            *parameters_annotation,
        ]
        implementation = functools.reduce(lambda acc, e: f"{acc}\n{e}", ast.lines)
        declaration = extract_function_declaration(implementation)
        references = {
            **{e.name: get_nav_path(e=e) for e in all_annotations},
            ast.name: get_nav_path(e=ast),
        }

    if isinstance(ast, AstClass):
        decorators_annotation = find_attributes_of_type(ast.decorators, ExprName)
        bases_annotation = find_attributes_of_type(ast.bases, ExprName)
        all_annotations = [
            *decorators_annotation,
            *bases_annotation,
        ]
        implementation = functools.reduce(lambda acc, e: f"{acc}\n{e}", ast.lines)
        declaration = extract_class_declaration(implementation)
        references = {
            **{e.name: get_nav_path(e=e) for e in all_annotations},
            ast.name: get_nav_path(e=ast),
        }

    return Code(
        filePath=file_path,
        startLine=start_line,
        endLine=end_line,
        declaration=declaration,
        implementation=implementation,
        references=references,
    )


def find_attributes_of_type(ast: Any, target_type):
    results = []
    primitive_types = (int, float, str, bool, bytes, complex)

    def get_attr_val(obj, attr_name) -> Any | None:
        attr_value = getattr(obj, attr_name, None)
        invalid = any(
            [
                attr_name.startswith("__"),
                attr_name in ["parent"],
                not attr_value,
                isinstance(attr_value, primitive_types),
                isinstance(attr_value, AstModule),
            ]
        )
        return not invalid and attr_value

    def parse_obj(obj):
        attributes = [
            get_attr_val(obj, attr_name)
            for attr_name in dir(obj)
            if get_attr_val(obj, attr_name)
        ]
        for attr_value in attributes:
            if isinstance(attr_value, target_type):
                results.append(attr_value)
                continue
            recursive_search(attr_value)

    def recursive_search(current):

        if isinstance(current, target_type):
            results.append(current)

        if isinstance(current, list):
            for item in current:
                recursive_search(item)
        elif hasattr(current, "__dict__"):
            parse_obj(current)

    recursive_search(ast)
    return results


docs = {}


class DataclassJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, "__dict__"):
            return dataclasses.asdict(obj)
        elif isinstance(obj, (list, tuple)):
            return [self.default(item) for item in obj]
        return json.JSONEncoder.default(self, obj)


def init_symbols(root_ast: AstModule) -> list[str]:

    def patch_path(p: str):
        return p.replace(f"{root_ast.name}.", "")

    def init_symbols_rec(ast: AstModule, depth=0, max_depth=10) -> list[str]:
        if depth > max_depth:
            raise RecursionError("Maximum recursion depth reached")

        elements = extract_module(ast=ast)
        functions = [patch_path(f.canonical_path) for f in elements.functions]
        classes = [patch_path(c.canonical_path) for c in elements.classes]
        attributes = [patch_path(a.canonical_path) for a in elements.attributes]
        sub_modules = [
            e
            for module in elements.modules
            for e in init_symbols_rec(ast=module, depth=depth + 1, max_depth=max_depth)
        ]
        return [
            patch_path(ast.canonical_path),
            *functions,
            *classes,
            *attributes,
            *sub_modules,
        ]

    return init_symbols_rec(ast=root_ast)


def generate_api(root_ast: AstModule, config: Configuration):
    """
    Create documentation API files from an AST parsed by griffe library.

    Parameters:
        root_ast: Root module's AST.
        config: Configuration.
    """

    project = Project(
        config=config,
        root_ast=root_ast,
        all_symbols=init_symbols(root_ast=root_ast),
    )

    def get_doc_rec(module: AstModule, path: str):

        doc = parse_module(module, path, project=project)
        target_path = config.out / f"{path}.json"
        target_path.exists() and target_path.unlink()

        with open(target_path, "w") as json_file:
            json.dump(doc, json_file, cls=DataclassJSONEncoder, indent=4)
        for child in doc.children:
            gr_child = module[child.name]
            get_doc_rec(module=gr_child, path=f"{path}.{child.name}")

    get_doc_rec(module=root_ast, path=root_ast.name)
