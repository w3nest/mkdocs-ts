import { AnyVirtualDOM, attr$, render } from 'rx-vdom'
import { Observable, of, take } from 'rxjs'
import type { AnyView } from '../../navigation.node'
import type { NoteLevel } from '../../md-widgets'

/**
 * Displays a notification on the screen with the given content.
 * Notifications are added to a central container and can be dismissed manually or automatically.
 *
 * **Behavior**
 *
 * - If no notification container exists, it creates one at the top-center of the screen.
 * - Appends the new notification to the container.
 * - Includes a "close" button for manual dismissal.
 * - Removes the notification automatically when:
 *   - `done$` emits a value.
 *   - The optional `duration` timer expires.
 *
 * **Example**
 *
 * <js-cell>
 * const { rxjs } = await webpm.install({ esm: ["rxjs#^7.5.6 as rxjs"] })
 * const notification = {
 *     tag: 'div',
 *     class: 'p-3',
 *     innerText: 'A notification...'
 * }
 * display({
 *     tag: 'button',
 *     class: 'btn btn-sm btn-primary',
 *     innerText: 'Notify',
 *     onclick: ()=> {
 *         Views.notify({
 *              content:notification,
 *              level: 'warning',
 *              duration: 3000
 *         })
 *         Views.notify({
 *              content:notification,
 *              level: 'info',
 *              done$: rxjs.timer(2000, 0)
 *         })
 *     }
 * })
 * </js-cell>
 *
 *
 * @param _p
 * @param _p.content The content to display in the notification.
 * @param _p.done$ Optional observable that, when emitting, removes the notification.
 * @param _p.duration Optional duration in milliseconds after which the notification will automatically disappear.
 */
export function notify({
    content,
    done$,
    duration,
    level,
}: {
    content: AnyView
    level: NoteLevel | Observable<NoteLevel>
    done$?: Observable<unknown>
    duration?: number
}) {
    let notif: HTMLElement
    const level$ = level instanceof Observable ? level : of(level)
    const containerId = 'notification-container'
    let container = document.getElementById(containerId)
    if (!container) {
        container = render({
            tag: 'div',
            id: containerId,
            class: 'overflow-auto',
            style: {
                fontSize: 'medium',
                position: 'fixed',
                maxHeight: 'calc(100vh - 10px)',
                maxWidth: '75vw',
                top: '0px',
                left: '50vw',
                transform: 'translateX(-50%)',
                // To be above the top banner (in 100...199)
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            },
            connectedCallback: (elem) => (container = elem),
        })
        document.body.appendChild(container)
    }
    const closeBtn: AnyVirtualDOM = {
        tag: 'button',
        class: 'btn btn-sm btn-primary',
        style: { width: 'fit-content' },
        innerText: 'close',
        onclick: () => {
            notif.remove()
        },
    }
    const wrapped: AnyVirtualDOM = {
        tag: 'div',
        class: attr$({
            source$: level$,
            vdomMap: (level) => {
                return `mkdocs-bg-${level} border rounded p-3 my-1 w-100`
            },
        }),
        children: [content, closeBtn],
        connectedCallback: (elem) => (notif = elem),
    }
    container.appendChild(render(wrapped))
    if (done$) {
        done$.pipe(take(1)).subscribe(() => {
            notif.remove()
        })
    }
    if (duration) {
        setTimeout(() => {
            notif.remove()
        }, duration)
    }
}
