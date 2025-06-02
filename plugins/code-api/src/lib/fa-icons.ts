import { faIcon, FaIconOptions } from 'mkdocs-ts'
import { faCode } from '@fortawesome/free-solid-svg-icons/faCode'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight'
import { faExclamation } from '@fortawesome/free-solid-svg-icons/faExclamation'
import { faForward } from '@fortawesome/free-solid-svg-icons/faForward'
import { faInfo } from '@fortawesome/free-solid-svg-icons/faInfo'
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons/faExternalLinkAlt'
import { faFile } from '@fortawesome/free-solid-svg-icons/faFile'
import { faEye } from '@fortawesome/free-solid-svg-icons/faEye'
import { AnyVirtualDOM } from 'rx-vdom'

const icons = {
    'fa-code': faCode,
    'fa-chevron-down': faChevronDown,
    'fa-chevron-right': faChevronRight,
    'fa-exclamation': faExclamation,
    'fa-forward': faForward,
    'fa-info': faInfo,
    'fa-external-link-alt': faExternalLinkAlt,
    'fa-file': faFile,
    'fa-eye': faEye,
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
