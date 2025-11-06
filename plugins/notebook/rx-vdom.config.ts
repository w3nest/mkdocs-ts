type AllTags = keyof HTMLElementTagNameMap
export interface Configuration {
    TypeCheck: 'strict'
    SupportedHTMLTags: 'Dev' extends 'Prod' ? AllTags : DevTags
}

type DevTags =
    | 'div'
    | 'a'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'iframe'
    | 'i'
    | 'ul'
    | 'li'
    | 'span'
    | 'pre'
    | 'footer'
    | 'input'
    | 'button'
    | 'img'
    | 'code'
    | 'select'
    | 'option'
    | 'table'
    | 'thead'
    | 'tbody'
    | 'tr'
    | 'th'
    | 'td'
