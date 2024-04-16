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
export * from './utils'

import { combineLatest, map, Observable } from 'rxjs'
import { ModuleView } from './module.view'
import { Navigation, Router, Views } from '../index'
import { AnyVirtualDOM } from '@youwol/rx-vdom'
import { Configuration } from './configurations'
import { request$, raiseHTTPErrors } from '@youwol/http-primitives'
import { Module, Project } from './models'
import { install } from '@youwol/webpm-client'

export const tocConvertor = (heading: HTMLHeadingElement): AnyVirtualDOM => {
    const classes = heading.firstChild
        ? (heading.firstChild as HTMLElement).classList?.value
        : ''

    return {
        tag: 'div' as const,
        innerText: heading.firstChild['innerText'],
        class: `${classes} fv-hover-text-focus`,
    }
}

export function fetchModuleDoc({
    modulePath,
    basePath,
    configuration,
    project,
}: {
    modulePath: string
    basePath: string
    configuration: Configuration
    project: Project
}): Observable<Module> {
    const assetPath = `${basePath}/${modulePath}.json`
    return combineLatest([
        request$<Module>(new Request(assetPath)).pipe(raiseHTTPErrors()),
        install({
            css: [configuration.css(project)],
        }),
    ]).pipe(map(([mdle]) => mdle))
}

export const docNode: ({
    project,
    configuration,
}: {
    project: Project
    configuration: Configuration
}) => Navigation = ({ project, configuration }) => ({
    name: 'API',
    tableOfContent: (d: { html: HTMLElement; router: Router }) =>
        Views.tocView({ ...d, domConvertor: tocConvertor }),
    html: () => ({
        tag: 'div',
        innerText: 'The modules of the project',
    }),
    '/api': {
        name: project.name,
        tableOfContent: (d: { html: HTMLElement; router: Router }) =>
            Views.tocView({ ...d, domConvertor: tocConvertor }),
        html: ({ router }) =>
            fetchModuleDoc({
                modulePath: project.name,
                basePath: project.docBasePath,
                configuration,
                project,
            }).pipe(
                map((module: Module) => {
                    return new ModuleView({
                        module,
                        router,
                        configuration,
                        project,
                    })
                }),
            ),
        '...': ({ path, router }: { path: string; router: Router }) =>
            docNavigation({
                modulePath: path,
                router,
                project,
                configuration,
            }),
    },
})
export const docNavigation = ({
    modulePath,
    router,
    project,
    configuration,
}: {
    modulePath: string
    router: Router
    project: Project
    configuration: Configuration
}) => {
    if (modulePath === '') {
        modulePath = project.name
    }
    if (!modulePath.startsWith(project.name)) {
        modulePath = `${project.name}/${modulePath}`
    }
    return fetchModuleDoc({
        modulePath,
        basePath: project.docBasePath,
        configuration,
        project,
    }).pipe(
        map((module) => {
            return {
                children:
                    module.children?.length > 0
                        ? module.children.map((m) => ({
                              name: m.name,
                              leaf: m.isLeaf,
                              id: m.name,
                          }))
                        : [],
                html: () =>
                    new ModuleView({ module, router, configuration, project }),
                tableOfContent: (d: { html: HTMLElement; router: Router }) =>
                    Views.tocView({ ...d, domConvertor: tocConvertor }),
            }
        }),
    )
}
