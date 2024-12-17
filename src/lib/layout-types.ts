import { LayoutOptionsMap } from '@mkdocsTsConfig'

export type LayoutMap = {
    [Property in keyof LayoutOptionsMap]: LayoutOptionsMap[Property] & {
        kind: Property
    }
}

export type LayoutUnion = LayoutMap[keyof LayoutMap]
export type LayoutKindUnion = LayoutMap[keyof LayoutMap]['kind']
