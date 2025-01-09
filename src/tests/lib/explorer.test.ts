import { DefaultLayout, isResolvedTarget, Navigation, Router } from '../../lib'

import { mockMissingUIComponents, navigateAndAssert } from './utils'
import { filter, firstValueFrom, from } from 'rxjs'
import { AnyVirtualDOM, child$, render } from 'rx-vdom'

function fileId(p: string) {
    return window.btoa(p)
}
const folders = [
    '/home',
    '/home/documents',
    '/home/projects',
    '/home/projects/mkdocs-ts',
    '/system',
    '/system/libs',
]
const files = [
    `/home/documents/${fileId('resume.pdf')}`,
    `/home/documents/${fileId('presentation.pptx')}`,
    `/home/projects/${fileId('readme.md')}`,
    `/home/projects/mkdocs-ts/${fileId('readme.md')}`,
    `/home/system/libs/${fileId('c++.md')}`,
    `/home/system/libs/${fileId('typescript.md')}`,
]

function fileView(file: string): AnyVirtualDOM {
    const client = new MockClient()
    return {
        tag: 'div',
        children: [
            {
                tag: 'h1',
                innerText: `File: ${file}`,
            },
            child$({
                source$: from(client.getFileContent(file)),
                vdomMap: (content) => {
                    return {
                        tag: 'div',
                        innerText: content,
                    }
                },
            }),
        ],
    }
}

async function folderView(
    folder: string,
    router: Router,
): Promise<AnyVirtualDOM> {
    const client = new MockClient()
    const data = await client.getFolderContent(folder)
    return {
        tag: 'div',
        children: [
            {
                tag: 'h1',
                innerText: `Folder: ${folder}`,
            },
            ...data.files.map((file) => {
                const name = window.atob(file.split('/').slice(-1)[0])
                return {
                    // a tag 'a' would be more appropriate, but it leads to warning in jest
                    tag: 'div' as const,
                    class: 'FileItem',
                    innerText: name,
                    onclick: (ev: MouseEvent) => {
                        ev.preventDefault()
                        router.navigateTo({ path: file })
                    },
                }
            }),
        ],
    }
}
class MockClient {
    async getFolderContent(
        id: string,
    ): Promise<{ folders: string[]; files: string[] }> {
        const filter = (f: string) =>
            f
                .replace(id, '')
                .split('/')
                .filter((c) => c !== '').length === 1

        const childFolders = folders.filter((f) => f.startsWith(id))
        const childFiles = files.filter((f) => f.startsWith(id))
        return {
            folders: childFolders.filter(filter),
            files: childFiles.filter(filter),
        }
    }

    async getFileContent(file: string): Promise<string> {
        return `Content of ${file}: Lorem Ipsum...`
    }
}

type TLayout = DefaultLayout.NavLayout
type THeader = DefaultLayout.NavHeader

const HomeTitle = 'Example of file explorer'
const navigation: Navigation<TLayout, THeader> = {
    name: 'Explorer',
    layout: {
        content: () => ({
            tag: 'h1',
            innerText: HomeTitle,
        }),
    },
    routes: async ({ path, router }: { path: string; router: Router }) => {
        const client = new MockClient()
        const data = await client.getFolderContent(path)

        const files = data.files.reduce((acc, f) => {
            const segment = f.split('/').slice(-1)[0]
            const name = window.atob(segment)
            const child = {
                name,
                header: { icon: { tag: 'i', class: 'fas fa-file' } },
                layout: {
                    content: () => fileView(f),
                },
                leaf: true,
            }
            return { ...acc, [`/${segment}`]: child }
        }, {})

        const folders = data.folders.reduce((acc, f) => {
            const segment = f.split('/').slice(-1)[0]
            const child = {
                name: segment,
                header: { icon: { tag: 'i', class: 'fas fa-folder' } },
                layout: {
                    content: () => folderView(f, router),
                },
            }
            return { ...acc, [`/${segment}`]: child }
        }, {})

        return {
            ...folders,
            ...files,
        }
    },
}

describe('Navigates with router', () => {
    let router: Router
    beforeAll(() => {
        router = new Router({ navigation })
    })

    it("Should load on '/'", async () => {
        const node = await firstValueFrom(router.explorerState.selectedNode$)
        expect(node.id).toBe('/')
    })
    it.each([
        ['/', 'Explorer'],
        ['/home', 'home'],
        ['/home/documents', 'documents'],
        [`/home/documents/${fileId('resume.pdf')}`, 'resume.pdf'],
    ])("Navigates to '%i'", async (path, name) => {
        await navigateAndAssert(router, path, name)
    })
})

describe('Display views', () => {
    let router: Router<TLayout, THeader>
    beforeAll(() => {
        mockMissingUIComponents()
        router = new Router({ navigation })
        const view = new DefaultLayout.Layout({
            router,
        })
        document.body.append(render(view))
    })

    it(`Should display home page with title '${HomeTitle}'`, async () => {
        await router.navigateTo({ path: '/' })
        const title = document.querySelector('h1')
        expect(title?.innerText).toBe(HomeTitle)
    })
    it("Should display folder content on '/home/documents' with working file links", async () => {
        await router.navigateTo({ path: '/home/documents' })
        const title = document.querySelector('h1')
        expect(title?.innerText).toBe('Folder: /home/documents')
        const files = [
            ...document.querySelectorAll('.FileItem'),
        ] as unknown as HTMLElement[]
        expect(files).toHaveLength(2)
        expect(files[0].innerText).toBe('resume.pdf')
        files[0].dispatchEvent(new MouseEvent('click'))
        const target = await firstValueFrom(
            router.target$.pipe(
                filter((p) => isResolvedTarget(p)),
                filter((p) => p.node.name === 'resume.pdf'),
            ),
        )
        expect(target.path).toBe(`/home/documents/${fileId('resume.pdf')}`)
    })
    it(`Should display file content on '/home/documents/${fileId('resume.pdf')}'`, async () => {
        await router.navigateTo({
            path: `/home/documents/${fileId('resume.pdf')}`,
        })
        const title = document.querySelector('h1')
        expect(title?.innerText).toBe(
            `File: /home/documents/${fileId('resume.pdf')}`,
        )
    })
})
