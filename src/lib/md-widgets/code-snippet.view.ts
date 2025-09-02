import { BehaviorSubject } from 'rxjs'
import { ChildrenLike, VirtualDOM } from 'rx-vdom'

import prismCore from 'prismjs/components/prism-core'
import 'prismjs/plugins/autoloader/prism-autoloader'
import 'prismjs/plugins/line-numbers/prism-line-numbers'
import 'prismjs/plugins/line-highlight/prism-line-highlight'

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
export interface CodeMirror {
    default: (
        element: HTMLElement,
        config: Record<string, unknown>,
    ) => CodeMirrorEditor
}

function getW3NestCookie() {
    const name = 'w3nest'
    const regex = new RegExp(`(^| )${name}=([^;]+)`)
    const match = regex.exec(document.cookie)
    if (match) {
        try {
            const decoded = decodeURIComponent(match[2]).slice(1, -1)
            return JSON.parse(decoded) as {
                origin: string
                webpm: { pathResource: string }
            }
        } catch {
            return undefined
        }
    }
}
/**
 * Represents a code snippet view.
 *
 * This view is registered in {@link GlobalMarkdownViews}: it can be instantiated from Markdown with an HTMLElement
 * using the tag `code-snippet`, see {@link CodeSnippetView.fromHTMLElement}.
 *
 * The language supported are defined by {@link CodeLanguage}.
 *
 * ## Examples
 *
 * <note level="example" title="Javascript" expandable="true" mode="stateless">
 * <md-cell>
 * <code-snippet language="javascript" highlightedLines="8">
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
 * <note level="example" expandable="true" title="Python"  mode="stateless">
 * <md-cell>
 * <code-snippet language="python" highlightedLines="8">
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
 * <note level="example" expandable="true" title="HTML"  mode="stateless">
 * <md-cell>
 * <code-snippet language="html" highlightedLines="11-25">
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
 * <note level="example" expandable="true" title="XML"  mode="stateless">
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
 * <note level="example" expandable="true" title="CSS"  mode="stateless">
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
 * <note level="example" expandable="true" title="YAML"  mode="stateless">
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
 * <note level="example" expandable="true" title="Markdown"  mode="stateless">
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
export class CodeSnippetView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-CodeSnippetView'

    static defaultLanguagesFolder =
        'https://w3nest.org/api/assets-gateway/webpm/resources/cHJpc21qcw==/1.30.0/components/'

    /**
     * The tag of the associated HTML element.
     */
    public readonly tag = 'div'

    /**
     * The class list of the associated HTML element.
     */
    public readonly class = `mkdocs-CodeSnippetView w-100 overflow-auto mb-3 mkdocs-resize-observer`
    /**
     * The style of the associated HTML element.
     */
    public readonly style = {
        fontSize: '0.8rem',
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
        language: (element.getAttribute('language') ??
            'unknown') as CodeLanguage,
        highlightedLines: element.getAttribute('highlightedLines') ?? undefined,
        lineNumbers:
            element.getAttribute('lineNumbers') &&
            element.getAttribute('lineNumbers') == 'true'
                ? true
                : false,
        content: element.textContent,
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
     * @param _args.language The target language.
     * @param _args.content The snippet's content.
     * @param _args.highlightedLines Highlighted lines, *e.g.* `5 10 20-25 28 30`.
     * @param _args.lineNumbers whether to display line numbers.
     */
    constructor({
        language,
        content,
        highlightedLines,
        lineNumbers,
    }: {
        language: CodeLanguage
        highlightedLines?: string
        lineNumbers?: boolean
        content: string
    }) {
        this.content$ = new BehaviorSubject<string>(content)

        const prismCoreCasted = prismCore as {
            plugins: { autoloader: { languages_path: string } }
            highlightElement: (e: HTMLElement) => void
        }
        prismCoreCasted.plugins.autoloader.languages_path =
            CodeSnippetView.defaultLanguagesFolder
        const w3nestCookie = getW3NestCookie()
        if (w3nestCookie) {
            const origin = w3nestCookie.origin
            const pathResource = w3nestCookie.webpm.pathResource
            prismCoreCasted.plugins.autoloader.languages_path = `${origin}${pathResource}/cHJpc21qcw==/1.30.0/components/`
        }
        const lineNumbersClass =
            lineNumbers || highlightedLines ? 'line-numbers' : ''
        const languageClass =
            language === 'unknown' ? '' : `language-${language}`
        const customAttributes: Record<string, string> = highlightedLines
            ? {
                  dataLine: highlightedLines.trim().replace(/\s+/g, ','),
              }
            : {}
        this.children = [
            {
                tag: 'pre',
                class: `${lineNumbersClass} ${languageClass}`,
                customAttributes,
                children: [
                    {
                        tag: 'code',
                        connectedCallback: (e) => {
                            e.textContent = content
                            prismCoreCasted.highlightElement(e)
                        },
                    },
                ],
            },
        ]
    }
}

