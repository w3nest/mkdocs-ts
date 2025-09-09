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

externals_deps = {
    "rx-vdom": "^0.1.3",
    "rxjs": "^7.5.6",
    "marked": "^4.2.3",
    "@w3nest/ui-tk": "^0.1.9",
    "prismjs": "^1.30.0",
}
in_bundle_deps = {
    "prism-code-editor": "^4.0.0",
    "@fortawesome/free-solid-svg-icons": "^6.7.2",
    "@fortawesome/free-regular-svg-icons": "^6.7.2",
    "@fortawesome/free-brands-svg-icons": "^6.7.2",
}
dev_deps = {
    "conditional-type-checks": "^1.0.6",
    "sass": "^1.69.7",
}

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
                "rx-vdom",
                "rxjs",
                "marked",
                "@w3nest/ui-tk/Trees",
                "prismjs/components/prism-core",
                "prismjs/plugins/autoloader/prism-autoloader",
                "prismjs/plugins/line-numbers/prism-line-numbers",
                "prismjs/plugins/line-highlight/prism-line-highlight",
            ],
            aliases=[],
        ),
    ),
    inPackageJson={
        "scripts": {
            "build-css-default": "sass ./src/sass/mkdocs-light.scss ./assets/mkdocs-light.css",
            "build-css": "yarn build-css-default && prettier ./assets -w",
            "build:prod": "yarn pre-build && webpack --mode production && yarn build-css && yarn post-build",
        },
    },
)
template_folder = project_folder / ".w3nest" / ".template"
generate_template(config=config, dst_folder=template_folder)

files = [
    # "README.md",
    "package.json",
    # '.npmignore', add 'mkdocs-ts-doc'
    # '.prettierignore', add '**/assets/**/*.md'
    # "tsconfig.json", add `"exclude": ["mkdocs-ts-doc"]`
    # 'jest.config.ts',  add `testPathIgnorePatterns: ['mkdocs-ts-doc']`
    "webpack.config.ts",
]
for file in files:
    copyfile(src=template_folder / file, dst=project_folder / file)
