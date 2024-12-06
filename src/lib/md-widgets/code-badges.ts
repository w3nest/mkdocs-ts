import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { setup } from '../../auto-generated'

class BadgeView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex align-items-center p-2 border rounded m-1'
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
        const basePath = `/api/assets-gateway/webpm/resources/${setup.assetId}/${setup.version}/assets`
        this.children = [
            { tag: 'img', src: `${basePath}/${filename}`, width: 25 },
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

/**
 * Display bagdes for github and/or npm.
 */
export class CodeBadgesView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex align-items-center'
    public readonly children: ChildrenLike

    /**
     * Initializes a new instance.
     *
     * @param _args The arguments.
     * @param _args.github Github target, if not provided the associated bagde is not displayed.
     * The final url is `https://github.com/${github}`.
     * @param _args.npm NPM target, if not provided the associated bagde is not displayed.
     * The final url is `https://npmjs.com/package/${npm}`.
     */
    constructor({ github, npm }: { github?: string; npm?: string }) {
        this.children = [
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
        ]
    }
}
