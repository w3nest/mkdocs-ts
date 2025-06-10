import { of } from 'rxjs'

const noSem = { role: '' }
const srcFiles = [
    {
        name: 'index.ts',
        path: 'src/lib/index.ts',
        documentation: { sections: [] },
    },
]

const files = {
    'assets/api/Foo.json': {
        name: 'Foo',
        semantic: { role: 'module' },
        documentation: {
            sections: [
                {
                    content: 'This is the documentation for `Foo`.',
                    semantic: noSem,
                },
            ],
        },
        path: 'Foo',
        navPath: '@nav/api/Foo',
        children: [
            {
                name: 'Bar',
                semantic: { role: 'module' },
                path: 'Foo.Bar',
                navPath: '@nav/api/Bar',
                isLeaf: true,
            },
        ],
        files: srcFiles,
        attributes: [],
        types: [],
        callables: [
            {
                name: 'foo',
                documentation: {
                    sections: [
                        {
                            content: 'Returns 42',
                            contentType: 'markdown',
                            semantic: { role: '' },
                        },
                    ],
                },
                path: 'Foo.foo',
                navPath: '@nav/api.foo',
                code: {
                    filePath: 'src/lib/index.ts',
                    declaration: 'export function foo(): Result',
                    implementation:
                        'export function foo(): Result {\n    returns 42\n}',
                    startLine: 1,
                    endLine: 3,
                    references: {
                        foo: '@nav/api.foo',
                        Result: '@nav/api/Bar.Result',
                    },
                },
                semantic: { role: 'function' },
            },
        ],
    },
    'assets/api/Foo/Bar.json': {
        name: 'Bar',
        semantic: { role: 'module' },
        documentation: {
            sections: [
                {
                    content: 'This is the documentation for `Bar`.',
                    semantic: noSem,
                },
            ],
        },
        path: 'Foo.Bar',
        navPath: '@nav/api/Foo/Bar',
        children: [],
        files: srcFiles,
        attributes: [],
        types: [
            {
                name: 'Result',
                documentation: {
                    sections: [
                        {
                            content:
                                'An alias for result. See [foo](@nav/api.foo).',
                            contentType: 'markdown',
                            semantic: { role: '' },
                        },
                    ],
                },
                attributes: [],
                callables: [],
                path: 'Foo.Bar.Result',
                navPath: '@nav/api/Bar.Result',
                code: {
                    filePath: 'src/lib/index.ts',
                    declaration: 'export type Result = number',
                    implementation: '',
                    startLine: 1,
                    endLine: 1,
                    references: {
                        Result: '@nav/api/Bar.Result',
                    },
                },
                semantic: { role: 'type-alias' },
            },
        ],
        callables: [],
    },
}

export class MockClient {
    public readonly configuration
    public readonly project
    constructor({ configuration, project }) {
        this.configuration = configuration
        this.project = project
    }
    fetchModule(modulePath) {
        const assetPath = `${this.project.dataFolder}/${modulePath}.json`
        return of(files[assetPath])
    }
    installCss() {
        return Promise.resolve()
    }
}
