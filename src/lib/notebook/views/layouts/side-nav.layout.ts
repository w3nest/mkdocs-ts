import { AnyVirtualDOM, attr$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { BehaviorSubject } from 'rxjs'
import { layoutStyleBase } from './common'

/**
 * Type definition for an element in the side navigation.
 */
export interface SideNavElement {
    /**
     * Icon in the sidebar.
     */
    icon: string
    /**
     * Content when the sidebar is expanded.
     */
    content: AnyVirtualDOM
}

/**
 * Type definition for the arguments to create a {@link SideNavLayout}.
 */
export interface SideNavArguments {
    /**
     * An object mapping keys to side navigation elements.
     */
    sideNavElements: Record<string, SideNavElement>
    /**
     * The main content of the layout.
     */
    content: AnyVirtualDOM
}

/**
 * Function to create a {@link SideNavLayout}.
 *
 * @param params Arguments
 */
export function sideNav(params: SideNavArguments) {
    return new SideNavLayout(params)
}
/**
 * Class representing a side navigation layout.
 *
 * It features:
 * - A main content area.
 * - A side navigation bar on the right:
 *   - When collapsed, it includes the icons of the multiple elements declared in the sidebar in a vertical layout.
 *   - When an element is expanded, it displays the associated content.
 *
 * <js-cell>
 * const sideNavClass = 'h-100 bg-light p-2 px-5'
 * const sideNavHome = {
 *     icon: 'fas fa-home',
 *     content: { tag: 'div', innerText: 'Home', class: sideNavClass },
 * }
 * const sideNavAbout = {
 *     icon: 'fas fa-info',
 *     content: { tag: 'div', innerText: 'About', class: sideNavClass },
 * }
 * const sideNavContact = {
 *     icon: 'fas fa-envelope',
 *     content: { tag: 'div', innerText: 'Contact', class: sideNavClass },
 * }
 * const sideNav = {
 *     home: sideNavHome,
 *     about: sideNavAbout,
 *     contact: sideNavContact,
 * }
 * const sideNavLayout = Views.Layouts.sideNav({
 *     sideNavElements: sideNav,
 *     content: { tag: 'div', innerText: 'Main content', class:'p-2' },
 * })
 * display(sideNavLayout)
 * </js-cell>
 *
 */
export class SideNavLayout implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex'
    public readonly style = layoutStyleBase
    public readonly children: ChildrenLike

    public readonly sideNavElements: SideNavElement[]
    public readonly content: AnyVirtualDOM

    public readonly selected$ = new BehaviorSubject<string | undefined>(
        undefined,
    )

    /**
     * Creates an instance of SideNavLayout.
     *
     * @param params Arguments
     */
    constructor(params: SideNavArguments) {
        Object.assign(this, params)

        this.children = [
            this.menuBar(),
            {
                tag: 'div',
                class: 'h-100 flex-grow-1 d-flex',
                style: {
                    minWidth: '0px',
                    position: 'relative',
                },
                children: [
                    {
                        tag: 'div',
                        class: 'mkdocs-bg-0 h-100',
                        style: {
                            position: 'absolute',
                            top: '0px',
                            left: '0px',
                            zIndex: 1,
                            opacity: 0.9,
                        },
                        children: Object.entries(this.sideNavElements).map(
                            ([k, elem]) => {
                                return {
                                    tag: 'div',
                                    class: attr$({
                                        source$: this.selected$,
                                        vdomMap: (selected) =>
                                            selected === k
                                                ? 'd-block h-100 overflow-auto'
                                                : 'd-none',
                                    }),
                                    children: [elem.content],
                                }
                            },
                        ),
                    },
                    {
                        tag: 'div',
                        class: 'h-100 flex-grow-1',
                        style: {
                            minWidth: '0px',
                        },
                        children: [this.content],
                    },
                ],
            },
        ]
    }

    private menuBar(): VirtualDOM<'div'> {
        return {
            tag: 'div',
            class: 'h-100 overflow-y-auto px-1 border-right d-flex flex-column',
            children: Object.entries(this.sideNavElements).map(
                ([key, elem]) => {
                    return {
                        tag: 'button',
                        class: attr$({
                            source$: this.selected$,
                            vdomMap: (selected) =>
                                selected === key
                                    ? `btn btn-primary ${elem.icon} p-1 border rounded`
                                    : `btn btn-light ${elem.icon} p-1 border rounded`,
                        }),
                        onclick: () => {
                            if (this.selected$.value === key) {
                                this.selected$.next('')
                            } else {
                                this.selected$.next(key)
                            }
                        },
                    }
                },
            ),
        }
    }
}
