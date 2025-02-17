/**
 * The Code API Plugin integrates API documentation into your application.
 *
 * API documentation is structured based on the module hierarchy, where each page corresponds to a specific module.
 *
 * The root node of the API documentation is generated using {@link CodeApi.codeApiEntryNode}.
 * By default, it utilizes a {@link CodeApi.HttpClient} to fetch module data from .json files,
 * with each file representing a {@link CodeApi.Module}. The module is then displayed on the page using
 * {@link CodeApi.ModuleView}.
 *
 * <note level="warning">
 * This module does **not** handle the generation of `.json` files. For details on generating these files,
 * refer to {@link MkApiBackends}.
 *</note>
 *
 * @module CodeApi
 */

export * from './attribute.view'
export * from './callable.view'
export * from './type.view'
export * from './code.view'
export * from './configurations'
export * from './declaration.view'
export * from './documentation.view'
export * from './models'
export * from './module.view'
export * from './summary.view'
export * from './utils'

import { combineLatest, map, Observable, of, tap } from 'rxjs'
import { ModuleView } from './module.view'
import { AnyVirtualDOM } from 'rx-vdom'
import { Configuration } from './configurations'
import { request$, raiseHTTPErrors } from '@w3nest/http-clients'
import { Module, Project } from './models'
import { install } from '@w3nest/webpm-client'
import {
    Navigation,
    Router,
    DefaultLayout,
    LazyRoutes,
    ContextTrait,
} from '../index'
import type { installNotebookModule } from '../plugins'
import type { parseMd } from '../markdown'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Dependencies {
    public static parseMd: typeof parseMd
    public static DefaultLayout: typeof DefaultLayout
    public static installNotebookModule: typeof installNotebookModule
    public static headingId: (id: string) => string
}

/**
 * Interface for the HTTP client fetching API data used in {@link codeApiEntryNode}.
 */
export interface HttpClientTrait {
    /**
     * Fetch {@link Module} data.
     *
     * @param modulePath path of the module relative to project's `docBasePath`.
     */
    fetchModule(modulePath: string): Observable<Module>

    /**
     * Install required style sheets.
     */
    installCss(): Promise<unknown>
}

/**
 * Default HTTP client used in {@link codeApiEntryNode}.
 */
export class HttpClient implements HttpClientTrait {
    public readonly cache: Record<string, Module> = {}
    /**
     * The configuration, usually forwarded from {@link codeApiEntryNode}.
     */
    public readonly configuration: Configuration<unknown, unknown>
    /**
     * The project, usually forwarded from {@link codeApiEntryNode}.
     */
    public readonly project: Project

    /**
     * Initialize a new instance.
     *
     * @param params
     * @param params.configuration See {@link HttpClient.configuration}.
     * @param params.project See {@link HttpClient.project}.
     */
    constructor(params: {
        configuration: Configuration<unknown, unknown>
        project: Project
    }) {
        Object.assign(this, params)
    }

    fetchModule(modulePath: string): Observable<Module> {
        const assetPath = `${this.project.docBasePath}/${modulePath}.json`
        if (assetPath in this.cache) {
            return of(this.cache[assetPath])
        }
        return request$<Module>(new Request(assetPath)).pipe(
            raiseHTTPErrors(),
            tap((m) => (this.cache[assetPath] = m)),
        )
    }

    installCss(): Promise<unknown> {
        return install({
            css: [this.configuration.css(this.project)],
        })
    }
}

const moduleView = <TLayout, THeader>(
    {
        httpClient,
        path,
        router,
        project,
        configuration,
    }: {
        httpClient: HttpClientTrait
        path: string
        router: Router
        project: Project
        configuration: Configuration<TLayout, THeader>
    },
    ctx?: ContextTrait,
) => {
    return combineLatest([
        httpClient.fetchModule(path.replace(/\./g, '/')),
        httpClient.installCss(),
    ]).pipe(
        map(([m]) => {
            return new ModuleView(
                {
                    module: m,
                    router,
                    configuration,
                    project,
                },
                ctx,
            )
        }),
    )
}
const toc = (d: { html: HTMLElement; router: Router }) => {
    return Dependencies.DefaultLayout.tocView({
        ...d,
        domConvertor: (heading: HTMLHeadingElement): AnyVirtualDOM => {
            const firstHTMLElement = [...heading.children].find(
                (c) => c instanceof HTMLElement,
            )
            const classes = firstHTMLElement
                ? firstHTMLElement.classList.value
                : ''

            return {
                tag: 'div' as const,
                innerText: firstHTMLElement?.innerText ?? heading.innerText,
                class: `${classes} fv-hover-text-focus`,
            }
        },
    })
}

