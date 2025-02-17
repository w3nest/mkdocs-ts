import { BehaviorSubject, combineLatest, from, Observable, of } from 'rxjs'
import { install } from '@w3nest/webpm-client'
import { shareReplay } from 'rxjs/operators'
import { child$, ChildrenLike, RxHTMLElement, VirtualDOM } from 'rx-vdom'
import { ResizeObserverTrait } from './traits'

/**
 * Languages supported.
 */
export type CodeLanguage =
    | 'python'
    | 'javascript'
    | 'markdown'
    | 'html'
    | 'css'
    | 'yaml'
    | 'unknown'

/**
 * Interface specification of CodeMirror editor.
 */
export interface CodeMirrorEditor {
    on: (event: string, cb: (args: { getValue: () => string }) => void) => void
    refresh: () => void
    addLineClass: (line: number, kind: string, classes: string) => void
}

/**
 * Interface specification of CodeMirror module.
 */
export type CodeMirror = (
    element: HTMLElement,
    config: Record<string, unknown>,
) => CodeMirrorEditor

/**
 * Represents a code snippet view.
 *
 * This view is registered in {@link GlobalMarkdownViews}: it can be instantiated from Markdown with an HTMLElement
 * using the tag `code-snippet`, see {@link CodeSnippetView.fromHTMLElement}.
 *
 * ## Examples
 *
 * <note level="example" expandable="true" title="Javascript">
 * <md-cell>
 * <code-snippet language="javascript" highlightedLines="8">
 *
 * function compute({improbabilityFactor, babelFishCount, vogonPoetryExposure, towelAbsorbency }){
 *     console.log("Computation complete! The result is 42");
 *     const result =
 *         Math.log(improbabilityFactor + 42) +
 *         babelFishCount === 1 ? 1 : Math.sqrt(babelFishCount) +
 *         vogonPoetryExposure > 1000 ? -42 : vogonPoetryExposure / 100 +
 *         towelAbsorbency * (Math.random() + 0.42)
 *     return 42;
 * }
 * </code-snippet>
 * </md-cell>
 * </note>
 *
 *
 * <note level="example" expandable="true" title="Python">
 * <md-cell>
 * <code-snippet language="python" highlightedLines="8">
 *
 * def compute(improbabilityFactor, babelFishCount, vogonPoetryExposure, towelAbsorbency ):
 *     print("Computation complete! The result is 42");
 *     const result =
 *         Math.log(improbabilityFactor + 42) +
 *         babelFishCount === 1 ? 1 : Math.sqrt(babelFishCount) +
 *         vogonPoetryExposure > 1000 ? -42 : vogonPoetryExposure / 100 +
 *         towelAbsorbency * (Math.random() + 0.42)
 *     return 42;
 * </code-snippet>
 * </md-cell>
 * </note>
 *
 * <note level="example" expandable="true" title="HTML">
 * <md-cell>
 * <code-snippet language="htmlmixed" highlightedLines="11-25">
 * <!DOCTYPE html>
 * <html lang="en">
 * <head>
 *     <meta charset="UTF-8">
 *     <meta name="viewport" content="width=device-width, initial-scale=1.0">
 *     <title>Ultimate Computation</title>
 * </head>
 * <body>
 *     <h1>Ultimate Computation Example</h1>
 *     <p>Provide your parameters and compute the result!</p>
 *
 *     <form id="computation-form">
 *         <label for="improbabilityFactor">Improbability Factor:</label>
 *         <input type="number" id="improbabilityFactor" value="3"><br>
 *
 *         <label for="babelFishCount">Babel Fish Count:</label>
 *         <input type="number" id="babelFishCount" value="1"><br>
 *
 *         <label for="vogonPoetryExposure">Vogon Poetry Exposure:</label>
 *         <input type="number" id="vogonPoetryExposure" value="250"><br>
 *
 *         <label for="towelAbsorbency">Towel Absorbency:</label>
 *         <input type="number" id="towelAbsorbency" value="2"><br>
 *
 *         <button type="button" id="compute-button">Compute</button>
 *     </form>
 * </body>
 * </html>
 * </code-snippet>
 * </md-cell>
 * </note>
 *
 * <note level="example" expandable="true" title="XML">
 * <md-cell>
 * <code-snippet language="xml">
 * <Computation>
 *     <Parameters>
 *         <ImprobabilityFactor>3</ImprobabilityFactor>
 *         <BabelFishCount>1</BabelFishCount>
 *         <VogonPoetryExposure>250</VogonPoetryExposure>
 *         <TowelAbsorbency>2</TowelAbsorbency>
 *     </Parameters>
 *     <Result>42</Result>
 *     <Log>Computation complete! The result is always 42, but you knew that already.</Log>
 * </Computation>
 * </code-snippet>
 * </md-cell>
 * </note>
 *
 * <note level="example" expandable="true" title="CSS">
 * <md-cell>
 * <code-snippet language="css">
 * .computation-container {
 *    display: flex;
 *    flex-direction: column;
 *     align-items: center;
 *   justify-content: center;
 *   font-family: 'Courier New', Courier, monospace;
 *   background-color: #f0f8ff;
 *   border: 2px dashed #42a5f5;
 *   padding: 20px;
 *   margin: 20px;
 *   border-radius: 8px;
 *   box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
 * }
 * </code-snippet>
 * </md-cell>
 * </note>
 *
 * <note level="example" expandable="true" title="YAML">
 * <md-cell>
 * <code-snippet language="yaml">
 * computation:
 *   improbabilityFactor: 3       # A number too high might summon a whale and a bowl of petunias.
 *   babelFishCount: 1            # Keep it to one, unless you enjoy linguistic chaos.
 *   vogonPoetryExposure: 250     # Measured in verses endured. 1000+ is not recommended.
 *   towelAbsorbency: 2           # Towel quality. Higher is better for intergalactic travel.
 * </code-snippet>
 * </md-cell>
 * </note>
 *
 * <note level="example" expandable="true" title="Markdown">
 * <md-cell>
 * <code-snippet language="markdown">
 * ## Computation
 *
 * Here is a summary of the parameters:
 *
 * -  improbabilityFactor: 3
 * -  babelFishCount: 1
 * -  vogonPoetryExposure: 250
 * -  towelAbsorbency: 2
 * </code-snippet>
 * </md-cell>
 * </note>
 *
 */
