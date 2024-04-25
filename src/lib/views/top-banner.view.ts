import { TopBannerView as TopBannerBase } from '@youwol/os-top-banner'
import { distinctUntilChanged, Subject } from 'rxjs'
import { DisplayMode } from './default-layout.view'
import { ModalNavigationView } from './navigation.view'
import { Router } from '../router'

/**
 * Simple top banner definition, including:
 * *  Eventually a dropdown menu to expand the {@link ModalNavigationView} (on small screen)
 * *  A title
 *
 */
export class TopBannerView extends TopBannerBase {
    public readonly tag = 'div'
    public readonly class =
        'fv-text-primary fv-bg-background mkdocs-ts-top-banner'

    constructor({
        name,
        displayModeNav$,
        router,
    }: {
        name: string
        displayModeNav$: Subject<DisplayMode>
        router: Router
    }) {
        super({
            innerView: {
                tag: 'div',
                class: 'd-flex flex-column justify-content-center h-100',
                children: [
                    {
                        tag: 'div',
                        class: 'd-flex mx-auto align-items-center justify-content-center px-5',
                        children: [
                            {
                                source$: displayModeNav$.pipe(
                                    distinctUntilChanged(),
                                ),
                                vdomMap: (mode: DisplayMode) => {
                                    return mode === 'Full'
                                        ? { tag: 'div' }
                                        : new ModalNavigationView({
                                              router,
                                          })
                                },
                            },
                            {
                                tag: 'div',
                                class: 'mx-3',
                            },
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
        })
    }
}
