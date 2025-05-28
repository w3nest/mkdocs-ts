import { AnyVirtualDOM } from 'rx-vdom'
import { BehaviorSubject } from 'rxjs'

export const companionNodes$ = new BehaviorSubject<string[]>([])

export const headerEmoji = (emoji: string): { icon: AnyVirtualDOM } => ({
    icon: {
        tag: 'div',
        innerText: emoji,
    },
})
