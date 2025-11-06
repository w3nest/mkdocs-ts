import { BackendClient } from '@w3nest/webpm-client'
import { AnyVirtualDOM } from 'rx-vdom'

import { MdWidgets, parseMd } from 'mkdocs-ts'

function isBackendClient(obj: unknown): obj is BackendClient {
    if (typeof obj !== 'object' || obj === null) {
        return false
    }
    const o = obj as Record<string, unknown>
    return (
        o.partitionId !== undefined &&
        o.name !== undefined &&
        o.version !== undefined &&
        o.urlBase !== undefined &&
        o.config !== undefined &&
        o.urlW3Lab !== undefined
    )
}

const dockerfile = (backend: BackendClient): AnyVirtualDOM => {
    const src = backend.config.dockerfile
        ? `
<note level="info" expandable="true" title="Custom Dockerfile">
<code-snippet language="dockerfile">
${backend.config.dockerfile}
</code-snippet>
</note>`
        : `Default \`Dockerfile\` used.`
    return parseMd({ src })
}

const configuration = (backend: BackendClient): AnyVirtualDOM => {
    const entries = Object.entries(backend.config.build)
    if (entries.length === 0) {
        return parseMd({
            src: `No build parameters provided.`,
        })
    }
    const rows = entries.map(([k, v]) => {
        return {
            tag: 'tr' as const,
            children: [
                {
                    tag: 'td' as const,
                    class: 'border px-2 py-1 align-top font-monospace',
                    innerText: k,
                },
                {
                    tag: 'td' as const,
                    class: 'border px-2 py-1 font-monospace',
                    innerText: v,
                },
            ],
        }
    })
    return {
        tag: 'table',
        class: 'table-auto border-collapse border',
        children: [
            {
                tag: 'thead',
                children: [
                    {
                        tag: 'tr',
                        children: [
                            {
                                tag: 'th',
                                class: 'border px-2 py-1',
                                innerText: 'Parameter',
                            },
                            {
                                tag: 'th',
                                class: 'border px-2 py-1',
                                innerText: 'Value',
                            },
                        ],
                    },
                ],
            },
            {
                tag: 'tbody',
                children: rows,
            },
        ],
    }
}

export const displayW3BackendClient = {
    name: 'W3BackendClient',
    isCompatible: (elem: unknown) => {
        return isBackendClient(elem)
    },
    view: (backend: BackendClient) => {
        const content = parseMd({
            src: `
<a href="${backend.urlBase}/docs" target="_blank"><i class='fas fa-wifi'></i> REST API</a>
<i class="mx-2"></i>
<a href="${backend.urlW3Lab}" target="_blank"><i class='fas fa-newspaper'></i> Logs</a>

---

*  **Version** : \`${backend.version}\`
*  **Base URL** : \`${backend.urlBase}\`

---

**<i class='fas fa-cog'></i> Configuration**

<dockerfile>
</dockerfile>

<configuration>
</configuration>
`,
            views: {
                dockerfile: () => dockerfile(backend),
                configuration: () => configuration(backend),
            },
        })
        return new MdWidgets.NoteView({
            level: 'info',
            label: `Backend: \`${backend.name.split('%p-')[0]}\``,
            icon: 'fas fa-network-wired',
            expandable: true,
            content: content,
        })
    },
}
