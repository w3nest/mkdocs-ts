import { attr$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import {
    concat,
    map,
    Observable,
    repeat,
    startWith,
    takeWhile,
    timer,
} from 'rxjs'

/**
 * State regarding TRex animation (see {@link TRexView}).
 */
export class TRexState {
    public readonly label$: Observable<{ side: string; index: number }>

    constructor() {
        const running$ = timer(0, 100).pipe(
            startWith(0),
            takeWhile((t) => t < 40),
            map((t) => {
                const range = Math.ceil((t + 1) / 10)
                const side = range % 2 === 0 ? 'l' : 'r'
                const runningLegState = t % 2 === 1 ? 3 : 4
                const index = t === 39 ? 1 : runningLegState
                return { side, index }
            }),
        )

        const blinkingEyes$ = timer(0, 500).pipe(
            startWith(0),
            takeWhile((t) => t < 5),
            map((t) => ({ side: 'l', index: t % 2 === 1 ? 1 : 2 })),
        )

        const resting$ = timer(1000).pipe(
            startWith(0),
            map(() => ({ side: 'l', index: 2 })),
        )
        this.label$ = concat(running$, blinkingEyes$, resting$).pipe(
            repeat(Infinity),
        )
    }
}

/**
 * TRex animation view.
 *
 */
export class TRexView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ name }: { name: string }) {
        const state = new TRexState()
        const styleBase = {
            width: '80px',
            height: '86px',
            background: 'url(../assets/trex.png)',
            backgroundPositionY: '-100px',
        }
        this.children = [
            {
                tag: 'div',
                class: 'p-1',
                innerText: ` 🦖 I'm ${name} 🦖`,
            },
            {
                tag: 'div',
                style: attr$({
                    source$: state.label$,
                    vdomMap: ({ side, index }) => ({
                        ...styleBase,
                        transform: side === 'l' ? `scaleX(-1)` : `scaleX(1)`,
                        backgroundPositionX: `-${String(index - 1)}00px`,
                    }),
                }),
            },
        ]
    }
}
