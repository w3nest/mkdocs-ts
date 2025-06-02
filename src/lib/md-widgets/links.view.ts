import { AnyVirtualDOM, ChildrenLike, CSSAttribute, VirtualDOM } from 'rx-vdom'
import { faIconTyped } from '../default-layout/fa-icons'

/**
 * A function that maps a string target (link identifier) to
 * href, optional CSS class, and optional style attributes.
 *
 * The `elem` argument is the `HTMLElement` as defined in the Markdown content.
 */
export type LinkMapper = (
    target: string,
    elem: HTMLElement,
) =>
    | {
          href?: string
          withClass?: string
          withStyle?: CSSAttribute
      }
    | undefined
/**
 * Base class for rendering a hyperlink (`<a>`) VirtualDOM element with text & icon.
 * This uses the `target` attribute from the provided DOM element along with the provided mapping function
 * to resolve link information and generate text & icon.
 */
export class LinkView implements VirtualDOM<'a'> {
    public readonly tag = 'a'
    public readonly children: ChildrenLike
    public readonly href: string
    public readonly target: string
    private readonly elem: HTMLElement
    /**
     * Create an hyperlink from a corresponding HTMLElement in Markdown.
     *
     * @param _p
     * @param _p.elem The source HTML element containing a `target` attribute.
     * @param _p.icon An icon to render before or after the label.
     * @param _p.mapper A function that maps the target string to `href`, `withClass`, and `withStyle`.
     * @param _p.newTab Whether to open the link in a new tab.
     * @param _p.classPrefix Class prefix to always include.
     */
    constructor({
        elem,
        icon,
        mapper,
        newTab,
        classPrefix,
    }: {
        elem: HTMLElement
        icon: AnyVirtualDOM
        mapper?: LinkMapper
        newTab: boolean
        classPrefix?: string
    }) {
        this.elem = elem
        if (!mapper) {
            console.warn(
                'Can not construct the link widget: no `mapper` defined',
            )
            return
        }
        const target = this.elem.getAttribute('target')
        if (!target) {
            console.warn(
                'Can not construct the link widget: no `target` attribute provided',
            )
            return
        }
        const attributes = mapper(target, elem)
        if (!attributes) {
            console.warn(
                `Can not construct the link widget: no attributes declared for ${target}`,
            )
            return
        }
        const { href, withClass, withStyle } = attributes
        if (!href) {
            console.warn(
                `Can not construct the link widget: no 'href' returned by the mapper  for ${target}`,
            )
            return
        }
        if (newTab) {
            this.target = '_blank'
        }
        this.href = href
        const customClass = withClass ?? ''
        this.children = [
            {
                tag: 'i',
                innerText:
                    elem.textContent === '' ? target : (elem.textContent ?? ''),
                class: `${classPrefix ?? ''} ${customClass} pe-1`,
                style: withStyle ?? {},
            },
            icon,
        ]
    }
}

const stdIconFontSize = '0.6rem'

/**
 * Link component for referencing API entities (such as modules, classes, methods, etc):
 *
 * <md-cell>
 * <api-link target="MdWidgets"></api-link>
 * </md-cell>
 *
 * <note level="warning">
 * It requires the consumer-provided {@link ApiLink.Mapper} implementation that resolves the `target` attribute
 * of an HTML element into a valid specification.
 * </note>
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ApiLink {
    /**
     * Maps a string `target` to an object containing:
     * - `href`: the relative URL fragment in the form e.g. `@nav/api/foo.bar`.
     * - `withClass`: a semantic CSS class such as `mkapi-role-function`, `mkapi-role-method`, etc.
     * - `withStyle` (optional): additional inline styles.
     *
     * This should be implemented by the consumer of the class.
     */
    static Mapper: LinkMapper

    /**
     * Icon representing API links, shown alongside the label.
     */
    static readonly icon: AnyVirtualDOM = faIconTyped('fa-code', {
        withStyle: { fontSize: stdIconFontSize },
    })
    /**
     * Creates the view from a given HTML element.
     * The element should include a `target` attribute used to resolve link details via the mapper.
     *
     * @param elem - The original HTMLElement parsed from Markdown or the DOM.
     * @returns A `BaseLink` instance representing the rendered VirtualDOM anchor tag.
     */
    static fromHTMLElement(elem: HTMLElement): LinkView {
        return new LinkView({
            elem,
            icon: ApiLink.icon,
            mapper: ApiLink.Mapper,
            newTab: false,
            classPrefix: 'mkapi-semantic-flag',
        })
    }
}

