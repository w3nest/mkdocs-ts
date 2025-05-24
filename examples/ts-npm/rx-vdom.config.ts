type AllTags = keyof HTMLElementTagNameMap

// You can provide `Prod` instead, longer compilation time, but all HTML tags will be supported.
type Mode = 'Dev'

export interface Configuration {
    TypeCheck: 'strict'
    SupportedHTMLTags: Mode extends 'Prod' ? AllTags : DevTags
}

// This list is a bit cumbersome to define: it should includes all the tags used both by the project and its
// dependencies. But error messages are usually quite explicit, e.g., if 'img' is removed:
//     ...
//     Type '"img"' is not assignable to type '"input"'.
type DevTags =
    | 'div'
    | 'a'
    | 'button'
    | 'pre'
    | 'img'
    | 'code'
    | 'select'
    | 'option'
    | 'span'
    | 'header'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'input'
    | 'i'
    | 'p'
