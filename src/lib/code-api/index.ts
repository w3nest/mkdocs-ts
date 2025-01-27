/**
 * Auxiliary module to provide code api documentation.
 *
 *
 * Once 'backend' data has been generated, customization of the output is using a layer running in the
 * browser. For now, the customization is essentially defined using css through the {@link Configuration.css} attribute.
 * Its purpose is to link {@link Semantic.role} attribute to display options.
 *
 * For instance,
 * <a target='_blank'
 * href="/api/assets-gateway/cdn-backend/resources/QHlvdXdvbC9ta2RvY3MtdHM=/latest/assets/ts-typedoc.css">this</a>
 *  is the default css file of the {@link configurationTsTypedoc}.
 *
 * @module CodeApi
 */

export * from './attribute.view'
export * from './type.view'
export * from './code.view'
export * from './configurations'
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

export interface HttpClientTrait {
    fetchModule(modulePath: string): Observable<Module>
    installCss(): Promise<unknown>
}

export class HttpClient implements HttpClientTrait {
    public readonly cache: Record<string, Module> = {}
    public readonly configuration: Configuration<unknown, unknown>
    public readonly project: Project
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
    const href = path.replace(/\./g, '/')
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
