import {
    DeclarationView,
    processDeclaration,
} from '../../lib/code-api/declaration.view'
import { mockMissingUIComponents } from '../lib/utils'
import { render } from 'rx-vdom'

test('Declarations processing', () => {
    const declaration = `This is a word1, this is (word2), yet a word3\n among other words like word1word2.`

    const entries = {
        word1: '@nav/api/word1',
        word2: '@nav/api/word2',
        word3: '@nav/api/word3',
    }
    const replaced = processDeclaration(
        declaration,
        entries,
        (k, v) => `${k}:${v}`,
    )
    expect(replaced).toBe(
        'This is a word1:@nav/api/word1, this is (word2:@nav/api/word2), yet a word3:@nav/api/word3\n' +
            ' among other words like word1word2.',
    )
    const declaration2 = 'This a <word1> in html element.'
    const replaced2 = processDeclaration(
        declaration2,
        entries,
        (k, v) => `${k}:${v}`,
    )

    expect(replaced2).toBe(
        'This a &lt;word1:@nav/api/word1&gt; in html element.',
    )
})

describe('Declarations rendering', () => {
    beforeAll(() => {
        mockMissingUIComponents()
    })
    beforeEach(() => (document.body.innerHTML = ''))

    it('Should render links', async () => {
        const view = new DeclarationView({
            code: {
                declaration: `interface Foo { bar: Bar}`,
                references: {
                    Bar: `@nav/api/Module.bar`,
                },
            },
            parent: {
                semantic: {
                    role: 'global',
                    labels: [],
                    attributes: {},
                    relations: {},
                },
            },
        })
        document.body.append(render(view))
        const anchor = document.querySelector<HTMLAnchorElement>('a')
        if (!anchor) {
            throw Error("Can not find anchor element for 'Bar'")
        }
        expect(anchor.innerHTML).toBe('Bar')
        expect(anchor.href.endsWith('@nav/api/Module.bar')).toBeTruthy()
    })
    it('Should render links with $', async () => {
        const declaration = `export type DynamicRoutes<T1, T2> = LazyRoutesCb<T1, T2> | LazyRoutesCb$<T1, T2>`
        const view = new DeclarationView({
            code: {
                declaration,
                references: {
                    LazyRoutesCb: `@nav/api/Module.LazyRoutesCb`,
                    LazyRoutesCb$: `@nav/api/Module.LazyRoutesCb$`,
                },
            },
            parent: {
                semantic: {
                    role: 'global',
                    labels: [],
                    attributes: {},
                    relations: {},
                },
            },
        })
        document.body.append(render(view))
        const anchors = document.querySelectorAll<HTMLAnchorElement>('a')
        expect(anchors).toHaveLength(2)

        expect(anchors[0].innerHTML).toBe('LazyRoutesCb')
        expect(
            anchors[0].href.endsWith('@nav/api/Module.LazyRoutesCb'),
        ).toBeTruthy()

        expect(anchors[1].innerHTML).toBe('LazyRoutesCb$')
        expect(
            anchors[1].href.endsWith('@nav/api/Module.LazyRoutesCb$'),
        ).toBeTruthy()
    })
})
