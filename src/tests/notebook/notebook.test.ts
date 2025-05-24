import './prism-code-editor.mock'
import { ChildrenLike, render, VirtualDOM } from 'rx-vdom'
import { ContextTrait, MdWidgets, parseMd, Router } from '../../lib'
import {
    NotebookPage,
    Dependencies,
    CellTrait,
    State,
    ExecArgs,
    Scope,
    executeJs,
    getCellUid,
    executeJs$,
} from '../../lib/notebook'
import { BehaviorSubject, filter, firstValueFrom, Observable } from 'rxjs'
import * as rxjs from 'rxjs'

Dependencies.parseMd = parseMd
Dependencies.MdWidgets = MdWidgets

/**
 *
 * Represents the execution side of a Javascript cell within a {@link NotebookPage}.
 *
 * This implementation does not provide the views (editor, outputs), it is used as it is when loading separated notebook
 * pages to retrieve exported symbols.
 * However, this implementation is typically inherited from {@link JsCellView} to provide the regular views of
 * a javascript cell.
 */
export class JsCellTest implements CellTrait, VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike = []
    public readonly cellId: string
    public readonly content: string
    public readonly invalidated$: Observable<unknown>
    public readonly state: State
    public readonly reactive: boolean

    public readonly content$: BehaviorSubject<string>

    constructor(params: {
        cellId: string
        content$: BehaviorSubject<string>
        state: State
        reactive: boolean
    }) {
        Object.assign(this, params)
        this.invalidated$ = this.state.invalidated$.pipe(
            filter((cellId) => cellId === this.cellId),
        )
    }

    async execute(args: ExecArgs, ctx?: ContextTrait): Promise<Scope> {
        return this.reactive
            ? await executeJs$(
                  {
                      ...args,
                      invalidated$: this.invalidated$,
                  },
                  ctx,
              )
            : await executeJs(
                  {
                      ...args,
                      invalidated$: this.invalidated$,
                  },
                  ctx,
              )
    }
    static readonly FromDomAttributes = {
        cellId: (e: HTMLElement) =>
            e.getAttribute('cell-id') ?? e.getAttribute('id'),
        content: (e: HTMLElement) => e.textContent ?? '',
        reactive: (e: HTMLElement) => e.getAttribute('reactive') === 'true',
    }
    static FromDom({ elem, state }: { elem: HTMLElement; state: State }) {
        const params = {
            cellId: JsCellTest.FromDomAttributes.cellId(elem) ?? getCellUid(),
            content: JsCellTest.FromDomAttributes.content(elem),
            reactive: JsCellTest.FromDomAttributes.reactive(elem),
        }
        return new JsCellTest({
            ...params,
            state,
            content$: new BehaviorSubject(params.content),
        })
    }
}

State.CellsFactory = {
    'js-cell': JsCellTest.FromDom,
}
describe('Notebook with js-cell', () => {
    beforeAll(() => {})
    afterEach(() => (document.body.innerHTML = ''))
    it('Should run smoothly', async () => {
        let router = new Router({
            navigation: {
                name: 'root',
                layout: { tag: 'div' },
            },
        })
        const page = new NotebookPage({
            router,
            src: `
<js-cell cell-id="cell1">
const x = 42
let y = 42
</js-cell>


<js-cell cell-id="cell2">
y = y * 2 
</js-cell>


            `,
            options: { runAtStart: true },
        })

        document.body.append(render(page))
        let scope = await firstValueFrom(page.state.exitScopes$.cell1)
        expect(scope.const.x).toBe(42)
        expect(scope.let.y).toBe(42)

        scope = await firstValueFrom(page.state.exitScopes$.cell2)
        expect(scope.const.x).toBe(42)
        expect(scope.let.y).toBe(84)
    })

    it('Error re-assign const', async () => {
        let router = new Router({
            navigation: {
                name: 'root',
                layout: { tag: 'div' },
            },
        })
        const page = new NotebookPage({
            router,
            src: `
<js-cell cell-id="cell1">
const x = 42
</js-cell>


<js-cell cell-id="cell2">
x = x * 2
</js-cell>


            `,
            options: { runAtStart: true },
        })

        document.body.append(render(page))
        let error = await firstValueFrom(
            page.state.errors$.cell2.pipe(filter((e) => e !== undefined)),
        )
        expect(error.kind).toBe('Runtime')
        expect(error.message).toMatch(/Assignment to constant variable/)
    })

    it('Error re-assign const (2)', async () => {
        let router = new Router({
            navigation: {
                name: 'root',
                layout: { tag: 'div' },
            },
        })
        const page = new NotebookPage({
            router,
            src: `
<js-cell cell-id="cell1">
const x = 42
</js-cell>


<js-cell cell-id="cell2">
const x = 42
</js-cell>


            `,
            options: { runAtStart: true },
        })

        document.body.append(render(page))
        let error = await firstValueFrom(
            page.state.errors$.cell2.pipe(filter((e) => e !== undefined)),
        )
        expect(error.kind).toBe('AST')
        expect(error.message).toMatch(
            /Identifier 'x' has already been declared/,
        )
    })
})

describe('Notebook with reactive js-cell', () => {
    beforeAll(() => {})
    let picked$ = new rxjs.ReplaySubject<unknown>(1)

    afterEach(() => {
        document.body.innerHTML = ''
    })
    it('Should run smoothly', async () => {
        let router = new Router({
            navigation: {
                name: 'root',
                layout: { tag: 'div' },
            },
        })
        const page = new NotebookPage({
            router,
            src: `
<js-cell cell-id="cell1">
const x = rxjs.of(42)
let y = 42
</js-cell>


<js-cell cell-id="cell2" reactive="true">
const x2 = x * 2
let y = 84 // OK because only 'const' are injected in reactive cells
</js-cell>

<js-cell cell-id="cell3" reactive="true">
pick(x2)
</js-cell>
            `,
            options: { runAtStart: true },
            initialScope: {
                const: { rxjs, pick: (d: unknown) => picked$.next(d) },
            },
        })

        document.body.append(render(page))
        let scope = await firstValueFrom(page.state.exitScopes$.cell1)
        expect(scope.const.x).toBeInstanceOf(Observable)
        expect(scope.let.y).toBe(42)

        scope = await firstValueFrom(page.state.exitScopes$.cell2)
        expect(scope.const.x).toBeInstanceOf(Observable)
        expect(scope.let.y).toBe(42)

        scope = await firstValueFrom(page.state.exitScopes$.cell3)
        expect(scope.const.x).toBeInstanceOf(Observable)
        expect(scope.const.x2).toBeInstanceOf(Observable)
        expect(scope.let.y).toBe(42)

        const picked = await firstValueFrom(picked$)
        expect(picked).toBe(84)
    })
})
