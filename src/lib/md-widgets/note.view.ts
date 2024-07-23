import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { parseMd, MdParsingOptions } from '../markdown'
import { Router } from '../router'
/**
 * Note level in {@link NoteView}.
 */
export type NoteLevel = 'info' | 'warning' | 'hint'

/**
 * Represents a note on the page.
 *
 * This view is registered in {@link GlobalMarkdownViews}: it can be instantiated from Markdown using the tag
 * `note`. See constructor's documentation for details regarding its parameters.
 */
export class NoteView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class: string =
        'mkdocs-NoteView p-2 px-4 border-left text-justify'
    public readonly children: ChildrenLike

    public readonly level: NoteLevel
    public readonly label: string
    public readonly content: string
    public readonly parsingArgs: { router: Router } & MdParsingOptions

    /**
     * @param params
     * @param params.level Either 'info', 'warning', 'success'. When instantiated from Markdown, this parameter is
     * retrieved from the attribute 'level'.
     * @param params.label Label to display. When instantiated from Markdown, this parameter is
     * retrieved from the attribute 'label'. If none is provided, it is by default `Note`, `Warning` & `Hint` for
     * levels 'info', 'warning', 'success' respectively. If an empty string is provided, no label will appear.
     * @param params.content Text content. When instantiated from Markdown, this parameter is
     * retrieved from the text content of the DOM element.
     */
    constructor(params: {
        level: NoteLevel
        label?: string
        content: string
        parsingArgs: { router?: Router } & MdParsingOptions
    }) {
        Object.assign(this, params)
        const fact: Record<NoteLevel, string> = {
            info: 'mkdocs-bg-info mkdocs-border-info',
            warning: 'mkdocs-bg-warning mkdocs-border-warning',
            hint: 'mkdocs-bg-success mkdocs-border-success',
        }
        const factLabel: Record<NoteLevel, string> = {
            info: 'mkdocs-text-info',
            warning: 'mkdocs-text-warning',
            hint: 'mkdocs-text-success',
        }
        const defaultLabels: Record<NoteLevel, string> = {
            info: 'Note',
            warning: 'Warning',
            hint: 'Hint',
        }
        const includeLabel = this.label !== ''
        this.label = this.label || defaultLabels[this.level]
        this.class = `${this.class} ${fact[this.level]}`
        this.children = [
            includeLabel && {
                tag: 'div',
                innerText: this.label,
                class: factLabel[this.level],
                style: {
                    fontWeight: 'bolder' as const,
                },
            },
            { tag: 'i', class: 'my-1' },
            parseMd({ src: this.content, ...this.parsingArgs }),
        ]
    }
}