const decoration = {
    icon: {
        tag: 'i' as const,
        class: 'mkapi-semantic-flag mkapi-role-module',
    },
}

export const docNavigation = <TLayout, THeader>(
    {
        modulePath,
        router,
        project,
        configuration,
        httpClient,
    }: {
        modulePath: string
        router: Router
        project: Project
        configuration: Configuration<TLayout, THeader>
        httpClient: HttpClientTrait
    },
    ctx?: ContextTrait,
): Observable<LazyRoutes<TLayout, THeader>> => {
    if (modulePath === '/') {
        modulePath = project.name
    } else if (!modulePath.startsWith(project.name)) {
        modulePath = `/${project.name}${modulePath}`
    }
    return httpClient.fetchModule(modulePath).pipe(
        map((module) => {
            if (module.children.length === 0) {
                return {}
            }
            const children = module.children.map((m) => ({
                leaf: m.isLeaf,
                id: m.name,
                ...configuration.navNode({
                    name: m.name,
                    header: decoration,
                    layout: {
                        toc,
                        content: () =>
                            moduleView(
                                {
                                    httpClient,
                                    router,
                                    configuration,
                                    project,
                                    path: m.path,
                                },
                                ctx,
                            ),
                    },
                }),
            }))
            return children.reduce(
                (acc, m) => ({
                    ...acc,
                    [`/${m.id}`]: m,
                }),
                {},
            )
        }),
    )
}

/**
 *  Generates the root node for a project's API documentation, to be integrated within the {@link Navigation}.
 *
 * @param params Configuration options for the API documentation root node.
 * @param params.name The name of the project (displayed in the navigation).
 * @param params.header The navigation header associated with the root node.
 * @param params.docBasePath The base URL or root directory containing the API data models (`.json` files).
 *   These models are generated using the {@link MkApiBackends}.
 * @param params.entryModule The root module from which the documentation hierarchy starts. Its associated `json` data
 * should be located at `${docBasePath}/${docBasePath}.json`.
 * @param params.configuration Configuration settings for the navigation and layout.
 * @param params.httpClient A custom HTTP client for retrieving API documentation resources.
 *   If not provided, a default {@link HttpClient} instance is used.
 * @param ctx Execution context used for logging and tracing.
 *
 * @returns A navigation node representing the entry point for the API documentation.
 *
 * @typeParam TLayout The type defining the navigation layout (*e.g.*, {@link DefaultLayout.NavLayout}).
 * @typeParam THeader The type defining the navigation header (*e.g.*, {@link DefaultLayout.NavHeader}).
 **/
export function codeApiEntryNode<TLayout, THeader>(
    params: {
        name: string
        header: DefaultLayout.NavHeader
        docBasePath: string
        entryModule: string
        configuration: Configuration<TLayout, THeader>
        httpClient?: ({
            project,
            configuration,
        }: {
            project: Project
            configuration: Configuration<TLayout, THeader>
        }) => HttpClientTrait
    },
    ctx?: ContextTrait,
): Navigation<TLayout, THeader> {
    const project = {
        name: params.entryModule,
        docBasePath: params.docBasePath,
    }
    const configuration = params.configuration
    const httpClient =
        params.httpClient?.({ configuration, project }) ??
        new HttpClient({
            project,
            configuration,
        })
    return {
        ...configuration.navNode({
            name: params.name,
            header: params.header,
            layout: {
                toc,
                content: ({ router }: { router: Router }) => {
                    return moduleView(
                        {
                            path: project.name,
                            router,
                            configuration,
                            project,
                            httpClient,
                        },
                        ctx,
                    )
                },
            },
        }),
        routes: ({ router, path }: { router: Router; path: string }) =>
            docNavigation(
                {
                    modulePath: path,
                    router,
                    project,
                    configuration,
                    httpClient,
                },
                ctx,
            ),
    }
}
