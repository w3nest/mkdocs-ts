import { Router } from './router'

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
    pushState(data: { path: string }, url: string): void
    /**
     * Retrieves the current navigation path.
     *
     * @returns The current navigation path as a string.
     */
    getPath(): string
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
    pushState(data: { path: string }, url: string): void {
        history.pushState({ path: data.path }, '', url)
    }

    getPath(): string {
        const urlParams = new URLSearchParams(window.location.search)
        return urlParams.get('nav') ?? '/'
    }
}
