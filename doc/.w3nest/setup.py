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
from w3nest.utils import parse_json


project_folder = Path(__file__).parent.parent

pkg_json = parse_json(project_folder / "package.json")

pkg_json_name = "package.json"
pkg_json = parse_json(project_folder / pkg_json_name)
pkg_json_mkdocs = parse_json(project_folder / ".." / pkg_json_name)

externals_deps = {
    "rxjs": "^7.5.6",
    "rx-vdom": "^0.1.4",
    "mkdocs-ts": f"^{pkg_json_mkdocs['version'].replace('-wip', '')}",
    "@w3nest/webpm-client": "^0.1.5",
    "mathjax": "^3.1.4",
    "@w3nest/ui-tk": "^0.1.1",
}
in_bundle_deps = {}
dev_deps = {
    # Only for type definitions
    "three": "^0.152.0"
}

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
            entryFile="./app/main.ts",
            loadDependencies=[
                "rxjs",
                "rx-vdom",
                "mkdocs-ts",
                "@w3nest/webpm-client",
                "mathjax",
                "@w3nest/ui-tk/Badges",
            ],
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
    "README.md",
    ".gitignore",
    ".npmignore",
    ".prettierignore",
    pkg_json_name,
    "webpack.config.ts",
]

for file in files:
    shutil.copyfile(src=template_folder / file, dst=project_folder / file)
