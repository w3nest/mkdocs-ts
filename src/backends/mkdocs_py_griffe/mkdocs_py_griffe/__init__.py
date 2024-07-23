"""
The backend for generating API data for python projects using the Python module
<a href="https://mkdocstrings.github.io/griffe/" target="_blank">griffe</a> as the primary AST generator.

The entry point is the function :func:`mkdocs_py_griffe.py_griffe.generate_api`,
providing appropriate :class:`mkdocs_py_griffe.py_griffe.Configuration`.

**Supported style**

We encourage to use Google-style synthax for docstrings, as documented
<a href="https://mkdocstrings.github.io/griffe/docstrings/#google-style" target="_blank">here</a>.

Regarding symbols cross-linking, the sphinx syntax is supported,
see :glob:`mkdocs_py_griffe.py_griffe.SUPPORTED_CROSS_LINK_TAGS`.
"""

from .models import *
from .py_griffe import *
from .std_links import *
