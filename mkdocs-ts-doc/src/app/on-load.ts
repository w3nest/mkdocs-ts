import { render } from '@youwol/rx-vdom'
import { navigation } from './navigation'
import { Router, Views } from '@youwol/mkdocs-ts'

export const router = new Router({
    navigation,
})

document.getElementById('content').appendChild(
    render(
        new Views.DefaultLayoutView({
            router,
            name: 'mkdocs-ts',
        }),
    ),
)
