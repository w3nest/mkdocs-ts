from pathlib import Path
from typing import cast

from mkapi_python import generate_api, Configuration, std_links
import griffe

PROJECT = Path(__file__).parent.parent

print("Generate python API documentation of 'pyrun_backend'")

NAME = "pyrun_backend"
DST = Path(__file__).parent.parent / "assets" / "api" / "notebook" / "Interpreters"

config = Configuration(
    external_links=std_links(),
    out=DST,
)
module_path = PROJECT / "src" / "interpreters" / "pyrun_backend" / "pyrun_backend"

global_doc = cast(
    griffe.Module,
    griffe.load(
        module_path,
        submodules=True,
    ),
)
generate_api(global_doc, config)
