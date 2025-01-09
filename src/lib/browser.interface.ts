import { headingPrefixId, Router, UrlTarget } from './router'
import { sanitizeNavPath } from './navigation.node'
import { BehaviorSubject } from 'rxjs'

/**
 * Defines the interface for interacting with the browser's navigation system.
 */
export interface BrowserInterface {
    /**
     * Pushes a new state to the browser's history stack.
     *
     * @param data - The state data to associate with the history entry, including the navigation path.
     * @param url - The associated URL.
     */
    pushState(data: { target: UrlTarget }): void
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
    public readonly ignoredPaths$: BehaviorSubject<string[]> =
        new BehaviorSubject<string[]>([])

    constructor(params: {
        router: Router
        basePath: string
        ignoredPaths$?: BehaviorSubject<string[]>
    }) {
        Object.assign(this, params)
        window.onpopstate = (event: PopStateEvent) => {
            const state = event.state as unknown as
                | { target: UrlTarget }
                | undefined
            if (state) {
                this.router.fireNavigateTo(state.target)
            } else {
                this.router.fireNavigateTo({
                    path: '/',
                })
            }
        }
    }
    pushState(data: { target: UrlTarget }): void {
        const isIgnored = this.ignoredPaths$.value.find((ignored) =>
            data.target.path.startsWith(ignored),
        )
        if (isIgnored) {
            return
        }
        console.log('Push State', data)
        history.pushState(
            {
                target: {
                    path: data.target.path,
                    sectionId: data.target.sectionId,
                    parameters: data.target.parameters,
                },
            },
            '',
            `${this.basePath}?${formatUrl(data.target)}`,
        )
    }

    parseUrl(): UrlTarget {
        return parseUrl(window.location.search)
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
 * Implements the {@link BrowserInterface} for managing browser navigation.
 * Integrates with the browser's history API and synchronizes with a {@link Router}.
 */
export class MockBrowser implements BrowserInterface {
    public readonly router: Router
    public readonly basePath: string
    public readonly history: UrlTarget[] = []
    constructor(params: { router: Router; basePath: string }) {
        Object.assign(this, params)
    }
    pushState(data: { target: UrlTarget }): void {
        this.history.push(data.target)
    }

    parseUrl(): UrlTarget {
        return this.history.length > 0
            ? this.history.slice(-1)[0]
            : parseUrl('/')
    }
}
