import { ExecCellError, Output, Scope } from './state'
import { Observable, Subject } from 'rxjs'
import { DisplayFactory } from './display-utils'

/**
 * Represents the inputs when executing a JavaScript snippet.
 */
export interface ExecInput {
    /**
     * Cell ID.
     */
    cellId: string
    /**
     * Source code to execute.
     */
    src: string
    /**
     * Entering scope.
     */
    scope: Scope
    /**
     * Subject in which output views are sent (when using `display` function).
     */
    output$: Subject<Output>
    /**
     * Subject in which errors are sent.
     */
    error$: Subject<ExecCellError | undefined>
    /**
     * Factory to display HTML elements when `display` is called.
     */
    displayFactory: DisplayFactory
    /**
     * Observable that emits when the associated cell is invalidated.
     */
    invalidated$: Observable<unknown>
}

export function indent(src: string, prefix: string) {
    return src
        .split('\n')
        .map((d, i) => (i === 0 ? d : `${prefix}${d}`))
        .join('\n')
}
