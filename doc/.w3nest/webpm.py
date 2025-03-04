from pathlib import Path
from w3nest.utils import parse_json
from w3nest_client.http.webpm import (
    Package,
    WebApp,
    Distribution,
    FileListing,
    Metadata,
)

project_folder = Path(__file__).parent.parent
pkg_json = parse_json(project_folder / "package.json")

Package(
    name=pkg_json["name"],
    version=pkg_json["version"],
    specification=WebApp.from_pkg_json(pkg_json),
    distribution=Distribution(
        files=FileListing(include=["assets/*", "README.md"], ignore=[]),
        artifacts=["dist"],
    ),
    metadata=Metadata(
        icon="/assets/logo-TS.svg",
        description=pkg_json["description"],
        readme="/README.md",
        license=pkg_json.get("license", None),
    ),
)
