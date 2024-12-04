import { patchSrc, removeEscapedText } from '../lib'

test('patchSrc happy path', () => {
    const inner = `Some content\n<i>some HTML content</i>\nAnd special characters: > < &`

    const src = `
# a simple example

<test-view attr='test-attr'>
${inner}
</test-view>    
`

    const srcToBe = `
# a simple example

<test-view attr='test-attr' id="generatedId"></test-view>
`

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
