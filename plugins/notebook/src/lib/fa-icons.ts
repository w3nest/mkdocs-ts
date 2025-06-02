import { faIcon, FaIconOptions } from 'mkdocs-ts'
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock'
import { faCog } from '@fortawesome/free-solid-svg-icons/faCog'
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock'
import { faPen } from '@fortawesome/free-solid-svg-icons/faPen'
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt'
import { faNetworkWired } from '@fortawesome/free-solid-svg-icons/faNetworkWired'
import { faExpand } from '@fortawesome/free-solid-svg-icons/faExpand'
import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown'
import { faDotCircle } from '@fortawesome/free-solid-svg-icons/faDotCircle'
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner'
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay'
import { faFastForward } from '@fortawesome/free-solid-svg-icons/faFastForward'
import { faSignInAlt } from '@fortawesome/free-solid-svg-icons/faSignInAlt'
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons/faSignOutAlt'
import { AnyVirtualDOM, AttributeLike, CSSAttribute } from 'rx-vdom'

const icons = {
    'fa-clock': faClock,
    'fa-cog': faCog,
    'fa-lock': faLock,
    'fa-pen': faPen,
    'fa-bolt': faBolt,
    'fa-network-wired': faNetworkWired,
    'fa-expand': faExpand,
    'fa-caret-down': faCaretDown,
    'fa-dot-circle': faDotCircle,
    'fa-spinner': faSpinner,
    'fa-play': faPlay,
    'fa-fast-forward': faFastForward,
    'fa-sign-in-alt': faSignInAlt,
    'fa-sign-out-alt': faSignOutAlt,
}

export function faIconTyped(
    id: keyof typeof icons,
    options?: FaIconOptions,
): AnyVirtualDOM {
    if (!(id in icons)) {
        console.warn(`faIcon not found '${id}'`)
    }
    return faIcon(icons[id], options)
}
