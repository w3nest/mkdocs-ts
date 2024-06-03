import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { Code, Entity } from './models'

export class DeclarationView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    // public readonly style = {
    //     fontWeight: 'bolder' as const,
    // }
    public readonly class = 'mkapi-declaration mkapi-semantic-color p-2 rounded'
    constructor({ code, parent }: { code: Code; parent: Entity }) {
        const separators = /[[\],<>@.():;]/g
        this.class += ` mkapi-role-${parent.semantic.role}`

        let declaration = Object.entries(code.references || {}).reduce(
            (acc, [k, v]) => {
                const p = new RegExp(` ${k} `, 'g')
                return acc.replace(
                    p,
                    ` <a target='_blank' href='${v}'>${k}</a> `,
                )
            },
            code['declaration']
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\r?\n/g, ' \n')
                .replace(separators, (match) => `${match} `) // Replace [, ], <, >, , with spaces around them
                .replace(separators, (match) => ` ${match}`) // Replace [, ], <, >, , with spaces around them
                .replace(/ {2}/g, ' ') // Replace multiple spaces with single space
                .trim() + ' ', // Trim the string and add a trailing space
        )

        declaration = declaration.replace(
            new RegExp(` ${separators.source} `, 'g'),
            (match) => match.trim(),
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
