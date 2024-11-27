from shutil import copyfile
from pathlib import Path

from w3nest.ci.ts_frontend import ProjectConfig, PackageType, Dependencies, \
    RunTimeDeps, Bundles, MainModule, AuxiliaryModule
from w3nest.ci.ts_frontend.regular import generate_template
from w3nest.utils import parse_json

project_folder = Path(__file__).parent.parent

pkg_json = parse_json(project_folder / 'package.json')

externals_deps = {
    "rx-vdom": "^0.1.0",
    "@w3nest/webpm-client": "^0.1.0",
    "@w3nest/http-clients": "^0.1.0",
    "rxjs": "^7.5.6",
    "marked": "^4.2.3",
    "highlight.js": "11.2.0",
    "@w3nest/rx-tree-views": "^0.2.0",
    "esprima": "^4.0.1",
    # It is only used for typing, not included in dev. dependencies to install it from consuming library.
    "codemirror": "^5.52.0",
}
in_bundle_deps = {}
dev_deps = {
    "sass": "^1.69.7",
}

config = ProjectConfig(
    path=project_folder,
    type=PackageType.LIBRARY,
    name=pkg_json['name'],
    version=pkg_json['version'],
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
            entryFile='./index.ts',
            loadDependencies=["rx-vdom", "w3nest/webpm-client", "rxjs", "marked", "highlight.js",
                              "@w3nest/rx-tree-views"],
            aliases=[]
        ),
        auxiliaryModules=[
            AuxiliaryModule(
                name='CodeApi',
                entryFile='./lib/code-api/index.ts',
                loadDependencies=["rx-vdom", "@w3nest/http-clients" ],
            ),
            AuxiliaryModule(
                name='Notebook',
                entryFile='./lib/notebook/index.ts',
                loadDependencies=["rx-vdom", "rxjs", "@w3nest/rx-tree-views", "esprima"],
            )
        ]
    ),
    inPackageJson={
        "scripts" :{
            "build-css-default": "sass ./src/sass/mkdocs-light.scss ./assets/mkdocs-light.css",
            "build-css": "yarn build-css-default && prettier ./assets -w",
            "build:prod": "yarn pre-build && webpack --mode production && yarn build-css",
            "lint-eslint-check": "eslint ./src/lib"
        },
        "eslintConfig": {
            "extends": [
                "@youwol"
            ],
            "ignorePatterns": ["/dist/", "/coverage/","mkdocs-ts-doc"],
            "overrides": [{
                "files": ["bin/index.js"],
                "env": {
                    "node": True
                }
            }]
        }
    }
)
template_folder = project_folder / '.w3nest' / '.template'
generate_template(config=config, dst_folder=template_folder)

files = [
    Path("src") / "auto-generated.ts",
    "README.md",
    "package.json",
    # '.npmignore', add 'mkdocs-ts-doc'
    # '.prettierignore', add '**/assets/**/*.md'
    # "tsconfig.json", add `"exclude": ["mkdocs-ts-doc"]`
    # 'jest.config.ts',  add `testPathIgnorePatterns: ['mkdocs-ts-doc']`
    "webpack.config.ts",
    ]
for file in files:
    copyfile(src=template_folder / file, dst=project_folder / file)
