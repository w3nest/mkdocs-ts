import re
from shutil import copyfile
from pathlib import Path

from w3nest.ci.ts_frontend import (
    AuxiliaryModule,
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
    "mkdocs-ts": "^0.5.2",
    "rx-vdom": "^0.1.3",
    "rxjs": "^7.5.6",
    "@w3nest/http-clients": "^0.1.5",
    "@w3nest/webpm-client": "^0.1.5",
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
        auxiliaryModules=[
            AuxiliaryModule(
                name="Doc",
                entryFile="./doc/index.ts",
                loadDependencies=[
                    "mkdocs-ts",
                    "@w3nest/webpm-client",
                ],
            )
        ],
    ),
    inPackageJson={
        "scripts": {
            "doc": "(cd .w3nest && npx tsx doc.ts && python doc.py)",
        }
    },
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

doc_index_ts = project_folder / "src" / "doc" / "index.ts"

with open(doc_index_ts, "r") as file:
    content = file.read()

content = re.sub(
    r"(const\s+libraryVersion\s*=\s*')[^']+(')",
    lambda m: f"{m.group(1)}{pkg_json["version"]}{m.group(2)}",
    content,
)

with open(doc_index_ts, "w") as file:
    file.write(content)
