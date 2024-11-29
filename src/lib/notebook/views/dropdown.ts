import { VirtualDOM, AnyVirtualDOM, RxChildren, replace$, attr$ } from 'rx-vdom'
import { BehaviorSubject, from } from 'rxjs'
import { install } from '@w3nest/webpm-client'

/**
 * Represents a drop-down view.
 *
 * <js-cell>
 * let dropdown = new Views.DropDown({
 *     items: {foo:42, bar:84},
 *     selected: 'foo',
 *     displayedNames: { 'foo': 'Foo', 'bar': 'Bar'}
 * })
 * display(dropdown)
 * display(dropdown.value$)
 * </js-cell>
 *
 */
export class DropDown implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-DropDown dropdown'
    public readonly children: RxChildren<'replace'>
    /**
     * Observable on the current value.
     */
    public readonly value$: BehaviorSubject<unknown>
    /**
     * Observable on the current item's ID.
     */
    public readonly itemId$: BehaviorSubject<string>
    /**
     * Default value.
     */
    public readonly value: unknown

    /**
     * Style attributes.
     */
    public readonly style = {
        fontSize: 'small',
    }

    /**
     *
     * @param params
     * @param params.items Dictionary itemId -> values.
     * @param params.selected Initial item ID selected.
     * @param params.displayedNames Dictionary itemId -> displayed names.
     */
    constructor(params: {
        items: { [k: string]: unknown }
        selected: string
        displayedNames?: { [k: string]: unknown }
    }) {
        Object.assign(this, params)
        this.value$ = new BehaviorSubject(params.items[params.selected])
        this.itemId$ = new BehaviorSubject(params.selected)
        const displayedNames: Record<string, string> =
            params.displayedNames ||
            Object.keys(params.items).reduce(
                (acc, e) => ({ ...acc, [e]: e }),
                {},
            )
        this.children = replace$({
            policy: 'replace',
            source$: from(install({ esm: ['bootstrap#^5.3.0'] })),
            vdomMap: (): AnyVirtualDOM[] => {
                return [
                    {
                        tag: 'button',
                        type: 'button',
                        class: 'btn btn-sm dropdown-toggle btn-secondary',
                        innerText: attr$({
                            source$: this.itemId$,
                            vdomMap: (id) => displayedNames[id],
                        }),
                        customAttributes: {
                            dataBsToggle: 'dropdown',
                            ariaExpanded: 'true',
                        },
                    },
                    {
                        tag: 'ul',
                        class: 'dropdown-menu',
                        children: Object.entries(params.items).map(
                            ([key, val]) => {
                                return {
                                    tag: 'li',
                                    children: [
                                        {
                                            tag: 'button',
                                            class: 'dropdown-item',
                                            innerText: key,
                                            onclick: () => {
                                                this.value$.next(val)
                                                this.itemId$.next(key)
                                            },
                                        },
                                    ],
                                }
                            },
                        ),
                    },
                ]
            },
        })
    }
}
