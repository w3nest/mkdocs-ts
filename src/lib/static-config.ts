/**
 *  Represents **static** configuration fields that must be accessible **prior** to loading the library through
 *  `window.mkdocsConfig` (see {@link WindowWithStaticConfig}).
 */
export interface StaticConfig {
    /**
     * If `true`, enable {@link Contextual} decorator.
     */
    enableContextual: boolean
}

/**
 * The global `window` with optional {@link StaticConfig}.
 */
export type WindowWithStaticConfig = typeof window & {
    /**
     * Static configuration.
     */
    mkdocsConfig?: StaticConfig
}
