from pathlib import Path
from typing import cast

from w3nest.utils import parse_json, write_json

from mkapi_python import generate_api, Configuration, std_links
import griffe


print("Generate python API documentation of 'MkApiPython'")

NAME = "mkapi_python"
GRIFFE_URL = "https://mkdocstrings.github.io/griffe/reference"
DST = Path(__file__).parent.parent / "assets" / "api" / "mkdocs-ts" / "MkApiBackends"

config = Configuration(
    base_nav=f"/api/MkApiBackends/mkapi_python",
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


print("Generate python API documentation of 'pyrun_backend'")

NAME = "pyrun_backend"
DST = Path(__file__).parent.parent / "assets" / "api" / "mkdocs-ts" / "Interpreters"

config = Configuration(
    base_nav=f"/api/Interpreters/pyrun_backend",
    external_links={
        **std_links(),
        "fastapi.APIRouter": "https://fastapi.tiangolo.com/reference/apirouter/",
        "fastapi.Depends": "https://fastapi.tiangolo.com/tutorial/dependencies/",
        "fastapi.FastAPI": "https://fastapi.tiangolo.com/reference/fastapi/?h=fastapi",
        "starlette.requests.Request": "https://www.starlette.io/requests/",
        "starlette.responses.Response": "https://www.starlette.io/responses/#response",
        "pydantic.BaseModel": "https://docs.pydantic.dev/latest/api/base_model/",
    },
    out=DST,
)
global_doc = cast(griffe.Module, griffe.load(NAME, submodules=True))
generate_api(global_doc, config)