/**
 * Link component for external resources:
 *
 * <md-cell>
 * <ext-link target="adams">D. Adams</ext-link>
 * </md-cell>
 *
 *
 * <note level="warning">
 * It requires the consumer-provided {@link ExtLink.Mapper} implementation that resolves the `target` attribute
 * of an HTML element into a valid specification.
 * </note>
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ExtLink {
    /**
     * Maps a string `target` to an object containing:
     * - `href`: an absolute URL (e.g., `https://example.com`)
     * - `withClass` (optional): a CSS class to apply for custom styling.
     * - `withStyle` (optional): inline styles to apply to the link.
     *
     * This should be implemented by the consumer of the class.
     */
    static Mapper: LinkMapper
    /**
     * Icon representing external links, shown alongside the label.
     */
    static readonly icon: AnyVirtualDOM = faIconTyped('fa-external-link-alt', {
        withStyle: { fontSize: stdIconFontSize },
    })
    /**
     * Constructor from HTML element as defined in the Markdown source.
     *
     * @param elem HTML element.
     * @returns The hyperlink element.
     */
    static fromHTMLElement(elem: HTMLElement): LinkView {
        return new LinkView({
            elem,
            icon: ExtLink.icon,
            mapper: ExtLink.Mapper,
            newTab: true,
        })
    }
}
/**
 * Link component for GitHub resources:
 *
 * <md-cell>
 * <github-link target="tutorials.basics.md">GitHub page </github-link>
 * </md-cell>
 *
 * <note level="warning">
 * It requires the consumer-provided {@link GitHubLink.Mapper} implementation that resolves the `target` attribute
 * of an HTML element into a valid specification.
 * </note>
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GitHubLink {
    /**
     * Maps a string `target` to an object containing:
     * - `href`: an absolute URL to a GitHub resource.
     * - `withClass` (optional): a CSS class to apply for custom styling.
     * - `withStyle` (optional): inline styles to apply to the link.
     *
     * This should be implemented by the consumer of the class.
     */
    static Mapper: LinkMapper
    /**
     * Icon representing GitHub links, shown alongside the label.
     */
    static readonly icon: AnyVirtualDOM = faIconTyped('fab-github', {
        withStyle: { fontSize: '0.8rem' },
    })
    /**
     * Creates the view from a given HTML element.
     * The element should include a `target` attribute used to resolve link details via the mapper.
     *
     * @param elem - The original HTMLElement parsed from Markdown or the DOM.
     * @returns A `BaseLink` instance representing the rendered VirtualDOM anchor tag.
     */
    static fromHTMLElement(elem: HTMLElement): LinkView {
        return new LinkView({
            elem,
            icon: GitHubLink.icon,
            mapper: GitHubLink.Mapper,
            newTab: true,
        })
    }
}
/**
 * Link component for cross-links:
 *
 * <md-cell>
 * <cross-link target="API">API</cross-link>
 * </md-cell>
 *
 * <note level="warning">
 * It requires the consumer-provided {@link CrossLink.Mapper} implementation that resolves the `target` attribute
 * of an HTML element into a valid specification.
 * </note>
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CrossLink {
    /**
     * Maps a string `target` to an object containing:
     * - `href`: the relative URL fragment in the form e.g. `@nav/tuto/getting-started`.
     * - `withClass` (optional): a CSS class to apply for custom styling.
     * - `withStyle` (optional): additional inline styles.
     *
     * This should be implemented by the consumer of the class.
     */
    static Mapper: LinkMapper
    /**
     * Icon representing cross links, shown alongside the label.
     */
    static readonly icon: AnyVirtualDOM = faIconTyped('fa-book-open', {
        withStyle: { fontSize: stdIconFontSize },
    })
    /**
     * Creates the view from a given HTML element.
     * The element should include a `target` attribute used to resolve link details via the mapper.
     *
     * @param elem - The original HTMLElement parsed from Markdown or the DOM.
     * @returns A `BaseLink` instance representing the rendered VirtualDOM anchor tag.
     */
    static fromHTMLElement(elem: HTMLElement): LinkView {
        return new LinkView({
            elem,
            icon: CrossLink.icon,
            mapper: CrossLink.Mapper,
            newTab: false,
        })
    }
}
