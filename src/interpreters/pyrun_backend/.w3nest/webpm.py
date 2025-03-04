# standard library
import tomllib

from pathlib import Path
from w3nest.utils import FileListing
from w3nest_client.http.webpm import (
    Package,
    Backend,
    MainBackend,
    Distribution,
    FileListing,
    ReadynessProbe,
)

PYPROJECT_TOML = "pyproject.toml"


def parse_toml(project_folder: Path):
    with open(project_folder / PYPROJECT_TOML, "rb") as f:
        return tomllib.load(f)


project = parse_toml(Path(__file__).parent.parent)["project"]
Package(
    name=project["name"],
    version=project["version"],
    specification=Backend(
        main=MainBackend(entryPoint="Dockerfile"),
        deployKind="container",
        readynessProbe=ReadynessProbe(),
    ),
    distribution=Distribution(
        files=FileListing(include=[], ignore=[]),
        artifacts=["package"],
    ),
)
