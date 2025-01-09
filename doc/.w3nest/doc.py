from pathlib import Path
from typing import cast

from w3nest.utils import parse_json, write_json

from mkdocs_py_griffe import generate_api, Configuration, std_links
import griffe


print("Generate python API documentation of 'mkdocs_py_griffe'")

NAME = "mkdocs_py_griffe"
GRIFFE_URL = "https://mkdocstrings.github.io/griffe/reference"
path_backends = (
    Path(__file__).parent.parent / "assets" / "api" / "mkdocs-ts" / "Backends.json"
)

DST = path_backends.parent / "Backends"

config = Configuration(
    base_nav=f"/api/Backends/{NAME}",
    external_links={
        **std_links(),
        **{
            f"griffe.dataclasses.{name}": f"{GRIFFE_URL}/griffe/#griffe.{name}"
            for name in ["Module", "Class", "Function", "Attribute"]
        },
        "griffe.docstrings.dataclasses.DocstringSection": f"{GRIFFE_URL}/api/docstrings/models/#griffe.DocstringSection",
    },
    out=DST,
)
global_doc = cast(griffe.Module, griffe.load(NAME, submodules=True))
generate_api(global_doc, config)

# Patch 'Backends.json' to include python API of 'mkdocs_py_griffe'

print("Patch 'Backends.json' to include python API of 'mkdocs_py_griffe'")

backends = parse_json(path_backends)
backends["children"].append(
    {
        "name": "mkdocs_py_griffe",
        "path": "mkdocs-ts/Backends.mkdocs_py_griffe",
        "isLeaf": True,
    }
)
write_json(backends, path_backends)
