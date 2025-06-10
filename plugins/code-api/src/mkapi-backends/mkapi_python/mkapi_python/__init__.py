"""
The backend for generating API files for Python projects uses the :ext:`griffe` module as the primary
AST (Abstract Syntax Tree) generator.

The entry point is the function :func:`mkapi_python.py_griffe.generate_api`,
which requires a :class:`mkapi_python.py_griffe.Configuration` instance for proper configuration.


**Usage Example**

The following example demonstrates how to generate API files for a Python module using a python script:

<code-snippet language="python">

from pathlib import Path
from typing import cast

from mkapi_python import generate_api, Configuration, std_links
import griffe

# Define the module name and output directory
NAME = 'py-foo'
# Where the '.json' files will be produced
DST = Path.home() / 'Projects' / 'data-models'

print(f"Generate python API files for python module {NAME}")

# Set up the configuration
config = Configuration(
    external_links=std_links(),
    out=DST,
)

# Load the Griffe AST for the module
griffe_ast = cast(griffe.Module, griffe.load(NAME, submodules=True))

# Generate API files
generate_api(griffe_ast, config)

</code-snippet>

**Installation**

To install `mkapi_python`:
*  Open a terminal in the folder `node_modules/mkdocs-ts/src/mkapi_backends/mkapi_python`
*  Run `pip install .`


**Supported style**

We encourage to use Google-style synthax for docstrings, as documented
:ext:`here<griffe.google-style>`.

Regarding symbols cross-linking, the sphinx syntax is supported,
see :glob:`mkapi_python.py_griffe.SUPPORTED_CROSS_LINK_TAGS`.

<note level="hint">
A pseudo sphinx tag `ext` has been added to link against external URLs (in addition to `mod`, `class`, `func`, *etc.*).
</note>


"""

from .models import *
from .py_griffe import *
from .std_links import *
