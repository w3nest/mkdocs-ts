import { patchSrc } from '../lib/markdown'

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
    expect(r.contents['generatedId']).toBe(inner)
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
    expect(r.contents['generatedId']).toBe('A simple content')
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
    expect(r.contents['generatedId']).toBe('')
})
