import { fromMd } from '../config.markdown'
import { AppNav } from '../navigation'

export const navigation: AppNav = {
    name: 'Install',
    header: {
        icon: {
            tag: 'i',
            class: 'fas fa-rocket me-1',
        },
    },
    layout: {
        content: fromMd('install.md'),
    },
}
