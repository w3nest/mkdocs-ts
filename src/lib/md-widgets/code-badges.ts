import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { setup } from '../../auto-generated'
const baseIconPath = `/api/assets-gateway/webpm/resources/${setup.assetId}/${setup.version}/assets`

export const githubIcon = {
    tag: 'img' as const,
    src: `${baseIconPath}/github.svg`,
    width: 25,
}

export const pypiIcon = {
    tag: 'img' as const,
    src: `${baseIconPath}/pypi.svg`,
    width: 25,
}
export const mitIcon = {
    tag: 'img' as const,
    src: `${baseIconPath}/mit.svg`,
    width: 25,
}
export const npmIcon = {
    tag: 'img' as const,
    src: `${baseIconPath}/npm.svg`,
    width: 25,
}
export class BadgeView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-BadgeView'

    public readonly tag = 'div'
    public readonly class = `${BadgeView.CssSelector} d-flex align-items-center p-2 border rounded me-1`
    public readonly style = {
        width: 'fit-content',
    }
    public readonly children: ChildrenLike

    constructor({
        name,
        filename,
        href,
    }: {
        name: string
        filename: string
        href: string
    }) {
        this.children = [
            { tag: 'img', src: `${baseIconPath}/${filename}`, width: 25 },
            {
                tag: 'a',
                class: 'mx-1',
                innerText: name,
                target: 'blank',
                href,
            },
        ]
    }
}

export class VersionBadge implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex align-items-center p-2 border rounded me-1'
    public readonly children: ChildrenLike

    constructor({ version }: { version: string }) {
        this.children = [
            { tag: 'i', class: 'fas fa-bookmark', style: { width: '25px' } },
            {
                tag: 'div',
                class: 'mx-1',
                innerText: version,
            },
        ]
    }
}
/**
 * Display bagdes for version, github, npm...
 */
export class CodeBadgesView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mkdocs-CodeBadgesView'

    public readonly tag = 'div'
    public readonly class = `${CodeBadgesView.CssSelector} d-flex align-items-center flex-wrap`
    public readonly children: ChildrenLike

    /**
     * Attributes mapper from an `HTMLElement` to the arguments of the class's constructor.
     *
     * @param element The `HTMLElement`.
     */
    static attributeMapper = (element: HTMLElement) => ({
        license: element.getAttribute('license') ?? undefined,
        version: element.getAttribute('version') ?? undefined,
        npm: element.getAttribute('npm') ?? undefined,
        pypi: element.getAttribute('pypi') ?? undefined,
        github: element.getAttribute('github') ?? undefined,
    })

    /**
     * Construct an instance of NoteView from an `HTMLElement`.
     *
     * See {@link CodeBadgesView.attributeMapper} for details on the attributes conversion from the `HTMLElement`.
     *
     * @param element The `HTMLElement`.
     */
    static fromHTMLElement(element: HTMLElement) {
        return new CodeBadgesView({
            ...CodeBadgesView.attributeMapper(element),
        })
    }

    /**
     * Initializes a new instance.
     *
     * @param _args The arguments.
     * @param _args.github Github target, if not provided the associated badge is not displayed.
     * The final url is `https://github.com/${github}`.
     * @param _args.npm NPM target, if not provided the associated badge is not displayed.
     * The final url is `https://npmjs.com/package/${npm}`.
     * @param _args.pypi Pypi target, if not provided the associated badge is not displayed.
     * The final url is `https://pypi.org/project/${pypi}`.
     * @param _args.version Version bookmark, if not provided the associated badge is not displayed.
     * @param _args.license License badge (only 'MIT' supported), if not provided the associated badge is not displayed.
     */
    constructor({
        github,
        npm,
        pypi,
        version,
        license,
    }: {
        github?: string
        npm?: string
        pypi?: string
        version?: string
        license?: string
    }) {
        this.children = [
            version ? new VersionBadge({ version }) : undefined,
            github
                ? new BadgeView({
                      name: 'Github Sources',
                      filename: 'github.svg',
                      href: `https://github.com/${github}`,
                  })
                : undefined,
            npm
                ? new BadgeView({
                      name: 'Package',
                      filename: 'npm.svg',
                      href: `https://npmjs.com/package/${npm}`,
                  })
                : undefined,
            pypi
                ? new BadgeView({
                      name: 'Package',
                      filename: 'pypi.svg',
                      href: `https://pypi.org/project/${pypi}`,
                  })
                : undefined,
            license && license === 'mit'
                ? new BadgeView({
                      name: 'MIT',
                      filename: 'mit.svg',
                      href: `https://en.wikipedia.org/wiki/MIT_License`,
                  })
                : undefined,
        ]
    }
}
