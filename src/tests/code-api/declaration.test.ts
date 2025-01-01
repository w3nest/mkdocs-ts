import { processDeclaration } from '../../lib/code-api/declaration.view'

test('declaration view', () => {
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
