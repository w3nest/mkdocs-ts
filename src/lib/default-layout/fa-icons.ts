import { faColumns } from '@fortawesome/free-solid-svg-icons/faColumns'
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown'
import { faBookmark } from '@fortawesome/free-solid-svg-icons/faBookmark'
import { faBookmark as farBookmark } from '@fortawesome/free-regular-svg-icons/faBookmark'
import { faCodeBranch } from '@fortawesome/free-solid-svg-icons/faCodeBranch'
import { faListUl } from '@fortawesome/free-solid-svg-icons/faListUl'
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode'
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons/faExternalLinkAlt'
import { faBookOpen } from '@fortawesome/free-solid-svg-icons/faBookOpen'
import { faGithub as fabGithub } from '@fortawesome/free-brands-svg-icons/faGithub'
import { faPenFancy } from '@fortawesome/free-solid-svg-icons/faPenFancy'
import { faFileAlt } from '@fortawesome/free-solid-svg-icons/faFileAlt'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons/faInfoCircle'
import { faFire } from '@fortawesome/free-solid-svg-icons/faFire'
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons/faQuestionCircle'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle'
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons/faTimesCircle'
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt'
import { faBug } from '@fortawesome/free-solid-svg-icons/faBug'
import { faFlask } from '@fortawesome/free-solid-svg-icons/faFlask'
import { faQuoteRight } from '@fortawesome/free-solid-svg-icons/faQuoteRight'
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner'
import { AnyVirtualDOM, AttributeLike, CSSAttribute } from 'rx-vdom'
import { faIcon } from '../markdown'
/**
 * Specification of bundled font-awesome icons.
 */
export const bundledFaIcons = {
    'fa-columns': faColumns,
    'fa-times': faTimes,
    'fa-chevron-right': faChevronRight,
    'fa-chevron-left': faChevronLeft,
    'fa-chevron-down': faChevronDown,
    'fa-bookmark': faBookmark,
    'far-bookmark': farBookmark,
    'fa-code-branch': faCodeBranch,
    'fa-list-ul': faListUl,
    'fa-code': faCode,
    'fa-external-link-alt': faExternalLinkAlt,
    'fa-book-open': faBookOpen,
    'fab-github': fabGithub,
    'fa-pen-fancy': faPenFancy,
    'fa-file-alt': faFileAlt,
    'fa-info-circle': faInfoCircle,
    'fa-fire': faFire,
    'fa-check': faCheck,
    'fa-question-circle': faQuestionCircle,
    'fa-exclamation-triangle': faExclamationTriangle,
    'fa-times-circle': faTimesCircle,
    'fa-bolt': faBolt,
    'fa-bug': faBug,
    'fa-flask': faFlask,
    'fa-quote-right': faQuoteRight,
    'fa-spinner': faSpinner,
}
/**
 * List of supported font-awesome icons.
 */
export type FaIconsList = keyof typeof bundledFaIcons

export function faIconTyped(
    id: FaIconsList,
    options?: {
        spin?: boolean
        withClass?: AttributeLike<string>
        withStyle?: AttributeLike<CSSAttribute>
    },
): AnyVirtualDOM {
    if (!(id in bundledFaIcons)) {
        console.warn(`faIcon not found '${id}'`)
    }
    return faIcon(bundledFaIcons[id], options)
}
