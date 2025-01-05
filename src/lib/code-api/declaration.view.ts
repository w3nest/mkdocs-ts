import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Code, Entity } from './models'

export function processDeclaration(
    declaration: string,
    entries: Record<string, string>,
    replace: (k: string, v: string) => string,
) {
    const wordsToReplace = Object.keys(entries)
    if (wordsToReplace.length === 0) {
        return declaration
    }
    declaration += '\n'
    const separators = [
        ' ',
        '@',
        '.',
        ',',
        '!',
        '?',
        ';',
        ':',
        '(',
        ')',
        '[',
        ']',
        '<',
        '>',
        '{',
        '}',
        '|',
        '-',
        '+',
        '*',
        '/',
        '\n',
    ]

    const wordsPattern = wordsToReplace.join('|')
    const separatorsPattern = separators
        .map((separator) => `\\${separator}`)
        .join('')
    const regex = new RegExp(
        `(?<=[${separatorsPattern}])(${wordsPattern})(?=[${separatorsPattern}])`,
        'g',
    )

    const replaceWords = (inputString: string) => {
        return inputString.replace(regex, (matchedWord: string) => {
            return matchedWord === ''
                ? matchedWord
                : `_mklink_${matchedWord}_mklink_`
        })
    }
    const r = Object.entries(entries).reduce(
        (acc, [k, v]) => {
            const r = new RegExp(`_mklink_${k}_mklink_`, 'g')
            return acc.replace(r, replace(k, v))
        },
        replaceWords(declaration).replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    )
    return r.slice(0, -1)
}

export class DeclarationView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = 'mkapi-declaration mkapi-semantic-color p-2 rounded'
    constructor({
        code,
        parent,
    }: {
        code: Pick<Code, 'references' | 'declaration'>
        parent: Pick<Entity, 'semantic'>
    }) {
        this.class += ` mkapi-role-${parent.semantic.role}`
        const nonNullReferences = Object.entries(code.references).reduce(
            (acc, [k, v]) => {
                if (!v) {
                    return acc
                }
                return { ...acc, [k]: v }
            },
            {},
        )
        const declaration = processDeclaration(
            code.declaration,
            nonNullReferences,
            (k: string, v: string) => `<a target='_blank' href='${v}'>${k}</a>`,
        )

        this.children = [
            {
                tag: 'pre',
                class: 'py-0 my-0',
                innerHTML: declaration,
            },
        ]
    }
}
