import { TRexView } from './trex.view.js'

export function registerMdWidgets(MkDocs) {
    // This declares external links, they can be referenced in MD using e.g.
    // `<ext-link target="MdBuiltInViews">Foo</ext-link>`.
    MkDocs.MdWidgets.ExtLink.Mapper = (target, _elem) => {
        const dict = {
            MdBuiltInViews: {
                href: 'https://w3nest.org/apps/@mkdocs-ts/doc/latest?nav=/api/mkdocs-ts/MdWidgets',
            },
            NotebookDoc: {
                href: 'https://w3nest.org/apps/@mkdocs-ts/doc/latest?nav=/tutorials/notebook',
            },
        }
        return dict[target]
    }

    // This declares links to the API documentation, they can be referenced in MD using e.g.
    // `<api-link target="TRexView"></api-link>`.
    MkDocs.MdWidgets.ApiLink.Mapper = (target, _elem) => {
        const dict = {
            TRexView: {
                href: '@nav/api.TRexView',
                withClass: 'mkapi-role-class',
            },
        }
        return dict[target]
    }

    // This register a custom Markdown view, it can be referenced in MD using `<TRex></TRex>`
    MkDocs.GlobalMarkdownViews.factory = {
        ...MkDocs.GlobalMarkdownViews.factory,
        TRex: (elem) => {
            return new TRexView({
                name: elem.getAttribute('name'),
            })
        },
    }

    // Make the icon 'star' available, e.g. when parsing Markdown (`<icon target='star'></icon>`)
    // or when using note (`<note icon='star'></note>`).
    MkDocs.IconFactory.register({
        star: { tag: 'div', innerText: '⭐' },
    })
}
