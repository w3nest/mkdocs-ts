from pathlib import Path
from w3nest.utils import parse_json
from w3nest_client.http.webpm import (
    Package,
    WebApp,
    Distribution,
    FileListing,
    Metadata,
    MainWebApp,
)

project_folder = Path(__file__).parent.parent
pkg_json = parse_json(project_folder / "package.json")

Package(
    name=pkg_json["name"],
    version="0.1.0-wip",
    specification=WebApp(main=MainWebApp(entryPoint=pkg_json["main"])),
    distribution=Distribution(
        files=FileListing(include=[], ignore=[]),
        artifacts=["package"],
    ),
    metadata=Metadata(
        icon="/assets/favicon.svg",
        description="Simple example for MkDocs-TS using JavaScript + NPM",
        readme="/README.md",
    ),
)