export class CodeSnippetView implements VirtualDOM<'div'>, ResizeObserverTrait {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-CodeSnippetView'

    static readonly cmDependencies$: Record<
        CodeLanguage,
        Observable<{ CodeMirror: CodeMirror }> | undefined
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
    ): Observable<{ CodeMirror: CodeMirror }> {
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
        ).pipe(shareReplay(1)) as unknown as Observable<{
            CodeMirror: CodeMirror
        }>
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
    public readonly class = `mkdocs-CodeSnippetView w-100 overflow-auto mb-3 mkdocs-resize-observer`
    /**
     * The style of the associated HTML element.
     */
    public readonly style = {
        fontSize: 'initial',
    }
    /**
     * The children of the associated HTML element.
     */
    public readonly children: ChildrenLike

    public readonly content$: BehaviorSubject<string>

    public readonly editor$ = new BehaviorSubject<CodeMirrorEditor | undefined>(
        undefined,
    )

    /**
     * Attributes mapper from an `HTMLElement` to the arguments of the class's constructor.
     *
     * @param element The `HTMLElement`.
     */
    static attributeMapper = (element: HTMLElement) => ({
        language: element.getAttribute('language') as CodeLanguage,
        highlightedLines: element.getAttribute('highlightedLines') ?? undefined,
        content: element.textContent ?? '',
    })
    /**
     * Construct an instance of CodeSnippetView from an `HTMLElement`.
     *
     * See {@link CodeSnippetView.attributeMapper} for details on the attributes conversion from the `HTMLElement`.
     *
     * @param element The `HTMLElement`.
     */
    static fromHTMLElement(element: HTMLElement) {
        return new CodeSnippetView({
            ...CodeSnippetView.attributeMapper(element),
        })
    }

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
        cmConfig?: Record<string, unknown>
    }) {
        const content$ = of(content)
        const linesToHighlight = parseLineIndices(highlightedLines)
        this.content$ = new BehaviorSubject<string>(content)
        this.children = [
            child$({
                source$: combineLatest([
                    content$,
                    CodeSnippetView.fetchCmDependencies$(language),
                ]),
                vdomMap: ([content, { CodeMirror }]) => {
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
                            const editor = CodeMirror(htmlElement, config)
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
            }),
        ]
    }

    refreshView() {
        this.editor$.value?.refresh()
    }
}

function parseLineIndices(input?: string): number[] {
    if (!input) {
        return []
    }
    const parts = input.split(' ')
    const indices: number[] = []

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
    return [...new Set(indices)].sort((a, b) => a - b)
}
