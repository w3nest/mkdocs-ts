from pathlib import Path
from typing import cast

import griffe

from mkdocs_py_griffe import Configuration, generate_api, std_links

NAME = "mkdocs_py_griffe"
BASE_PATH = f"/api/Backends/{NAME}"
GRIFFE_URL = "https://mkdocstrings.github.io/griffe/reference/griffe"
DST = (
    Path(__file__).parent.parent.parent.parent.parent
    / "mkdocs-ts-doc"
    / "assets"
    / "api"
    / "mkdocs-ts"
    / "Backends"
)

config = Configuration(
    base_nav=BASE_PATH,
    external_links={
        **std_links(),
        **{
            f"griffe.dataclasses.{name}": f"{GRIFFE_URL}/#griffe.{name}"
            for name in ["Module", "Class", "Function", "Attribute"]
        },
    },
    out=DST,
)

global_doc = cast(griffe.Module, griffe.load(NAME, submodules=True))
generate_api(global_doc, config)
