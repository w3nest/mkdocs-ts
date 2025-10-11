from pathlib import Path
from typing import cast

from mkapi_python import generate_api, Configuration, std_links
import griffe

PROJECT = Path(__file__).parent.parent

print("Generate python API documentation of 'pyrun_backend'")

DST = Path(__file__).parent.parent / "assets" / "api" / "notebook" / "Interpreters"

base_path = PROJECT / "src" / "interpreters"

global_doc = cast(
    griffe.Module,
    griffe.load(
        base_path / "pyrun_backend" / "pyrun_backend",
        submodules=True,
    ),
)
generate_api(
    global_doc,
    Configuration(
        external_links=std_links(),
        out=DST,
    ),
)

print("Generate python API documentation of 'cpprun_backend'")

global_doc = cast(
    griffe.Module,
    griffe.load(
        base_path / "cpprun_backend" / "cpprun_backend",
        submodules=True,
    ),
)
generate_api(
    global_doc,
    Configuration(
        external_links=std_links(),
        out=DST,
    ),
)
