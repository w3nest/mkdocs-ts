import {
    AnyVirtualDOM,
    attr$,
    child$,
    ChildrenLike,
    RxChild,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'
import { parseMd, MdParsingOptions, IconFactory } from '../markdown'
import { Router } from '../router'
import { BehaviorSubject } from 'rxjs'
import { faIconTyped } from '../default-layout/fa-icons'

/**
 * Icons factory, class refers to fontawesome v5 icons.
 */
export const icons = {
    note: faIconTyped('fa-pen-fancy'),
    abstract: faIconTyped('fa-file-alt'),
    info: faIconTyped('fa-info-circle'),
    hint: faIconTyped('fa-fire'),
    success: faIconTyped('fa-check'),
    question: faIconTyped('fa-question-circle'),
    warning: faIconTyped('fa-exclamation-triangle'),
    failure: faIconTyped('fa-times-circle'),
    danger: faIconTyped('fa-bolt'),
    bug: faIconTyped('fa-bug'),
    example: faIconTyped('fa-flask'),
    quote: faIconTyped('fa-quote-right'),
}
/**
 * Note level in {@link NoteView}.
 */
export type NoteLevel = keyof typeof icons

/**
 * Relevant for expandable note only.
 * If `stateful`, the note is created right away and will preserve its state upon collapse/expand.
 * If `stateless`, the content is created/removed each time the note is expanded/collapsed, effectively deleting the
 * state.
 */
export type ExpandableMode = 'stateful' | 'stateless'
/**
 * Represents a note.
 *
 * This view is registered in {@link GlobalMarkdownViews}: it can be instantiated from Markdown with an HTMLElement
 * using the tag `note`, see {@link NoteView.fromHTMLElement}.
 *
 * ## Examples
 *
 * ### Basics
 *
 * A note is defined providing a `level` attribute and a text content:
 *
 * <md-cell>
 * <note level='info'>
 * This is a note with no option beside `level`.
 * </note>
 * </md-cell>
 *
 * Available levels are defined by {@link NoteLevel} and illustrated in section **Available Levels**.
 *
 * There are multiple options that can be provided, *e.g.*
 *
 * <md-cell>
 * <note level='info' icon='fas fa-star' title='Custom label' expandable='true'>
 * This is a note with multiple options defined:
 * *  `icon`: Overrides the default icon for the level.
 * *  `title`: Overrides the default title for the level.
 * *  `expandable`: Makes the note expandable.
 *
 * <note level="hint">
 * The additional option `mode` is available for expandable notes.
 * </note>
 * </note>
 * </md-cell>
 *
 * See {@link NoteView.attributeMapper} for the list of available options.
 *
 * ### Available Levels
 *
 * <js-cell>
 * const { MkDocs } = await webpm.install({
 *     esm:['mkdocs-ts#{{mkdocs-version}} as MkDocs']
 * })
 * const src = `
 * <note level="{{level}}">
 * Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna
 * aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
 * </note> `
 *
 * const levels = ['note', 'abstract', 'info', 'hint', 'success', 'question',
 *                 'warning', 'failure', 'danger', 'bug', 'example', 'quote']
 *
 * levels.forEach((level)=> {
 *     display(MkDocs.parseMd({src:src.replace('{{level}}', level)}))
 * })
 * </js-cell>
 */
export class NoteView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-NoteView'

    public readonly tag = 'div'
    public readonly class: string = `${NoteView.CssSelector} border rounded text-justify`
    public readonly children: ChildrenLike

    public readonly level: NoteLevel
    public readonly icon?: string | AnyVirtualDOM
    public readonly label: string | AnyVirtualDOM
    public readonly content: string | AnyVirtualDOM
    public readonly parsingArgs: { router: Router } & MdParsingOptions
    public readonly expandable: boolean = false
    public readonly expanded$ = new BehaviorSubject(false)
    public readonly mode: ExpandableMode = 'stateful'

    public readonly connectedCallback: (elem: RxHTMLElement<'div'>) => void
    /**
     * Initializes the instance.
     *
     * @param params
     * @param params.level Level of the note.
     * @param params.icon If provided, overrides the default icon associated to the given level.
     *     If a `string` is provided, it is used as key to retrieve the actual icon from {@link IconFactory}.
     * @param params.label Label to display. If none is provided, it uses the level as default value.
     * @param params.content Text content.
     * @param params.expandable Whether the note is expandable. Expandable note are collapsed by default.
     * Default to `false`,
     * @param params.mode See {@link ExpandableMode}.
     * @param params.parsingArgs Parsing options used to parse the content in MarkDown.
     */
    constructor(params: {
        level: NoteLevel
        icon?: string | AnyVirtualDOM
        label?: string | AnyVirtualDOM
        content: string | AnyVirtualDOM
        expandable?: boolean
        mode?: ExpandableMode
        parsingArgs: { router?: Router } & MdParsingOptions
    }) {
        Object.assign(this, params)
        const defaultLabels: Record<NoteLevel, string> = {
            note: 'Note',
            abstract: 'Abstract',
            info: 'Info',
            hint: 'Hint',
            success: 'Success',
            question: 'Question',
            warning: 'Warning',
            failure: 'Failure',
            danger: 'Danger',
            bug: 'Bug',
            example: 'Example',
            quote: 'Quote',
        }
        if (!this.expandable) {
            this.expanded$.next(true)
        }
        this.label = this.label || defaultLabels[this.level]
        this.class = `${this.class} mkdocs-border-${this.level}`
        const content = (): AnyVirtualDOM => ({
            tag: 'div' as const,
            class: 'p-2',
            children: [
                typeof this.content === 'string'
                    ? parseMd({
                          src: this.content,
                          ...this.parsingArgs,
                      })
                    : this.content,
            ],
        })

        const maybeContent: AnyVirtualDOM | RxChild =
            this.mode === 'stateless' && this.expandable
                ? child$({
                      source$: this.expanded$,
                      vdomMap: (expanded) =>
                          expanded ? content() : { tag: 'div' },
                  })
                : {
                      tag: 'div' as const,
                      class: attr$({
                          source$: this.expanded$,
                          vdomMap: (expanded) => (expanded ? '' : 'd-none'),
                      }),
                      children: [content()],
                  }

        this.children = [
            new NoteHeaderView({
                level: this.level,
                label: this.label,
                icon: this.icon,
                expandable: this.expandable,
                expanded$: this.expanded$,
            }),
            maybeContent,
        ]
    }

    /**
     * Attributes mapper from an `HTMLElement` to the arguments of the class's constructor.
     *
     * @param element The `HTMLElement`.
     */
    static attributeMapper = (element: HTMLElement) => ({
        level: element.getAttribute('level') as NoteLevel,
        label:
            element.getAttribute('title') ??
            element.getAttribute('label') ??
            undefined,
        content: element.textContent ?? '',
        expandable: element.getAttribute('expandable')
            ? element.getAttribute('expandable') === 'true'
            : false,
        mode:
            (element.getAttribute('mode') as ExpandableMode | null) ??
            'stateful',
        icon: element.getAttribute('icon') ?? undefined,
    })

    /**
     * Construct an instance of NoteView from an `HTMLElement`.
     *
     * See {@link NoteView.attributeMapper} for details on the attributes conversion from the `HTMLElement`.
     *
     * @param element The `HTMLElement`.
     * @param parsingArgs Parsing options used to parse the content in MarkDown
     */
    static fromHTMLElement(
        element: HTMLElement,
        parsingArgs: { router?: Router } & MdParsingOptions,
    ) {
        return new NoteView({
            ...NoteView.attributeMapper(element),
            parsingArgs,
        })
    }
}

