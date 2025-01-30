import { AnyVirtualDOM, append$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { map, Observable } from 'rxjs'
import { ConsoleEvent } from '@w3nest/webpm-client'
import { imageTopics } from './common.view'

/**
 * Logs View.
 */
export class LogsView implements VirtualDOM<'div'> {
    /**
     * Component's class name for CSS query.
     */
    static readonly CssSelector = 'mknb-LogsView'
    public readonly tag = 'div'
    public readonly class = `${LogsView.CssSelector} bg-dark text-light w-100 h-100 px-1 py-2 overflow-auto`
    public readonly children: ChildrenLike
    public readonly style = {
        fontSize: 'medium' as const,
        maxHeight: '25vh',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap' as const,
    }
    constructor({ logEvent$ }: { logEvent$: Observable<ConsoleEvent> }) {
        const entryView = (ev: ConsoleEvent): AnyVirtualDOM => {
            return {
                tag: 'div',
                class: 'd-flex align-items-center',
                children: [
                    {
                        tag: 'img',
                        src: imageTopics[ev.topic],
                        width: 15,
                    },
                    { tag: 'div', class: 'mx-1' },
                    {
                        tag: 'div',
                        class: ev.level === 'Error' ? 'text-danger' : '',
                        innerText: ev.text,
                    },
                ],
            }
        }
        this.children = [
            {
                tag: 'div',
                children: append$({
                    policy: 'append',
                    source$: logEvent$.pipe(map((e) => [e])),
                    vdomMap: (ev) => entryView(ev),
                }),
            },
        ]
    }
}