/**
 * Languages supported.
 *
 * See {@link https://prismjs.com/#supported-languages}.
 */
export type CodeLanguage =
    | 'unknown'
    | 'markup'
    | 'html'
    | 'xml'
    | 'svg'
    | 'mathml'
    | 'ssml'
    | 'atom'
    | 'rss'
    | 'css'
    | 'clike'
    | 'javascript'
    | 'js'
    | 'abap'
    | 'abnf'
    | 'actionscript'
    | 'ada'
    | 'agda'
    | 'al'
    | 'antlr4'
    | 'g4'
    | 'apacheconf'
    | 'apex'
    | 'apl'
    | 'applescript'
    | 'aql'
    | 'arduino'
    | 'ino'
    | 'arff'
    | 'armasm'
    | 'arm-asm'
    | 'arturo'
    | 'art'
    | 'asciidoc'
    | 'adoc'
    | 'aspnet'
    | 'asm6502'
    | 'asmatmel'
    | 'autohotkey'
    | 'autoit'
    | 'avisynth'
    | 'avs'
    | 'avro-idl'
    | 'avdl'
    | 'awk'
    | 'gawk'
    | 'bash'
    | 'sh'
    | 'shell'
    | 'basic'
    | 'batch'
    | 'bbcode'
    | 'shortcode'
    | 'bbj'
    | 'bicep'
    | 'birb'
    | 'bison'
    | 'bnf'
    | 'rbnf'
    | 'bqn'
    | 'brainfuck'
    | 'brightscript'
    | 'bro'
    | 'bsl'
    | 'oscript'
    | 'c'
    | 'csharp'
    | 'cs'
    | 'dotnet'
    | 'cpp'
    | 'cfscript'
    | 'cfc'
    | 'chaiscript'
    | 'cil'
    | 'cilkc'
    | 'cilk-c'
    | 'cilkcpp'
    | 'cilk-cpp'
    | 'cilk'
    | 'clojure'
    | 'cmake'
    | 'cobol'
    | 'coffeescript'
    | 'coffee'
    | 'concurnas'
    | 'conc'
    | 'csp'
    | 'cooklang'
    | 'coq'
    | 'crystal'
    | 'css-extras'
    | 'csv'
    | 'cue'
    | 'cypher'
    | 'd'
    | 'dart'
    | 'dataweave'
    | 'dax'
    | 'dhall'
    | 'diff'
    | 'django'
    | 'jinja2'
    | 'dns-zone-file'
    | 'dns-zone'
    | 'docker'
    | 'dockerfile'
    | 'dot'
    | 'gv'
    | 'ebnf'
    | 'editorconfig'
    | 'eiffel'
    | 'ejs'
    | 'eta'
    | 'elixir'
    | 'elm'
    | 'etlua'
    | 'erb'
    | 'erlang'
    | 'excel-formula'
    | 'xlsx'
    | 'xls'
    | 'fsharp'
    | 'factor'
    | 'false'
    | 'firestore-security-rules'
    | 'flow'
    | 'fortran'
    | 'ftl'
    | 'gml'
    | 'gamemakerlanguage'
    | 'gap'
    | 'gcode'
    | 'gdscript'
    | 'gedcom'
    | 'gettext'
    | 'po'
    | 'gherkin'
    | 'git'
    | 'glsl'
    | 'gn'
    | 'gni'
    | 'linker-script'
    | 'ld'
    | 'go'
    | 'go-module'
    | 'go-mod'
    | 'gradle'
    | 'graphql'
    | 'groovy'
    | 'haml'
    | 'handlebars'
    | 'hbs'
    | 'mustache'
    | 'haskell'
    | 'hs'
    | 'haxe'
    | 'hcl'
    | 'hlsl'
    | 'hoon'
    | 'http'
    | 'hpkp'
    | 'hsts'
    | 'ichigojam'
    | 'icon'
    | 'icu-message-format'
    | 'idris'
    | 'idr'
    | 'ignore'
    | 'gitignore'
    | 'hgignore'
    | 'npmignore'
    | 'inform7'
    | 'ini'
    | 'io'
    | 'j'
    | 'java'
    | 'javadoc'
    | 'javadoclike'
    | 'javastacktrace'
    | 'jexl'
    | 'jolie'
    | 'jq'
    | 'jsdoc'
    | 'js-extras'
    | 'json'
    | 'webmanifest'
    | 'json5'
    | 'jsonp'
    | 'jsstacktrace'
    | 'js-templates'
    | 'julia'
    | 'keepalived'
    | 'keyman'
    | 'kotlin'
    | 'kt'
    | 'kts'
    | 'kumir'
    | 'kum'
    | 'kusto'
    | 'latex'
    | 'tex'
    | 'context'
    | 'latte'
    | 'less'
    | 'lilypond'
    | 'ly'
    | 'liquid'
    | 'lisp'
    | 'emacs'
    | 'elisp'
    | 'emacs-lisp'
    | 'livescript'
    | 'llvm'
    | 'log'
    | 'lolcode'
    | 'lua'
    | 'magma'
    | 'makefile'
    | 'markdown'
    | 'md'
    | 'markup-templating'
    | 'mata'
    | 'matlab'
    | 'maxscript'
    | 'mel'
    | 'mermaid'
    | 'metafont'
    | 'mizar'
    | 'mongodb'
    | 'monkey'
    | 'moonscript'
    | 'moon'
    | 'n1ql'
    | 'n4js'
    | 'n4jsd'
    | 'nand2tetris-hdl'
    | 'naniscript'
    | 'nani'
    | 'nasm'
    | 'neon'
    | 'nevod'
    | 'nginx'
    | 'nim'
    | 'nix'
    | 'nsis'
    | 'objectivec'
    | 'objc'
    | 'ocaml'
    | 'odin'
    | 'opencl'
    | 'openqasm'
    | 'qasm'
    | 'oz'
    | 'parigp'
    | 'parser'
    | 'pascal'
    | 'objectpascal'
    | 'pascaligo'
    | 'psl'
    | 'pcaxis'
    | 'px'
    | 'peoplecode'
    | 'pcode'
    | 'perl'
    | 'php'
    | 'phpdoc'
    | 'php-extras'
    | 'plant-uml'
    | 'plantuml'
    | 'plsql'
    | 'powerquery'
    | 'pq'
    | 'mscript'
    | 'powershell'
    | 'processing'
    | 'prolog'
    | 'promql'
    | 'properties'
    | 'protobuf'
    | 'pug'
    | 'puppet'
    | 'pure'
    | 'purebasic'
    | 'pbfasm'
    | 'purescript'
    | 'purs'
    | 'python'
    | 'py'
    | 'qsharp'
    | 'qs'
    | 'q'
    | 'qml'
    | 'qore'
    | 'r'
    | 'racket'
    | 'rkt'
    | 'cshtml'
    | 'razor'
    | 'jsx'
    | 'tsx'
    | 'reason'
    | 'regex'
    | 'rego'
    | 'renpy'
    | 'rpy'
    | 'rescript'
    | 'res'
    | 'rest'
    | 'rip'
    | 'roboconf'
    | 'robotframework'
    | 'robot'
    | 'ruby'
    | 'rb'
    | 'rust'
    | 'sas'
    | 'sass'
    | 'scss'
    | 'scala'
    | 'scheme'
    | 'shell-session'
    | 'sh-session'
    | 'shellsession'
    | 'smali'
    | 'smalltalk'
    | 'smarty'
    | 'sml'
    | 'smlnj'
    | 'solidity'
    | 'sol'
    | 'solution-file'
    | 'sln'
    | 'soy'
    | 'sparql'
    | 'rq'
    | 'splunk-spl'
    | 'sqf'
    | 'sql'
    | 'squirrel'
    | 'stan'
    | 'stata'
    | 'iecst'
    | 'stylus'
    | 'supercollider'
    | 'sclang'
    | 'swift'
    | 'systemd'
    | 't4-templating'
    | 't4-cs'
    | 't4'
    | 't4-vb'
    | 'tap'
    | 'tcl'
    | 'tt2'
    | 'textile'
    | 'toml'
    | 'tremor'
    | 'trickle'
    | 'troy'
    | 'turtle'
    | 'trig'
    | 'twig'
    | 'typescript'
    | 'ts'
    | 'typoscript'
    | 'tsconfig'
    | 'unrealscript'
    | 'uscript'
    | 'uc'
    | 'uorazor'
    | 'uri'
    | 'url'
    | 'v'
    | 'vala'
    | 'vbnet'
    | 'velocity'
    | 'verilog'
    | 'vhdl'
    | 'vim'
    | 'visual-basic'
    | 'vb'
    | 'vba'
    | 'warpscript'
    | 'wasm'
    | 'web-idl'
    | 'webidl'
    | 'wgsl'
    | 'wiki'
    | 'wolfram'
    | 'mathematica'
    | 'nb'
    | 'wl'
    | 'wren'
    | 'xeora'
    | 'xeoracube'
    | 'xml-doc'
    | 'xojo'
    | 'xquery'
    | 'yaml'
    | 'yml'
    | 'yang'
    | 'zig'
