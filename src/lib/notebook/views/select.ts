import { VirtualDOM, attr$, ChildrenLike } from 'rx-vdom'
import { BehaviorSubject } from 'rxjs'

/**
 * Represents a selectable view.
 *
 * <js-cell>
 * let select = new Views.Select({
 *     items: {foo:42, bar:84},
 *     selected: 'foo',
 *     displayedNames: { 'foo': 'Foo', 'bar': 'Bar'}
 * })
 * display(select)
 * display(select.value$)
 * </js-cell>
 *
 */
export class Select implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-DropDown dropdown'
    public readonly children: ChildrenLike
    /**
     * Observable on the current value.
     */
    public readonly value$: BehaviorSubject<unknown>
    /**
     * Observable on the current item's ID.
     */
    public readonly itemId$: BehaviorSubject<string>

    /**
     *
     * @param params
     * @param params.items Dictionary itemId -> values.
     * @param params.selected Initial item ID selected.
     * @param params.displayedNames Dictionary itemId -> displayed names.
     */
    constructor(params: {
        items: Record<string, unknown>
        selected: string
        displayedNames?: Record<string, unknown>
    }) {
        Object.assign(this, params)
        this.value$ = new BehaviorSubject(params.items[params.selected])
        this.itemId$ = new BehaviorSubject(params.selected)
        const displayedNames: Record<string, string> =
            params.displayedNames ??
            Object.keys(params.items).reduce(
                (acc, e) => ({ ...acc, [e]: e }),
                {},
            )
        this.children = [
            {
                tag: 'select',
                class: 'form-select',
                onchange: (ev: MouseEvent) => {
                    if (!ev.target || !('value' in ev.target)) {
                        return
                    }
                    const key = ev.target.value as string
                    this.value$.next(params.items[key])
                    this.itemId$.next(key)
                },
                children: Object.entries(params.items).map(([key, val]) => {
                    return {
                        tag: 'option',
                        innerText: displayedNames[key],
                        selected: attr$({
                            source$: this.itemId$,
                            vdomMap: (id) => {
                                return id === key
                            },
                        }),
                        value: key,
                        onclick: () => {
                            this.value$.next(val)
                            this.itemId$.next(key)
                        },
                    }
                }),
            },
        ]
    }
}
