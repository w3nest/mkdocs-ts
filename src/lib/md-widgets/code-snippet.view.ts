import { BehaviorSubject, combineLatest, from, Observable, of } from 'rxjs'
import { install } from '@w3nest/webpm-client'
import { shareReplay } from 'rxjs/operators'
import { ChildrenLike, RxHTMLElement, VirtualDOM } from 'rx-vdom'
import { type Editor } from 'codemirror'

export type CodeLanguage =
    | 'python'
    | 'javascript'
    | 'markdown'
    | 'html'
    | 'css'
    | 'yaml'
    | 'unknown'

/**
 * The widget for code snippet.
 */
export class CodeSnippetView implements VirtualDOM<'div'> {
    static readonly cmDependencies$: Record<
        CodeLanguage,
        Observable<WindowOrWorkerGlobalScope> | undefined
    > = {
        python: undefined,
        javascript: undefined,
        markdown: undefined,
        html: undefined,
        yaml: undefined,
        css: undefined,
        unknown: undefined,
    }
    static fetchCmDependencies$(
        language: CodeLanguage,
    ): Observable<WindowOrWorkerGlobalScope> {
        if (CodeSnippetView.cmDependencies$[language]) {
            return CodeSnippetView.cmDependencies$[language]
        }
        const scripts = {
            python: ['codemirror#5.52.0~mode/python.min.js'],
            javascript: ['codemirror#5.52.0~mode/javascript.min.js'],
            markdown: ['codemirror#5.52.0~mode/markdown.min.js'],
            html: ['codemirror#5.52.0~mode/htmlmixed.min.js'],
            yaml: ['codemirror#5.52.0~mode/yaml.min.js'],
            css: ['codemirror#5.52.0~mode/css.min.js'],
            xml: ['codemirror#5.52.0~mode/xml.min.js'],
            htmlmixed: [
                'codemirror#5.52.0~mode/htmlmixed.min.js',
                'codemirror#5.52.0~mode/css.min.js',
                'codemirror#5.52.0~mode/xml.min.js',
                'codemirror#5.52.0~mode/javascript.min.js',
            ],
            unknown: [],
        }
        CodeSnippetView.cmDependencies$[language] = from(
            install({
                modules: ['codemirror'],
                scripts: scripts[language],
                css: ['codemirror#5.52.0~codemirror.min.css'],
            }),
        ).pipe(shareReplay(1))
        return CodeSnippetView.cmDependencies$[language]
    }

    /**
     * Class appended to the line DOM for highlighted lines.
     */
    static readonly hlLineClass = 'mkdocs-ts-bg-highlight'

    /**
     * The tag of the associated HTML element.
     */
    public readonly tag = 'div'
    /**
     * The code mirror configuration.
     */
    public readonly codeMirrorConfiguration = {
        lineNumbers: true,
        lineWrapping: false,
        indentUnit: 4,
        readOnly: true,
    }

    /**
     * The class list of the associated HTML element.
     */
    public readonly class = 'mkdocs-ts CodeSnippetView w-100 overflow-auto mb-3'
    /**
     * The style of the associated HTML element.
     */
    public readonly style = {
        fontSize: 'small',
    }
    /**
     * The children of the associated HTML element.
     */
    public readonly children: ChildrenLike

    public readonly content$: BehaviorSubject<string>

    public readonly editor$ = new BehaviorSubject<Editor | undefined>(undefined)
    /**
     * Initialize the widget.
     *
     * @param _args arguments
     * @param _args.language The target language. Supported languages are:
     *      *  python
     *      *  javascript
     *      *  markdown
     *      *  html
     *      *  yaml
     *      *  css
     *      *  xml
     * @param _args.content The snippet's content.
     * @param _args.highlightedLines Highlighted lines, *e.g.* `[5 10 20-25  28 30]`
     * @param _args.cmConfig The code mirror editor configuration, it is merged with the
     *     {@link CodeSnippetView.codeMirrorConfiguration | default configuration} (eventually overriding attributes).
     */
    constructor({
        language,
        content,
        highlightedLines,
        cmConfig,
    }: {
        language: CodeLanguage
        highlightedLines?: string
        content: string //| Observable<string>
        cmConfig?: { [k: string]: unknown }
    }) {
        const content$ = typeof content == 'string' ? of(content) : content
        const linesToHighlight = parseLineIndices(highlightedLines)
        this.content$ = new BehaviorSubject<string>(content)
        this.children = [
            {
                source$: combineLatest([
                    content$,
                    CodeSnippetView.fetchCmDependencies$(language),
                ]),
                vdomMap: ([content, _]: [string, unknown]) => {
                    return {
                        tag: 'div',
                        class: 'h-100 w-100',
                        connectedCallback: (
                            htmlElement: RxHTMLElement<'div'>,
                        ) => {
                            const config = {
                                mode: language,
                                ...this.codeMirrorConfiguration,
                                value: content,
                                ...cmConfig,
                            }
                            const editor = window['CodeMirror'](
                                htmlElement,
                                config,
                            ) as Editor
                            editor.on('change', (args) => {
                                this.content$.next(args.getValue())
                            })
                            linesToHighlight.forEach(function (lineNumber) {
                                editor.addLineClass(
                                    lineNumber,
                                    'background',
                                    CodeSnippetView.hlLineClass,
                                )
                            })

                            editor.refresh()
                            this.editor$.next(editor)
                        },
                    }
                },
            },
        ]
    }
}

function parseLineIndices(input?: string): number[] {
    if (!input) {
        return []
    }
    const parts = input.split(' ')
    let indices = []

    parts.forEach((part) => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number) // Convert start and end to numbers
            for (let i = start; i <= end; i++) {
                indices.push(i)
            }
        } else {
            indices.push(parseInt(part))
        }
    })
    indices = [...new Set(indices)].sort((a, b) => a - b)

    return indices
}
