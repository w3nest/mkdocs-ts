# Python

---

## Requirements

- `mkdocs_py_griffe` should be available in a python environment:
    -  After having installed the dependencies of your documentation project 
    (the project that defines the documentation application),
    navigate to `node_modules/mkdocs/src/backends/mkdocs_py_griffe`
    -  Run `pip install .`

---

## Usage

To generate the API files:
*  Generate the documentation AST of your module using
   <a href="https://mkdocstrings.github.io/griffe/loading/">griffe.load</a>.
*  Call the function [generate_api](@nav/api/Backends/mkdocs_py_griffe.py_griffe.generate_api)

A typical example:

<code-snippet language="python">
import griffe
from mkdocs_py_griffe import generate_api, Configuration, std_links

config = Configuration(
    base_nav='base/path/url',
    external_links=std_links(),
    out='/output/folder'
)

doc_ast = griffe.load('mkdocs_py_griffe', submodules=True)
generate_api(global_doc, config)
</code-snippet>
