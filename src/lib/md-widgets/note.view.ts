import {
    AnyVirtualDOM,
    attr$,
    child$,
    ChildrenLike,
    RxChild,
    RxHTMLElement,
    VirtualDOM,
} from 'rx-vdom'
import { parseMd, MdParsingOptions } from '../markdown'
import { Router } from '../router'
import { BehaviorSubject, filter } from 'rxjs'
import { refreshResizeObservers } from './traits'

/**
 * Icons factory, class refers to fontawesome v5 icons.
 */
export const icons = {
    note: 'fas fa-pen-fancy',
    abstract: 'fas fa-file-alt',
    info: 'fas fa-info-circle',
    hint: 'fas fa-fire',
    success: 'fas fa-check',
    question: 'fas fa-question-circle',
    warning: 'fas fa-exclamation-triangle',
    failure: 'fas fa-times-circle',
    danger: 'fas fa-bolt',
    bug: 'fas fa-bug',
    example: 'fas fa-flask',
    quote: 'fas fa-quote-right',
}
/**
 * Note level in {@link NoteView}.
 */
export type NoteLevel = keyof typeof icons

/**
 * Relevant for expandable note only.
 * If `stateful`, the note will preserve its state upon collapse/expand,
 * otherwise the content is removed on collapse and regenerated on expand (effectively deleting the state).
 */
export type ExpandableMode = 'stateful' | 'stateless'
/**
 * Represents a note on the page.
 *
 * This view is registered in {@link GlobalMarkdownViews}: it can be instantiated from Markdown with an HTMLElement
 * using the tag `note`, see {@link NoteView.fromHTMLElement}.
 */
export class NoteView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class: string =
        'mkdocs-NoteView border rounded text-justify'
    public readonly children: ChildrenLike

    public readonly level: NoteLevel
    public readonly icon?: string | AnyVirtualDOM
    public readonly label: string | AnyVirtualDOM
    public readonly content: string | AnyVirtualDOM
    public readonly parsingArgs: { router: Router } & MdParsingOptions
    public readonly expandable: boolean = false
    public readonly expanded$ = new BehaviorSubject(false)
    public readonly mode: ExpandableMode = 'stateless'

    public readonly connectedCallback: (elem: RxHTMLElement<'div'>) => void
    /**
     * @param params
     * @param params.level Level of the note.
     * @param params.icon If provided, overrides the default icon associated to the given level.
     * @param params.label Label to display. If none is provided, it uses the level as default value.
     * @param params.content Text content.
     * @param params.expandable Whether the note is expandable. Expandable note are collapsed by default.
     * Default to `false`,
     * @param params.mode Only relevant for expandable note, see {@link ExpandableMode}.
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
            this.mode === 'stateless'
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
        this.connectedCallback = (elem) => {
            if (this.mode === 'stateful') {
                elem.ownSubscriptions(
                    this.expanded$
                        .pipe(filter((expanded) => expanded))
                        .subscribe(() => {
                            refreshResizeObservers(elem)
                        }),
                )
            }
        }
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
            undefined,
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
        'mkdocs-NoteHeaderView p-2 d-flex align-items-center'
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
                ? {
                      tag: 'div',
                      innerText: this.label,
                  }
                : this.label,
            {
                tag: 'div',
                class: 'flex-grow-1',
            },
            this.expandable
                ? {
                      tag: 'button',
                      class: attr$({
                          source$: this.expanded$,
                          vdomMap: (expanded): string =>
                              expanded ? 'fa-chevron-down' : 'fa-chevron-right',
                          wrapper: (d) =>
                              `${d} btn btn-sm mkdocs-hover-bg-${this.level} fas`,
                      }),
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
            class: `mkdocs-text-${level} ${icons[level]}`,
        }
    }
    if (typeof icon === 'string') {
        return {
            tag: 'i',
            class: `mkdocs-text-${level} ${icon}`,
        }
    }
    return {
        tag: 'i',
        class: `mkdocs-text-${level}`,
        children: [icon],
    }
}
