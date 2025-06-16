import re
from shutil import copyfile
from pathlib import Path

from w3nest.ci.ts_frontend import (
    ProjectConfig,
    PackageType,
    Dependencies,
    RunTimeDeps,
    Bundles,
    MainModule,
    AuxiliaryModule,
)
from w3nest.ci.ts_frontend.regular import generate_template
from w3nest.utils import parse_json

project_folder = Path(__file__).parent.parent

pkg_json = parse_json(project_folder / "package.json")
code_api_pkg_json = parse_json(project_folder / ".." / "code-api" / "package.json")
mkdocs_pkg_json = parse_json(project_folder / ".." / ".." / "package.json")

externals_deps = {
    "mkdocs-ts": f"^{mkdocs_pkg_json['version']}",
    "rx-vdom": "^0.1.3",
    "rxjs": "^7.5.6",
    "@w3nest/rx-tree-views": "^0.2.0",
    "esprima": "^4.0.1",
    "@w3nest/webpm-client": "^0.1.8",
    "@mkdocs-ts/code-api": f"^{code_api_pkg_json['version']}",
}
in_bundle_deps = {
    "prism-code-editor": "^4.0.0",
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
            loadDependencies=[
                "mkdocs-ts",
                "rx-vdom",
                "rxjs",
                "rxjs/fetch",
                "@w3nest/rx-tree-views",
                "esprima",
            ],
            aliases=[],
        ),
        auxiliaryModules=[
            AuxiliaryModule(
                name="Doc",
                entryFile="./doc/index.ts",
                loadDependencies=[
                    "mkdocs-ts",
                    "@mkdocs-ts/code-api",
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
    # ".prettierignore", Exclude 'src/interpreters'
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
    r"(const\s+notebookVersion\s*=\s*')[^']+(')",
    lambda m: f"{m.group(1)}{pkg_json["version"]}{m.group(2)}",
    content,
)
content = re.sub(
    r"(const\s+codeApiVersion\s*=\s*')[^']+(')",
    lambda m: f"{m.group(1)}{code_api_pkg_json["version"]}{m.group(2)}",
    content,
)
content = re.sub(
    r"(const\s+mkdocsVersion\s*=\s*')[^']+(')",
    lambda m: f"{m.group(1)}{mkdocs_pkg_json["version"]}{m.group(2)}",
    content,
)
with open(doc_index_ts, "w") as file:
    file.write(content)
