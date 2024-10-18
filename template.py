import shutil
from pathlib import Path

from youwol.pipelines.pipeline_typescript_weback_npm import Template, PackageType, Dependencies, \
    RunTimeDeps, Bundles, MainModule, AuxiliaryModule
from youwol.pipelines.pipeline_typescript_weback_npm.regular import generate_template
from youwol.utils import parse_json

folder_path = Path(__file__).parent

pkg_json = parse_json(folder_path / 'package.json')

externals_deps = {
    "@youwol/rx-vdom": "^1.0.1",
    "@youwol/webpm-client": "^3.0.0",
    "rxjs": "^7.5.6",
    "marked": "^4.2.3",
    "highlight.js": "11.2.0",
    "@youwol/rx-tree-views": "^0.3.4",
    "@youwol/http-primitives": "^0.2.3",
    "esprima": "^4.0.1",
    # It is only used for typing, not included in dev. dependencies to install it from consuming library.
    "codemirror": "^5.52.0",
}
in_bundle_deps = {}
dev_deps = {
    "sass": "^1.69.7",
}

template = Template(
    path=folder_path,
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
            loadDependencies=["@youwol/rx-vdom", "@youwol/webpm-client", "rxjs", "marked", "highlight.js",
                              "@youwol/os-top-banner","@youwol/rx-tree-views"],
            aliases=[]
        ),
        auxiliaryModules=[
            AuxiliaryModule(
                name='CodeApi',
                entryFile='./lib/code-api/index.ts',
                loadDependencies=["@youwol/rx-vdom", "@youwol/http-primitives" ],
            ),
            AuxiliaryModule(
                name='Notebook',
                entryFile='./lib/notebook/index.ts',
                loadDependencies=["@youwol/rx-vdom", "rxjs", "@youwol/rx-tree-views", "esprima"],
            )
        ]
    ),
    userGuide=True,
    inPackageJson={
        "scripts" :{
            "build-css-default": "sass ./src/sass/mkdocs-light.scss ./assets/mkdocs-light.css",
            "build-css": "yarn build-css-default && prettier ./assets -w",
            "build:prod": "yarn pre-build && webpack --mode production && yarn build-css",
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

generate_template(template)
shutil.copyfile(
    src=folder_path / '.template' / 'src' / 'auto-generated.ts',
    dst=folder_path / 'src' / 'auto-generated.ts'
)
for file in ['README.md',
             '.gitignore',
             # '.npmignore', add 'mkdocs-ts-doc'
             # '.prettierignore', add '**/assets/**/*.md'
             'LICENSE',
             'package.json',
             # 'tsconfig.json', add `"exclude": ["mkdocs-ts-doc"]`
             # 'jest.config.ts',  add `testPathIgnorePatterns: ['mkdocs-ts-doc']`
             'webpack.config.ts']:
    shutil.copyfile(
        src=folder_path / '.template' / file,
        dst=folder_path / file
    )
