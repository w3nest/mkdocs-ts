import { Router, UrlTarget } from './router'
import { sanitizeNavPath } from './navigation.node'

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
    pushState(data: { target: UrlTarget }, url: string): void
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
    constructor({ router }: { router: Router }) {
        window.onpopstate = (event: PopStateEvent) => {
            const state = event.state as unknown as { path: string } | undefined
            if (state) {
                router.fireNavigateTo(state)
            } else {
                router.fireNavigateTo({ path: '/' })
            }
        }
    }
    pushState(data: { target: UrlTarget }, url: string): void {
        history.pushState(data, '', url)
    }
    parseUrl(): UrlTarget {
        return parseUrl(window.location.search)
    }
}

export function parseUrl(url: string) {
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
