import { isResolvedTarget, pathIds, Router } from '../../lib'
import { firstValueFrom } from 'rxjs'

export const navigateAndAssert = async (
    router: Router,
    path: string,
    expectedName: string,
) => {
    await router.navigateTo({ path })
    expect(router.parseUrl().path).toBe(path)

    const target = await firstValueFrom(router.target$)
    if (!isResolvedTarget(target)) {
        throw new Error(`Expected target at path '${path}' to be resolved`)
    }

    expect(target.node.name).toBe(expectedName)
    expect(target.path).toBe(path)
    const selectedNode = await firstValueFrom(
        router.explorerState.selectedNode$,
    )
    expect(selectedNode.id).toBe(path)
    const expandedNodes = await firstValueFrom(
        router.explorerState.expandedNodes$,
    )
    const ids = pathIds(path)
    expect(
        ids.reduce((acc, e) => acc && expandedNodes.includes(e), true),
    ).toBeTruthy()
}

export function mockMissingUIComponents() {
    class ResizeObserver {
        constructor(cb: ResizeObserverCallback) {}
        disconnect() {}
        observe() {}
        unobserve() {}
    }
    window['ResizeObserver'] = ResizeObserver
    window.HTMLElement.prototype.scrollTo = jest.fn()
}
