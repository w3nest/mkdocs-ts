from pathlib import Path
from typing import cast

from mkapi_python import generate_api, Configuration, std_links
import griffe

PROJECT = Path(__file__).parent.parent.parent

print("Generate python API documentation of 'MkApiPython'")

NAME = "mkapi_python"
GRIFFE_URL = "https://mkdocstrings.github.io/griffe/reference"
DST = (
    Path(__file__).parent.parent
    / "assets"
    / "api"
    / "code-api"
    / "code-api"
    / "MkApiBackends"
)

config = Configuration(
    base_nav=f"/api/MkApiBackends/mkapi_python",
    external_links={
        **std_links(),
        "griffe": "https://mkdocstrings.github.io/griffe/",
        "griffe.google-style": "https://mkdocstrings.github.io/griffe/docstrings/#google-style",
        **{
            f"griffe.dataclasses.{name}": f"{GRIFFE_URL}/griffe/#griffe.{name}"
            for name in ["Module", "Class", "Function", "Attribute"]
        },
        "griffe.docstrings.dataclasses.DocstringSection": f"{GRIFFE_URL}/api/docstrings/models/#griffe.DocstringSection",
    },
    out=DST,
)
global_doc = cast(
    griffe.Module,
    griffe.load(
        PROJECT
        / "plugins"
        / "code-api"
        / "src"
        / "mkapi-backends"
        / "mkapi_python"
        / "mkapi_python",
        submodules=True,
    ),
)
generate_api(global_doc, config)


print("Generate python API documentation of 'pyrun_backend'")

NAME = "pyrun_backend"
DST = (
    Path(__file__).parent.parent
    / "assets"
    / "api"
    / "notebook"
    / "notebook"
    / "Interpreters"
)

config = Configuration(
    base_nav=f"/api/notebook/Interpreters/pyrun_backend",
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
global_doc = cast(
    griffe.Module,
    griffe.load(
        PROJECT
        / "plugins"
        / "notebook"
        / "src"
        / "interpreters"
        / "pyrun_backend"
        / "pyrun_backend",
        submodules=True,
    ),
)
generate_api(global_doc, config)
