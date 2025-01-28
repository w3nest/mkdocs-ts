import {
    Navigation,
    Router,
    DefaultLayout,
    parseMd,
    headingId,
} from '../../lib'
import { BehaviorSubject, firstValueFrom, from, Observable, of } from 'rxjs'
import {
    codeApiEntryNode,
    configurationTsTypedoc,
    Dependencies,
    HttpClientTrait,
    Module,
    ModuleView,
    Project,
} from '../../lib/code-api'
import fs from 'fs'
import { mockMissingUIComponents, navigateAndAssert } from '../lib/utils'
import { render } from 'rx-vdom'
import { HeaderView } from '../../lib/code-api/header.view'
import { PageView, TOCView } from '../../lib/default-layout'
import { MockClient } from './http-client'

type TLayout = DefaultLayout.NavLayout
type THeader = DefaultLayout.NavHeader

class TestHttpClient implements HttpClientTrait {
    public readonly project: Project
    constructor(params: { project: Project }) {
        Object.assign(this, params)
    }

    fetchModule(modulePath: string): Observable<Module> {
        const assetPath = `${this.project.docBasePath}/${modulePath}.json`
        const content = fs.readFileSync(assetPath, 'utf8')
        return of(JSON.parse(content) as unknown as Module)
    }
    installCss(): Promise<unknown> {
        return Promise.resolve()
    }
}
describe('Typescript/Typedoc documentation', () => {
    let router: Router<TLayout, THeader>
    beforeAll(() => {
        mockMissingUIComponents()

        Dependencies.parseMd = parseMd
        Dependencies.DefaultLayout = DefaultLayout
        Dependencies.headingId = headingId

        const navigation: Navigation<
            DefaultLayout.NavLayout,
            DefaultLayout.NavHeader
        > = {
            name: 'API',
            header: { icon: { tag: 'div' as const, class: 'fas fa-code' } },
            layout: {
                content: () => ({ tag: 'h1', innerText: 'Code API' }),
            },
            routes: {
                '/api': Promise.resolve().then(() => {
                    return codeApiEntryNode({
                        name: 'Foo',
                        header: {
                            icon: { tag: 'div', class: 'fas fa-box-open' },
                        },
                        entryModule: 'Foo',
                        docBasePath: 'assets/api',
                        httpClient: ({ project, configuration }) =>
                            new MockClient({ project, configuration }),
                        configuration: {
                            ...configurationTsTypedoc,
                            codeUrl: (params: {
                                path: string
                                startLine: number
                            }) => {
                                return `code/${params.path}#L${params.startLine}`
                            },
                        },
                    })
                }),
            },
        }
        router = new Router({ navigation })
        const view = new DefaultLayout.Layout({
            router,
            bookmarks$: new BehaviorSubject(['/', '/md']),
        })
        document.body.append(render(view))
    })

    it("Should load on '/'", async () => {
        const node = await firstValueFrom(router.explorerState.selectedNode$)
        expect(node.id).toBe('/')
    })
    it.each([
        ['/api', 'Foo', 3, 3],
        ['/api/Bar', 'Bar', 3, 3],
    ])(
        "Navigates to '%i'",
        async (path, name, expectedHeadingsCount, inTocHeadingsCount) => {
            await navigateAndAssert(router, path, name)
            const t = await firstValueFrom(router.target$)
            const pageView = document.querySelector<HTMLElement>(
                `.${PageView.CssSelector}`,
            )
            if (!pageView) {
                throw Error('Page view not included in document')
            }
            const moduleView = document.querySelector<HTMLElement>(
                `.${ModuleView.CssSelector}`,
            )
            expect(moduleView).toBeTruthy()
            if (!moduleView) {
                throw Error('Module view not included in document')
            }
            const headingsInPage = Array.from(
                pageView.querySelectorAll('.mkapi-header'),
            ).map((elem) => elem['vDom'] as HeaderView)
            expect(headingsInPage).toHaveLength(expectedHeadingsCount)

            const tocView = document.querySelector<HTMLElement>(
                `.${TOCView.CssSelector}`,
            )
            if (!tocView) {
                throw Error('Page view not included in document')
            }
            const headingsInToc = Array.from(
                tocView.querySelectorAll('.mkapi-header'),
            ).map((elem) => elem['vDom'] as HeaderView)
            expect(headingsInToc).toHaveLength(inTocHeadingsCount)
        },
    )
})