class NoteHeaderView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class: string =
        'mkdocs-NoteHeaderView p-1 d-flex align-items-center'
    public readonly children: ChildrenLike
    public readonly style = {
        fontWeight: 'bolder' as const,
    }
    public readonly level: NoteLevel
    public readonly icon?: string | AnyVirtualDOM
    public readonly label: string | AnyVirtualDOM
    public readonly expandable: boolean
    public readonly expanded$: BehaviorSubject<boolean>

    constructor(params: {
        level: NoteLevel
        icon?: string | AnyVirtualDOM
        label: string | AnyVirtualDOM
        expandable: boolean
        expanded$: BehaviorSubject<boolean>
    }) {
        Object.assign(this, params)
        this.class = `${this.class} mkdocs-bg-${this.level} `

        this.children = [
            iconFactory(this.level, this.icon),
            {
                tag: 'div',
                class: 'mx-1',
            },
            typeof this.label === 'string'
                ? parseMd({ src: this.label })
                : this.label,
            {
                tag: 'div',
                class: 'flex-grow-1',
            },
            this.expandable
                ? {
                      tag: 'button',
                      class: `btn btn-sm mkdocs-hover-bg-${this.level}`,
                      children: [
                          child$({
                              source$: this.expanded$,
                              vdomMap: (expanded) =>
                                  expanded
                                      ? faIconTyped('fa-chevron-down')
                                      : faIconTyped('fa-chevron-right'),
                          }),
                      ],
                      onclick: () => {
                          this.expanded$.next(!this.expanded$.value)
                      },
                  }
                : undefined,
        ]
    }
}

function iconFactory(
    level: NoteLevel,
    icon?: string | AnyVirtualDOM,
): AnyVirtualDOM {
    if (!icon) {
        return {
            tag: 'i',
            class: `mkdocs-text-${level}`,
            children: [icons[level]],
        }
    }
    // Next block is deprecated
    if (
        typeof icon === 'string' &&
        ['fas', 'fab', 'far'].includes(icon.split(' ')[0])
    ) {
        return {
            tag: 'i',
            class: `mkdocs-text-${level} ${icon}`,
        }
    }
    if (typeof icon === 'string') {
        return {
            tag: 'div',
            class: `mkdocs-text-${level}`,
            children: [IconFactory.get(icon)],
        }
    }
    return {
        tag: 'i',
        class: `mkdocs-text-${level}`,
        children: [icon],
    }
}
