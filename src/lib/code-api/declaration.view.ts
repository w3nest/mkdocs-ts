import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Code, Entity } from './models'

export function processDeclaration(
    declaration: string,
    entries: { [k: string]: string },
    replace: (k: string, v: string) => string,
) {
    const wordsToReplace = Object.keys(entries || {})
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
    // public readonly style = {
    //     fontWeight: 'bolder' as const,
    // }
    public readonly class = 'mkapi-declaration mkapi-semantic-color p-2 rounded'
    constructor({ code, parent }: { code: Code; parent: Entity }) {
        // const separators = /[[\],<>@.():;]/g
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
        // const commentRegexOneLine = /\/\/.*$/gm
        // // Replace comments with span elements having a class to change color
        // declaration = declaration.replace(
        //     commentRegexOneLine,
        //     '<span class="comment">$&</span>',
        // )
        // const commentRegexMultiLines = /\/\*(.|\n)*?\*\//gm
        // // Replace multi-line comments with span elements having a class to change color
        // declaration = declaration.replace(
        //     commentRegexMultiLines,
        //     '<span class="comment">$&</span>',
        // )

        this.children = [
            {
                tag: 'pre',
                class: 'py-0 my-0',
                innerHTML: declaration,
            },
        ]
    }
}
