type Mode = 'Prod'
type AllTags = keyof HTMLElementTagNameMap
export type Configuration = {
    TypeCheck: 'strict'
    SupportedHTMLTags: Mode extends 'Prod' ? AllTags : DevTags
}

type DevTags = 'div'
