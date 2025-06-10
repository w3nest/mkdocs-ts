from pathlib import Path
from typing import cast

from mkapi_python import generate_api, Configuration, std_links
import griffe

PROJECT = Path(__file__).parent.parent

print("Generate python API documentation of 'MkApiPython'")

NAME = "mkapi_python"
GRIFFE_URL = "https://mkdocstrings.github.io/griffe/reference"
DST = Path(__file__).parent.parent / "assets" / "api" / "code-api" / "MkApiBackends"

config = Configuration(
    external_links={
        **std_links(),
        "griffe": "https://mkdocstrings.github.io/griffe/",
        "griffe.google-style": "https://mkdocstrings.github.io/griffe/docstrings/#google-style",
        **{
            f"griffe.dataclasses.{name}": f"{GRIFFE_URL}/griffe/#griffe.{name}"
            for name in ["Module", "Class", "Function", "Attribute"]
        },
        "griffe.docstrings.dataclasses.DocstringSection": f"{GRIFFE_URL}/api/docstrings/models/#griffe.DocstringSection",
        "code-api-models": "@nav[code-api].models.ts",
    },
    out=DST,
)
module_path = PROJECT / "src" / "mkapi-backends" / "mkapi_python" / "mkapi_python"

global_doc = cast(
    griffe.Module,
    griffe.load(
        module_path,
        submodules=True,
    ),
)
generate_api(global_doc, config)
