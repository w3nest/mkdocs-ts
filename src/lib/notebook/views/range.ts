import { attr$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { BehaviorSubject, Subject } from 'rxjs'

/**
 * Represents a range view.
 *
 * <js-cell>
 * let range = new Views.Range()
 * display(range)
 * display(range.value$)
 * </js-cell>
 *
 * To setup min, max and step:
 * <js-cell>
 * display(new Views.Range({min:0, max:100, step: 1}))
 * </js-cell>
 *
 * The range can optionally **not** emit while dragging:
 * <js-cell>
 * range = new Views.Range({emitDrag: false})
 * display(range)
 * </js-cell>
 *
 * <note level='info'>
 * When emitting on drag, it may be relevant to debounce the values, *e.g.*:
 *
 * `range.value$.pipe(rxjs.debounceTime(100))`.
 *
 * </note>
 */
export class Range implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    /**
     * Classes associated to the view.
     */
    public readonly class = 'mknb-Range'
    public readonly children: ChildrenLike
    public readonly value$: Subject<number>
    /**
     * Default value.
     */
    public readonly value: number = 0.5
    /**
     * Minimum value.
     */
    public readonly min: number = 0
    /**
     * Maximum value.
     */
    public readonly max: number = 1
    /**
     * Step.
     */
    public readonly step = 0.01
    /**
     * If `true`, data are emitted in `value$` while dragging the slider.
     */
    public readonly emitDrag: boolean = true

    /**
     * Style attributes.
     */
    public readonly style = {
        fontSize: 'small',
    }
    constructor(
        params: {
            min?: number
            max?: number
            step?: number
            value?: number
            value$?: Subject<number>
            emitDrag?: boolean
        } = {},
    ) {
        Object.assign(this, params)
        if (!params.value) {
            this.value = 0.5 * (this.max - this.min)
        }
        if (!this.value$) {
            this.value$ = new BehaviorSubject(this.value)
        }
        const getValue = (from: string) => {
            const v = parseFloat(from)
            if (v < this.min) {
                return this.min
            }
            if (v > this.max) {
                return this.max
            }
            return v
        }
        const options = {
            min: `${this.min}`,
            max: `${this.max}`,
            step: `${this.step}`,
        }
        this.children = [
            {
                tag: 'input',
                type: 'number',
                ...options,
                value: attr$({
                    source$: this.value$,
                    vdomMap: (v) => `${v}`,
                }),
                onchange: (ev: MouseEvent) => {
                    this.value$.next(getValue(ev.target['value']))
                },
            },
            { tag: 'i', class: 'mx-1' },
            {
                tag: 'input',
                type: 'range',
                ...options,
                value: attr$({
                    source$: this.value$,
                    vdomMap: (v) => `${v}`,
                }),
                onchange: (ev: MouseEvent) => {
                    this.value$.next(getValue(ev.target['value']))
                },
                oninput: (ev: MouseEvent) => {
                    if (this.emitDrag) {
                        this.value$.next(getValue(ev.target['value']))
                    }
                },
            },
        ]
    }
}
