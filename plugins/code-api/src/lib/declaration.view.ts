import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Code, Entity } from './models'

export function processDeclaration(
    declaration: string,
    entries: Record<string, string>,
    replace: (k: string, v: string) => string,
) {
    const escapeSpecialCharInName = (name: string, mode: 'fwd' | 'bwd') => {
        if (mode === 'fwd') {
            return name.replace(/\$/g, '_mkdollar_')
        }
        return name.replace(/_mkdollar_/g, '$').slice(0, -1)
    }
    const prepareFwd = (d: string) => {
        entries = Object.entries(entries).reduce((acc, [k, v]) => {
            const kEscaped = escapeSpecialCharInName(k, 'fwd')
            const vEscaped = escapeSpecialCharInName(v, 'fwd')
            return { ...acc, [kEscaped]: vEscaped }
        }, {})
        return escapeSpecialCharInName(d, 'fwd') + '\n'
    }

    const prepareBwd = (d: string) => {
        return escapeSpecialCharInName(d, 'bwd')
    }

    declaration = prepareFwd(declaration)

    const wordsToReplace = Object.keys(entries)
    if (wordsToReplace.length === 0) {
        return declaration
    }
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
        `([${separatorsPattern}])(${wordsPattern})(?=[${separatorsPattern}])`,
        'g',
    )
    const replaceWords = (inputString: string) => {
        return inputString.replace(
            regex,
            (_, sepBefore: string, matchedWord: string) => {
                return matchedWord === ''
                    ? matchedWord
                    : `${sepBefore}_mklink_${matchedWord}_mklink_`
            },
        )
    }
    const initial = replaceWords(declaration)
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    const rawProcessed = Object.entries(entries).reduce((acc, [k, v]) => {
        const r = new RegExp(`_mklink_${k}_mklink_`, 'g')
        const replacing = replace(k, v)
        return acc.replace(r, replacing)
    }, initial)
    return prepareBwd(rawProcessed)
}
/**
 * View for a declaration.
 */
export class DeclarationView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-DeclarationView'
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly class = `${DeclarationView.CssSelector} mkapi-declaration mkapi-semantic-color p-2 rounded`
    constructor({
        code,
        parent,
        rootModulesNav,
    }: {
        code: Pick<Code, 'references' | 'declaration'>
        parent: Pick<Entity, 'semantic'>
        rootModulesNav: Record<string, string>
    }) {
        this.class += ` mkapi-role-${parent.semantic.role}`
        const nonNullReferences = Object.entries(code.references).reduce(
            (acc, [k, v]) => {
                if (!v) {
                    return acc
                }
                Object.entries(rootModulesNav).forEach(([k_, v_]) => {
                    v = v.replace(`@nav[${k_}]`, v_)
                })
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
