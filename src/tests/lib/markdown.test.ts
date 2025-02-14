import {
    DefaultLayout,
    isResolvedTarget,
    parseMd,
    patchSrc,
    removeEscapedText,
    Router,
} from '../../lib'
import { expectTruthy } from './utils'
import { filter, firstValueFrom } from 'rxjs'
import { ChildrenLike, render, RxHTMLElement, VirtualDOM } from 'rx-vdom'

test('patchSrc happy path', () => {
    const inner = `Some content\n<i>some HTML content</i>\nAnd special characters: > < &`

    const src = `
# a simple example

<test-view attr='test-attr'>
${inner}
</test-view>
`

    const srcToBe = `# a simple example

<test-view attr='test-attr' id="generatedId"></test-view>`

    const r = patchSrc({
        src,
        views: { 'test-view': undefined },
        idGenerator: () => 'generatedId',
    })
    expect(r.patchedInput).toBe(srcToBe)
    expect(r.contents.generatedId).toBe(inner)
})

test('patchSrc inline', () => {
    const src = `some inline element <test-view attr="a">A simple content</test-view>`
    const r = patchSrc({
        src,
        views: { 'test-view': undefined },
        idGenerator: () => 'generatedId',
    })
    expect(r.patchedInput).toBe(
        'some inline element <test-view id="generatedId" attr="a"></test-view>',
    )
    expect(r.contents.generatedId).toBe('A simple content')
})

test('patchSrc test no content & rest of line', () => {
    const src = `Foo <test-view attr="a">\n</test-view>bar\n---\n# New section`
    const r = patchSrc({
        src,
        views: { 'test-view': undefined },
        idGenerator: () => 'generatedId',
    })
    expect(r.patchedInput).toBe(
        'Foo <test-view attr="a" id="generatedId"></test-view>\nbar\n---\n# New section',
    )
    expect(r.contents.generatedId).toBe('')
})

test('escape text', () => {
    const input =
        ' abc `escaped 1` \n def `escape 2\n escape 3` ghi\n```escape 4``` jkl\n```escape 5\nescape 6```\n mno'
    const out = removeEscapedText(input)
    expect(out.escapedContent).toBe(
        ' abc __ESCAPED_2 \n' +
            ' def __ESCAPED_3 ghi\n' +
            '__ESCAPED_0 jkl\n' +
            '__ESCAPED_1\n' +
            ' mno',
    )
    expect(out.replaced).toEqual({
        __ESCAPED_0: '```escape 4```',
        __ESCAPED_1: '```escape 5\nescape 6```',
        __ESCAPED_2: '`escaped 1`',
        __ESCAPED_3: '`escape 2\n escape 3`',
    })
})

describe('render markdown', () => {
    let router: Router

    type TLayout = DefaultLayout.NavLayout
    type THeader = DefaultLayout.NavHeader

    beforeAll(() => {
        router = new Router<TLayout, THeader>({
            navigation: {
                name: 'Home',
                layout: {
                    content: () => ({
                        tag: 'h1',
                        innerText: 'Home',
                        id: 'home',
                    }),
                },
            },
        })
    })

    it('Renders MD with internal link', async () => {
        const vdom = parseMd({
            src: 'This is a [link](@nav/.home).',
            router,
        })
        document.body.appendChild(render(vdom))
        const anchor = expectTruthy(document.querySelector('a'))
        anchor.dispatchEvent(new MouseEvent('click'))
        const target = await firstValueFrom(
            router.target$.pipe(
                filter((t) => isResolvedTarget(t)),
                filter((t) => t.sectionId === 'home'),
            ),
        )
        expect(target).toBeTruthy()
    })
})

class CustomView implements VirtualDOM<'div'> {
    static readonly CssSelector = 'CustomView'
    public readonly tag = 'div'
    public readonly class = `${CustomView.CssSelector}`
    public readonly children: ChildrenLike

    public readonly text: string

    constructor(params: { text: string }) {
        Object.assign(this, params)
        this.children = [parseMd({ src: params.text })]
    }

    static fromDom(elem: HTMLElement) {
        return new CustomView({ text: elem.textContent ?? '' })
    }
}

describe('render view with MD content', () => {
    beforeEach(() => {
        document.body.innerHTML = ''
    })

    it('simple case', async () => {
        const vdom = parseMd({
            src: `
This is an example:

<customView language="javascript">
const foo = 42
</customView>
`,
            views: {
                customView: CustomView.fromDom,
            },
        })
        document.body.appendChild(render(vdom))
        const view = expectTruthy(
            document.querySelector<RxHTMLElement<'div'>>(
                `.${CustomView.CssSelector}`,
            ),
        )
        expect(view.vDom['text']).toBe('const foo = 42')
    })
    it('escaped characters', async () => {
        const vdom = parseMd({
            src: `
This is an example:

<customView language="javascript">
\/**
A comment
**\/
const foo = 42
</customView>
`,
            views: {
                customView: CustomView.fromDom,
            },
        })
        document.body.appendChild(render(vdom))
        const view = expectTruthy(
            document.querySelector<RxHTMLElement<'div'>>(
                `.${CustomView.CssSelector}`,
            ),
        )
        expect(view.vDom['text']).toBe('/**\nA comment\n**/\nconst foo = 42')
    })
    it('Handle multiple custom views on a line', async () => {
        const vdom = parseMd({
            src: `
This is an example:

<customView language="javascript">const foo = 42</customView> and <customView language="javascript">const bar = 42</customView>.

And some other text...
`,
            views: {
                customView: CustomView.fromDom,
            },
        })
        document.body.appendChild(render(vdom))
        const views = Array.from(
            document.querySelectorAll<RxHTMLElement<'div'>>(
                `.${CustomView.CssSelector}`,
            ),
        )
        expect(views).toHaveLength(2)
        //expect(view.vDom['text']).toBe('/**\nA comment\n**/\nconst foo = 42')
    })
})
