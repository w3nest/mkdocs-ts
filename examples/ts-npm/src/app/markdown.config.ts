import { GlobalMarkdownViews, MdWidgets, IconFactory, faIcon } from 'mkdocs-ts'
import { TRexView } from './trex.view'
import { faStar } from '@fortawesome/free-solid-svg-icons/faStar'
/**
 * Registers custom Markdown widgets and configuration for use within MkDocs-TS-rendered Markdown content.
 *
 * This function performs the following setup:
 *
 * 1. **Code Snippet Configuration**:
 *    - Overrides the default CDN source for Prism.js grammars by setting
 *      `CodeSnippetView.defaultLanguagesFolder` to use a local path (`/assets/prism/`).
 *
 * 2. **External Link Mapping**:
 *    - Registers mappings for the `<ext-link>` Markdown element, enabling links to external documentation.
 *    - Example usage in Markdown: `<ext-link target="NotebookDoc">Notebook Docs</ext-link>`
 *
 * 3. **API Link Mapping**:
 *    - Registers mappings for the `<api-link>` Markdown element, allowing links to internal API documentation.
 *    - Example usage in Markdown: `<api-link target="TRexView"></api-link>`
 *
 * 4. **Custom Markdown View Registration**:
 *    - Registers a custom Markdown tag `<TRex></TRex>` that renders a `TRexView` component.
 *    - Supports an optional `name` attribute to personalize the TRex animation.
 *
 * This function should be called once during application initialization, before rendering any Markdown content.
 *
 * @example
 * // Register custom widgets before app initialization
 * registerMdWidgets()
 */
export function registerMdWidgets() {
    // By default (when not set), languages grammar for MD code blocks and <code-snippet> elements are fetched from
    // WebPM CDN. By setting 'defaultLanguagesFolder', local resources are used instead.
    MdWidgets.CodeSnippetView.defaultLanguagesFolder = '/assets/prism/'

    // This declares external links, they can be referenced in MD using e.g.
    // `<ext-link target="MdBuiltInViews">Foo</ext-link>`.
    MdWidgets.ExtLink.Mapper = (target: string) => {
        const dict: Record<string, { href: string }> = {
            MdBuiltInViews: {
                href: 'https://w3nest.org/apps/@mkdocs-ts/doc/latest?nav=/api/mkdocs-ts/MdWidgets',
            },
            NotebookDoc: {
                href: 'https://w3nest.org/apps/@mkdocs-ts/doc/latest?nav=/tutorials/notebook',
            },
        }
        return target in dict ? dict[target] : undefined
    }

    // This declares links to the API documentation, they can be referenced in MD using e.g.
    // `<api-link target="TRexView"></api-link>`.
    MdWidgets.ApiLink.Mapper = (target: string) => {
        const dict: Record<string, { href: string; withClass: string }> = {
            TRexView: {
                href: '@nav/api.TRexView',
                withClass: 'mkapi-role-class',
            },
        }
        return target in dict ? dict[target] : undefined
    }

    // This register a custom Markdown view, it can be referenced in MD using `<TRex></TRex>`
    GlobalMarkdownViews.factory = {
        ...GlobalMarkdownViews.factory,
        TRex: (elem: HTMLElement) => {
            return new TRexView({
                name: elem.getAttribute('name') ?? 'TRex',
            })
        },
    }

    // Make the icon 'star' available, e.g. when parsing Markdown (`<icon target='star'></icon>`)
    // or when using note (`<note icon='star'></note>`).
    IconFactory.register({
        star: faIcon(faStar),
    })
}
