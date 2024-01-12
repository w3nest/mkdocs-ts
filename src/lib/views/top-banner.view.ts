import { TopBannerView as TopBannerBase } from '@youwol/os-top-banner'

/**
 * Top banner of the application
 *
 * @category View.TopBanner
 */
export class TopBannerView extends TopBannerBase {
    public readonly tag = 'div'
    public readonly class =
        'fv-text-primary fv-bg-background mkdocs-ts-top-banner'

    constructor({ name }: { name: string }) {
        super({
            innerView: {
                tag: 'div',
                class: 'd-flex flex-column justify-content-center h-100',
                children: [
                    {
                        tag: 'div',
                        children: [
                            {
                                tag: 'div',
                                class: 'd-flex mx-auto justify-content-center px-5',
                                children: [
                                    {
                                        tag: 'div',
                                        class: 'd-flex align-items-center',
                                        style: {
                                            width: '12.1rem',
                                            padding: '1.2rem 0 1.2rem 0',
                                        },
                                        children: [
                                            {
                                                tag: 'a',
                                                class: 'fas fa-book-reader',
                                            },
                                            {
                                                tag: 'div',
                                                class: 'mx-3',
                                            },
                                            {
                                                tag: 'div',
                                                innerText: name,
                                                style: {
                                                    fontWeight: 700,
                                                    fontSize: '1.2rem',
                                                },
                                            },
                                        ],
                                    },
                                    {
                                        tag: 'div',
                                        style: {
                                            width: '800px',
                                        },
                                    },
                                    {
                                        tag: 'div',
                                        style: {
                                            width: '12.1rem',
                                            padding: '1.2rem 0 1.2rem 0',
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        })
    }
}
