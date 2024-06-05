import { processDeclaration } from '../lib/code-api/declaration.view'

test('declaration view', () => {
    let declaration = `This is a word1, this is (word2), yet a word3\n among other words like word1word2.`

    const entries = {
        word1: '@nav/api/word1',
        word2: '@nav/api/word2',
        word3: '@nav/api/word3',
    }
    let replaced = processDeclaration(
        declaration,
        entries,
        (k, v) => `${k}:${v}`,
    )
    expect(replaced).toBe(
        'This is a word1:@nav/api/word1, this is (word2:@nav/api/word2), yet a word3:@nav/api/word3\n' +
            ' among other words like word1word2.',
    )
    declaration = 'This a <word1> in html element.'
    replaced = processDeclaration(declaration, entries, (k, v) => `${k}:${v}`)

    expect(replaced).toBe(
        'This a &lt;word1:@nav/api/word1&gt; in html element.',
    )
})
