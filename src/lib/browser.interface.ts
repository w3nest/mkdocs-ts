import { headingPrefixId, Router, UrlTarget } from './router'
import { sanitizeNavPath } from './navigation.node'
import { BehaviorSubject } from 'rxjs'
import { Contextual, ContextTrait, NoContext } from './context'

/**
 * Defines the interface for interacting with the browser's navigation system.
 */
export interface BrowserInterface {
    /**
     * Pushes a new state to the browser's history stack.
     *
     * @param data - The state data to associate with the history entry, including the navigation path.
     * @param ctx Execution context used for logging and tracing.
     */
    pushState(data: { target: UrlTarget }, ctx?: ContextTrait): void
    /**
     * Retrieves the target from the current URL.
     *
     * @returns The current navigation path as a string.
     */
    parseUrl(): UrlTarget
}

/**
 * Implements the {@link BrowserInterface} for managing browser navigation.
 * Integrates with the browser's history API and synchronizes with a {@link Router}.
 */
export class WebBrowser implements BrowserInterface {
    public readonly router: Router
    public readonly basePath: string
    public readonly context: ContextTrait

    private lastState?: UrlTarget

    constructor(
        params: { router: Router; basePath: string },
        ctx?: ContextTrait,
    ) {
        this.context = ctx ?? new NoContext()
        const context = this.ctx().start('new WebBrowser', ['Browser'])
        Object.assign(this, params)
        window.onpopstate = (event: PopStateEvent) => {
            const state = event.state as unknown as
                | { target: UrlTarget }
                | undefined
            if (state) {
                context.info(`Pop state`, state.target)
                this.lastState = state.target
                this.router.fireNavigateTo({
                    ...state.target,
                    issuer: 'browser',
                })
            } else {
                this.router.fireNavigateTo({
                    path: '/',
                })
            }
        }
        context.exit()
    }

    ctx(ctx?: ContextTrait) {
        return ctx ?? this.context
    }

    @Contextual({
        key: ({ target }: { target: UrlTarget }) =>
            `${String(target.issuer)} : ${target.path}.${target.sectionId ?? ''}`,
        labels: ['Browser'],
    })
    pushState(data: { target: UrlTarget }, ctx?: ContextTrait): void {
        ctx = this.ctx(ctx)
        if (['browser'].includes(data.target.issuer ?? '')) {
            ctx.info('Push state disabled: browser', {
                target: data.target,
            })
            return
        }
        const newState = {
            path: data.target.path,
            sectionId: data.target.sectionId,
            parameters: data.target.parameters,
        }
        if (JSON.stringify(this.lastState) === JSON.stringify(newState)) {
            ctx.info('Push state disabled: no state change', {
                target: data.target,
            })
            return
        }
        const url = `${this.basePath}?${formatUrl(data.target)}`
        ctx.info('Push state', { target: newState, url })
        this.lastState = newState
        history.pushState(
            {
                target: this.lastState,
            },
            '',
            url,
        )
    }

    parseUrl(): UrlTarget {
        return { ...parseUrl(window.location.search), issuer: 'browser' }
    }
}

/**
 * Parse a URL as string into a {@link UrlTarget} - only query parameters are relevant.
 *
 * *  {@link UrlTarget.path} is extracted from the `nav` query parameter.
 * *  {@link UrlTarget.parameters} are other query parameters.
 * *  {@link UrlTarget.sectionId} is specified by the part after the first `.` in the `nav` query parameter.
 *
 * @param url String to parse.
 * @returns The target
 */
export function parseUrl(url: string): UrlTarget {
    const urlParams = new URLSearchParams(url)
    const nav = sanitizeNavPath(urlParams.get('nav') ?? '/')

    const parameters = Object.fromEntries(urlParams.entries())
    delete parameters.nav
    if (!nav.includes('.')) {
        return {
            path: nav,
            parameters,
        }
    }
    return {
        path: nav.split('.')[0],
        parameters,
        sectionId: nav.split('.').slice(1).join('.'),
    }
}

export function formatUrl(urlTarget: UrlTarget) {
    const params = { ...urlTarget.parameters }
    if ('nav' in params) {
        delete params.nav
    }
    const paramsStr =
        urlTarget.parameters && Object.keys(params).length > 0
            ? `&${new URLSearchParams(params)}`
            : ''
    const sectionId = urlTarget.sectionId
        ? `.${urlTarget.sectionId.replace(headingPrefixId, '')}`
        : ''
    return `nav=${urlTarget.path}${sectionId}${paramsStr}`
}

/**
 * Implements the {@link BrowserInterface} for managing browser navigation within a mocked browser.
 *
 * <note level="warning">
 * Navigation events triggered by a 'scroll' to section ID are not persisted in history: only change in navigation path
 * are.
 * </note>
 */
export class MockBrowser implements BrowserInterface {
    public readonly router: Router
    public readonly initialPath: string = '/'
    public history: UrlTarget[] = []
    public currentIndex = -1
    public readonly hasNext$ = new BehaviorSubject(false)
    public readonly hasPrev$ = new BehaviorSubject(false)
    constructor(params: { router: Router; initialPath?: string }) {
        Object.assign(this, params)
        this.history.push(this.parseUrl())
        this.currentIndex = 0
    }

    @Contextual({
        key: ({ target }: { target: UrlTarget }) =>
            `${target.path}.${target.sectionId ?? ''}`,
        labels: ['Browser'],
    })
    pushState(data: { target: UrlTarget }): void {
        if (['browser', 'scroll'].includes(data.target.issuer ?? '')) {
            this.updateState()
            return
        }
        if (
            JSON.stringify(this.history[this.currentIndex]) ===
            JSON.stringify(data.target)
        ) {
            this.updateState()
            return
        }
        if (this.currentIndex === this.history.length - 1) {
            this.history.push(data.target)
            this.currentIndex++
        } else {
            this.currentIndex++
            this.history[this.currentIndex] = data.target
            this.history = this.history.slice(0, this.currentIndex + 1)
        }
        this.updateState()
    }
    private updateState() {
        this.hasPrev$.next(this.currentIndex !== 0)
        this.hasNext$.next(this.currentIndex < this.history.length - 1)
    }

    /**
     * Navigate back in browser's history.
     */
    async prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--
            await this.router.navigateTo({
                ...this.history[this.currentIndex],
                issuer: 'browser',
            })
        }
    }
    /**
     * Navigate forth in browser's history.
     */
    async next() {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++
            await this.router.navigateTo({
                ...this.history[this.currentIndex],
                issuer: 'browser',
            })
        }
    }
    parseUrl(): UrlTarget {
        const target =
            this.history.length > 0
                ? this.history.slice(-1)[0]
                : parseUrl(this.initialPath)
        return {
            ...target,
            issuer: 'browser',
        }
    }
}
