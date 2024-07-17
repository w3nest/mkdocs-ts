import {
    AnyVirtualDOM,
    AttributeLike,
    ChildLike,
    ChildrenLike,
    CSSAttribute,
    VirtualDOM,
} from '@youwol/rx-vdom'
import { BehaviorSubject, combineLatest, Observable } from 'rxjs'
import { Output } from './state'
import { parseStyle } from './display-utils'
import { parseMd } from '../markdown'
import { OutputMode } from './cell-views'

/**
 * Represents deported outputs view.
 *
 * They are typically included from a DOM definition with tag name `cell-output` in MarkDown content,
 * see {@link DeportedOutputsView.FromDom}.
 */
export class DeportedOutputsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    /**
     * Classes associated to the view.
     */
    public readonly class: string = 'mknb-DeportedOutputsView'
    public readonly children: ChildrenLike

    /**
     * The channel in which views are emitted when running the associated cell.
     */
    public readonly output$: Observable<Output>

    public readonly style: CSSAttribute

    /**
     * The current display mode.
     */
    public readonly mode$ = new BehaviorSubject<OutputMode>('normal')

    /**
     * Defines the methods to retrieve constructor's arguments from the DOM element `cell-output` within
     * MarkDown content.
     *
     * <note level='warning'>
     * Be mindful of the conversion from `camelCase` to `kebab-case`.
     * </note>
     */
    static readonly FromDomAttributes = {
        cellId: (e: HTMLElement) => e.getAttribute('cell-id'),
        defaultContent: (e: HTMLElement) => e.textContent,
        fullScreen: (e: HTMLElement) =>
            e.getAttribute('full-screen') === 'true',
        style: (e: HTMLElement) => parseStyle(e.getAttribute('style')),
        class: (e: HTMLElement) => e.getAttribute('class') || '',
        inlined: (e: HTMLElement) => e.getAttribute('inlined') === 'true',
    }

    /**
     * Initialize an instance of {@link DeportedOutputsView} from a DOM element `cell-output` in MarkDown content
     * (the parameter `output$` is automatically provided).
     *
     * <note level="hint" label="Constructor's attributes mapping">
     *  The static property {@link DeportedOutputsView.FromDomAttributes | FromDomAttributes}
     *  defines the mapping between the DOM element and the constructor's attributes.
     * </note>
     *
     * @param _p
     * @param _p.elem The DOM element.
     * @param _p.output$ The output views channel, automatically provided.
     */
    static FromDom({
        elem,
        output$,
    }: {
        elem: HTMLElement
        output$: Observable<Output>
    }) {
        const params = {
            cellId: DeportedOutputsView.FromDomAttributes.cellId(elem),
            defaultContent:
                DeportedOutputsView.FromDomAttributes.defaultContent(elem),
            style: DeportedOutputsView.FromDomAttributes.style(elem),
            class: DeportedOutputsView.FromDomAttributes.class(elem),
            inlined: DeportedOutputsView.FromDomAttributes.inlined(elem),
            fullScreen: DeportedOutputsView.FromDomAttributes.fullScreen(elem),
        }
        return new DeportedOutputsView({ ...params, output$ })
    }
    /**
     * Initialize a new instance.
     *
     * @param params
     * @param params.defaultContent The default content (as Markdown) displayed before an output is emitted from
     * `output$`.
     * @param params.output$ Observable over the outputs to display.
     * @param params.fullScreen Whether to add a menu to allow expanding the output.
     * @param params.style Style to apply to this element. It does not apply to the `defaultContent` view.
     * @param params.classList Classes added to this element. It does not apply to the `defaultContent` view.
     * @param params.inlined If `true`, adjust the display mode to fit as an inlined element within a text.
     * When inlined, the option `fullScreen` is not enabled.
     */
    constructor(params: {
        defaultContent: string
        output$: Observable<Output>
        fullScreen?: boolean
        style?: CSSAttribute
        class?: string
        inlined?: boolean
    }) {
        this.output$ = params.output$
        if (params.inlined) {
            this.style = { display: 'inline-block' }
        }
        const outputs$ = new BehaviorSubject<Output[]>([])
        this.output$.subscribe((out: Output) => {
            if (out === undefined) {
                outputs$.next([])
                return
            }
            outputs$.next([...outputs$.value, out])
        })
        const style$: AttributeLike<CSSAttribute> = {
            source$: outputs$,
            vdomMap: (outputs: Output[]): CSSAttribute => ({
                backgroundColor: 'rgb(255,255,255)',
                ...(outputs.length === 0 ? {} : params.style),
            }),
        }
        const class$: AttributeLike<string> = {
            source$: combineLatest([this.mode$, outputs$]),
            vdomMap: ([mode, outputs]: [OutputMode, Output[]]) => {
                if (outputs.length === 0) {
                    return ''
                }
                return mode === 'normal'
                    ? params.class
                    : `p-2 border rounded h-75 w-75 mx-auto ${params.class} overflow-auto`
            },
        }
        const contentView: VirtualDOM<'div'> = {
            tag: 'div' as const,
            style: style$,
            class: class$,
            children: {
                source$: outputs$,
                policy: 'sync',
                vdomMap: (output: AnyVirtualDOM) => output,
            },
            onclick: (ev) => ev.stopPropagation(),
        }
        if (params.inlined) {
            this.children = [contentView]
            return
        }

        const headerView: ChildLike = {
            source$: outputs$,
            vdomMap: (outputs: AnyVirtualDOM[]) => {
                if (!params.fullScreen || outputs.length === 0) {
                    return { tag: 'div' }
                }
                return {
                    tag: 'div',
                    class: 'w-100 d-flex pb-1',
                    children: [
                        { tag: 'div', class: 'flex-grow-1' },
                        {
                            tag: 'div',
                            class: 'fas fa-expand fv-pointer',
                            onclick: () => this.mode$.next('fullscreen'),
                        },
                    ],
                }
            },
        }
        const defaultView: ChildLike = {
            source$: outputs$,
            vdomMap: (outputs: Array<unknown>) =>
                outputs.length === 0
                    ? parseMd({ src: params.defaultContent })
                    : { tag: 'div' },
        }

        const displayModeStyle$: AttributeLike<CSSAttribute> = {
            source$: this.mode$,
            vdomMap: (mode: OutputMode) => {
                return mode === 'normal'
                    ? {
                          position: 'initial',
                          width: '100%',
                          height: 'auto',
                          backdropFilter: 'none',
                      }
                    : {
                          position: 'absolute',
                          top: '0vh',
                          left: '0vw',
                          width: '100vw',
                          height: '100vh',
                          zIndex: 10,
                          backdropFilter: 'blur(2px)',
                      }
            },
        }
        this.children = [
            headerView,
            {
                tag: 'div',
                class: 'd-flex flex-column justify-content-center mkdocs-bg-info',
                style: displayModeStyle$,
                children: [defaultView, contentView],
                onclick: () => this.mode$.next('normal'),
            },
        ]
    }
}
