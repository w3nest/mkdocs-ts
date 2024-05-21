import shutil
import subprocess
from pathlib import Path

from youwol.pipelines.pipeline_typescript_weback_npm import Template, PackageType, Dependencies, \
    RunTimeDeps, DevServer, Bundles, MainModule
from youwol.pipelines.pipeline_typescript_weback_npm.regular import generate_template
from youwol.utils import parse_json

folder_path = Path(__file__).parent

pkg_json = parse_json(folder_path / 'package.json')
pkg_json_mkdocs = parse_json(folder_path / '..' / 'package.json')

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
for file in ['README.md', '.gitignore', '.npmignore', '.prettierignore', 'LICENSE', 'package.json',
             'tsconfig.json', 'webpack.config.ts']:
    shutil.copyfile(
        src=folder_path / '.template' / file,
        dst=folder_path / file
    )

# Generate API files

shell_command = (
    "cd ./node_modules/@youwol/mkdocs-ts/ && "
    "node ./bin/index.js "
    "--project ../../../.. "
    "--nav /api "
    "--out ../../../assets/api"
)

# Execute the shell command
subprocess.run(shell_command, shell=True)