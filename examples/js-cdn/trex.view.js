const { rxjs } = await webpm.install({
    esm: ['rxjs#^7.8.2 as rxjs'],
})

/**
 * State regarding TRex animation (see {@link TRexView}).
 */
export class TRexState {
    constructor() {
        const running$ = rxjs.timer(0, 100).pipe(
            rxjs.startWith(0),
            rxjs.takeWhile((t) => t < 40),
            rxjs.map((t) => {
                const range = Math.ceil((t + 1) / 10)
                const side = range % 2 === 0 ? 'l' : 'r'
                const runningLegState = t % 2 === 1 ? 3 : 4
                const index = t === 39 ? 1 : runningLegState
                return { side, index }
            }),
        )

        const blinkingEyes$ = rxjs.timer(0, 500).pipe(
            rxjs.startWith(0),
            rxjs.takeWhile((t) => t < 5),
            rxjs.map((t) => ({ side: 'l', index: t % 2 === 1 ? 1 : 2 })),
        )

        const resting$ = rxjs.timer(1000).pipe(
            rxjs.startWith(0),
            rxjs.map(() => ({ side: 'l', index: 2 })),
        )
        this.label$ = rxjs
            .concat(running$, blinkingEyes$, resting$)
            .pipe(rxjs.repeat(Infinity))
    }
}

/**
 * TRex animation view.
 *
 */
export class TRexView {
    constructor({ name }) {
        this.tag = 'div'
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
                style: {
                    source$: state.label$,
                    vdomMap: ({ side, index }) => ({
                        ...styleBase,
                        transform: side === 'l' ? `scaleX(-1)` : `scaleX(1)`,
                        backgroundPositionX: `-${index - 1}00px`,
                    }),
                },
            },
        ]
    }
}
