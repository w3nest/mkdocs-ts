import {
    AnyVirtualDOM,
    ChildrenLike,
    render,
    VirtualDOM,
    RxHTMLElement,
} from '@youwol/rx-vdom'
import { BehaviorSubject, Subject } from 'rxjs'
import { layoutStyleBase } from './common'

/**
 * Type definition for the arguments to create a {@link ViewPortOnlyLayout}.
 */
export type ViewPortOnlyArguments = {
    /**
     * Content of the layout.
     */
    content: AnyVirtualDOM
}

/**
 * Function to create a {@link ViewPortOnlyLayout}.
 *
 * @param params Arguments
 */
export function viewPortOnly(params: ViewPortOnlyArguments) {
    return new ViewPortOnlyLayout(params)
}

function isElementInViewport(element: HTMLElement, s$: Subject<boolean>) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                s$.next(true)
            } else {
                s$.next(false)
            }
        })
    })
    observer.observe(element)
}

/**
 * A layout that displays its content only when it is in the viewport.
 *
 * <js-cell>
 * const content = {
 *     tag:'div',
 *     class: 'p-2 w-100 h-100 bg-light border rounded',
 *     innerText: 'Main Content',
 *     connectedCallback: () => alert("viewPortOnly layout added"),
 *     disconnectedCallback: () => alert("viewPortOnly layout removed"),
 * }
 * display(Views.Layouts.viewPortOnly({content}))
 * </js-cell>
 */
export class ViewPortOnlyLayout implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly style = layoutStyleBase
    public readonly children: ChildrenLike = []
    public readonly content: AnyVirtualDOM
    public readonly connectedCallback: (element: HTMLElement) => void

    /**
     * Creates an instance of ViewPortOnlyLayout.
     *
     * @param params Arguments
     */
    constructor(params: ViewPortOnlyArguments) {
        Object.assign(this, params)

        this.connectedCallback = (element: RxHTMLElement<'div'>) => {
            const isInViewPort$ = new BehaviorSubject(false)
            isElementInViewport(element, isInViewPort$)
            element.ownSubscriptions(
                isInViewPort$.subscribe((inVP) => {
                    if (!inVP) {
                        element.innerHTML = ''
                        return
                    }
                    element.appendChild(render(this.content))
                }),
            )
        }
    }
}
