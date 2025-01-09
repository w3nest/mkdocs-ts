import shutil
import subprocess
from pathlib import Path

from w3nest.ci.ts_frontend import (
    ProjectConfig,
    PackageType,
    Dependencies,
    RunTimeDeps,
    DevServer,
    Bundles,
    MainModule,
)
from w3nest.ci.ts_frontend.regular import generate_template
from w3nest.utils import parse_json, write_json
from typing import cast

import griffe

from mkdocs_py_griffe import generate_api, Configuration, std_links


project_folder = Path(__file__).parent.parent

pkg_json = parse_json(project_folder / "package.json")

pkg_json_name = "package.json"
pkg_json = parse_json(project_folder / pkg_json_name)
pkg_json_mkdocs = parse_json(project_folder / ".." / pkg_json_name)

externals_deps = {
    "rxjs": "^7.5.6",
    "rx-vdom": "^0.1.0",
    "mkdocs-ts": f"^{pkg_json_mkdocs['version'].replace('-wip', '')}",
    "@w3nest/webpm-client": "^0.1.2",
    "mathjax": "^3.1.4",
}
in_bundle_deps = {}
dev_deps = {}

config = ProjectConfig(
    path=project_folder,
    type=PackageType.APPLICATION,
    name=pkg_json["name"],
    version=pkg_json_mkdocs["version"],
    shortDescription=pkg_json["description"],
    author=pkg_json["author"],
    dependencies=Dependencies(
        runTime=RunTimeDeps(externals=externals_deps, includedInBundle=in_bundle_deps),
        devTime=dev_deps,
    ),
    bundles=Bundles(
        mainModule=MainModule(
            entryFile="./main.ts", loadDependencies=list(externals_deps.keys())
        )
    ),
    userGuide=True,
    devServer=DevServer(port=3025),
    inPackageJson={
        "scripts": {"doc": "npx tsx .w3nest/doc.ts && python .w3nest/doc.py"},
    },
)

template_folder = project_folder / ".w3nest" / ".template"
generate_template(config=config, dst_folder=template_folder)

files = [
    Path("src") / "auto-generated.ts",
    "README.md",
    ".gitignore",
    ".npmignore",
    ".prettierignore",
    pkg_json_name,
    "tsconfig.json",
    "webpack.config.ts",
]

for file in files:
    shutil.copyfile(src=template_folder / file, dst=project_folder / file)


# Generate TS API files
# print("Generate TS API files")
# shell_command = (
#     "cd .. && "
#     "node ./bin/index.js "
#     "--project ./ "
#     "--nav /api "
#     "--out mkdocs-ts-doc/assets/api"
# )
# # Execute the shell command
# subprocess.run(shell_command, shell=True)
#
# # Patch 'Backends.json' to include python API of 'mkdocs_py_griffe'
#
# print("Patch 'Backends.json' to include python API of 'mkdocs_py_griffe'")
#
# path_backends = Path(__file__).parent / "assets" / "api" / "mkdocs-ts" / "Backends.json"
# backends = parse_json(path_backends)
# backends["children"].append(
#     {
#         "name": "mkdocs_py_griffe",
#         "path": "mkdocs-ts/Backends.mkdocs_py_griffe.json",
#         "isLeaf": True,
#     }
# )
# write_json(backends, path_backends)
#
# # Generate Python API files
# print("Generate Python API files")
#
# NAME = "mkdocs_py_griffe"
# GRIFFE_URL = "https://mkdocstrings.github.io/griffe/reference"
# DST = path_backends.parent / "Backends"
#
# config = Configuration(
#     base_nav=f"/api/Backends/{NAME}",
#     external_links={
#         **std_links(),
#         **{
#             f"griffe.dataclasses.{name}": f"{GRIFFE_URL}/griffe/#griffe.{name}"
#             for name in ["Module", "Class", "Function", "Attribute"]
#         },
#         "griffe.docstrings.dataclasses.DocstringSection": f"{GRIFFE_URL}/api/docstrings/models/#griffe.DocstringSection",
#     },
#     out=DST,
# )
#
# global_doc = cast(griffe.Module, griffe.load(NAME, submodules=True))
# generate_api(global_doc, config)
