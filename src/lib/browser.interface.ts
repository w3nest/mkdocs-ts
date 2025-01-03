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
     * Retrieves the current navigation path.
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
        const urlParams = new URLSearchParams(window.location.search)
        const nav = urlParams.get('nav') ?? '/'
        const sectionId = nav.split('.').slice(1).join('.')
        const parameters = Object.fromEntries(urlParams.entries())
        delete parameters.nav
        return {
            path: sanitizeNavPath(nav),
            parameters,
            sectionId: sectionId,
        }
    }
}
