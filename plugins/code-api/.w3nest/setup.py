from shutil import copyfile
from pathlib import Path

from w3nest.ci.ts_frontend import (
    ProjectConfig,
    PackageType,
    Dependencies,
    RunTimeDeps,
    Bundles,
    MainModule,
)
from w3nest.ci.ts_frontend.regular import generate_template
from w3nest.utils import parse_json

project_folder = Path(__file__).parent.parent

pkg_json = parse_json(project_folder / "package.json")

externals_deps = {
    "mkdocs-ts": "^0.5.0",
    "rx-vdom": "^0.1.3",
    "rxjs": "^7.5.6",
    "@w3nest/http-clients": "^0.1.5",
}
in_bundle_deps = {
    "@fortawesome/free-solid-svg-icons": "^6.7.2",
}
dev_deps = {}

config = ProjectConfig(
    path=project_folder,
    type=PackageType.LIBRARY,
    name=pkg_json["name"],
    version=pkg_json["version"],
    shortDescription=pkg_json["description"],
    author=pkg_json["author"],
    dependencies=Dependencies(
        runTime=RunTimeDeps(externals=externals_deps, includedInBundle=in_bundle_deps),
        devTime=dev_deps,
    ),
    bundles=Bundles(
        mainModule=MainModule(
            entryFile="./index.ts",
            loadDependencies=["mkdocs-ts", "rx-vdom", "rxjs", "@w3nest/http-clients"],
            aliases=[],
        ),
    ),
)
template_folder = project_folder / ".w3nest" / ".template"
generate_template(config=config, dst_folder=template_folder)

files = [
    "README.md",
    "package.json",
    ".npmignore",
    # ".prettierignore", Exclude 'src/backends'
    # "tsconfig.json", Add strict null checks
    "jest.config.ts",
    "webpack.config.ts",
]
for file in files:
    copyfile(src=template_folder / file, dst=project_folder / file)
