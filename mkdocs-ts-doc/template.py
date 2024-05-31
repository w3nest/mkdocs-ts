import shutil
import subprocess
from pathlib import Path

from youwol.pipelines.pipeline_typescript_weback_npm import Template, PackageType, Dependencies, \
    RunTimeDeps, DevServer, Bundles, MainModule
from youwol.pipelines.pipeline_typescript_weback_npm.regular import generate_template
from youwol.utils import parse_json, write_json
from typing import cast

import griffe

from mkdocs_py_griffe import generate_api, Configuration, std_links


folder_path = Path(__file__).parent
pkg_json_name = 'package.json'
pkg_json = parse_json(folder_path / pkg_json_name)
pkg_json_mkdocs = parse_json(folder_path / '..' / pkg_json_name)

externals_deps = {
    "rxjs": "^7.5.6",
    "@youwol/rx-vdom": "^1.0.1",
    "@youwol/mkdocs-ts": "^0.4.1",
    "@youwol/webpm-client": "^3.0.0",
    "mathjax": "^3.1.4"
}
in_bundle_deps = {}
dev_deps = {}

template = Template(
    path=folder_path,
    type=PackageType.APPLICATION,
    name=pkg_json['name'],
    version=pkg_json_mkdocs['version'],
    shortDescription=pkg_json['description'],
    author=pkg_json['author'],
    dependencies=Dependencies(
        runTime=RunTimeDeps(
            externals=externals_deps,
            includedInBundle=in_bundle_deps
        ),
        devTime=dev_deps
    ),
    bundles=Bundles(
         mainModule=MainModule(
             entryFile='./main.ts',
             loadDependencies=list(externals_deps.keys())
         )
    ),
    userGuide=True,
    devServer=DevServer(
        port=3025
    )
)

generate_template(template)
shutil.copyfile(
    src=folder_path / '.template' / 'src' / 'auto-generated.ts',
    dst=folder_path / 'src' / 'auto-generated.ts'
)
for file in ['README.md', '.gitignore', '.npmignore', '.prettierignore', 'LICENSE', pkg_json_name,
             'tsconfig.json', 'webpack.config.ts']:
    shutil.copyfile(
        src=folder_path / '.template' / file,
        dst=folder_path / file
    )

# Generate TS API files
print("Generate TS API files")
shell_command = (
    "cd .. && "
    "node ./bin/index.js "
    "--project ./ "
    "--nav /api "
    "--out mkdocs-ts-doc/assets/api"
)
# Execute the shell command
subprocess.run(shell_command, shell=True)

# Patch 'Backends.json' to include python API of 'mkdocs_py_griffe'

print("Patch 'Backends.json' to include python API of 'mkdocs_py_griffe'")

path_backends = Path(__file__).parent / 'assets' / 'api' / 'mkdocs-ts' / 'Backends.json'
backends = parse_json(path_backends)
backends['children'].append(
    {
        "name": "mkdocs_py_griffe",
        "path": "mkdocs-ts/Backends.mkdocs_py_griffe.json",
        "isLeaf": True
    }
)
write_json(backends, path_backends)

# Generate Python API files
print("Generate Python API files")

NAME = "mkdocs_py_griffe"
GRIFFE_URL = "https://mkdocstrings.github.io/griffe/reference/griffe"
DST = path_backends.parent / "Backends"

config = Configuration(
    base_nav=f"/api/Backends/{NAME}",
    external_links={
        **std_links(),
        **{
            f"griffe.dataclasses.{name}": f"{GRIFFE_URL}/#griffe.{name}"
            for name in ["Module", "Class", "Function", "Attribute"]
        },
    },
    out=DST
)

global_doc = cast(griffe.Module, griffe.load(NAME, submodules=True))
generate_api(global_doc, config)
