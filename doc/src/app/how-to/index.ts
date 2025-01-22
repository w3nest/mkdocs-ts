import { fromMd } from '../config.markdown'
import { AppNav } from '../navigation'

export const navigation: AppNav = {
    name: 'How to',
    header: {
        icon: {
            tag: 'i',
            class: 'fas fa-question-circle me-1',
        },
    },
    layout: {
        content: fromMd('how-to.md'),
    },
    routes: {
        '/install': {
            name: 'Install',
            layout: {
                content: fromMd('how-to.install.md'),
            },
        },
        '/api-backend': {
            name: 'API Documentation',
            layout: {
                content: fromMd('how-to.api-backend.md'),
            },
            routes: {
                '/typescript': {
                    name: 'Typescript',
                    layout: {
                        content: fromMd('how-to.api-backend.typescript.md'),
                    },
                },
                '/python': {
                    name: 'Python',
                    layout: {
                        content: fromMd('how-to.api-backend.python.md'),
                    },
                },
            },
        },
    },
}
