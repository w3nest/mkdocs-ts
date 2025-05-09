import { VirtualDOM } from 'rx-vdom'
import { companionNodes$ } from './on-load'
import { MdWidgets} from 'mkdocs-ts'
import LinksDict from './links.json'

MdWidgets.ApiLink.Mapper = (target: string) => {
    return LinksDict.apiLinks[target]
}
MdWidgets.ExtLink.Mapper = (target: string) => {
    return { href:LinksDict.extLinks[target] }
}
MdWidgets.GitHubLink.Mapper = (target: string) => {
    return { href:LinksDict.githubLinks[target] }
}
MdWidgets.CrossLink.Mapper = (target: string) => {
    return { href:LinksDict.crossLinks[target] }
}


export class SplitApiButton implements VirtualDOM<'button'> {
    public readonly tag = 'button'
    public readonly class = 'btn btn-sm btn-light fas fa-columns'
    public readonly onclick = () => {
        const path = '/api'
        const selected = companionNodes$.value.find((prefix) => path === prefix)
        if (selected) {
            const newNodes = companionNodes$.value.filter(
                (prefix) => path !== prefix,
            )
            companionNodes$.next(newNodes)
            return
        }
        companionNodes$.next([...companionNodes$.value, path])
    }
}
