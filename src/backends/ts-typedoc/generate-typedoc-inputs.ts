import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import * as fs from 'fs'
import { ProjectTrait, TypedocNode } from './typedoc-models'
/**
 * Extract typedoc required inputs by running it from the given folder.
 *
 * @param projectFolder The folder in which `typedoc` is run.
 * @returns The `typedoc` node datastructure representing the project.
 */
export function generateTypedocInputs(
    projectFolder: string,
): TypedocNode & ProjectTrait {
    const uid = randomUUID()
    const folder = path.resolve(projectFolder)
    console.log('Run typedoc from folder', folder)
    const output = path.resolve(folder, `typedoc-out-${uid}.json`)
    const typedoc = path.resolve(
        folder,
        'node_modules',
        'typedoc',
        'bin',
        'typedoc',
    )
    const result = spawnSync(typedoc, ['--json', output], { cwd: folder })

    if (result.stdout) {
        console.log(`stdout: ${result.stdout}`)
    }

    // Log process exit code
    console.log(`typedoc process exited with code ${result.status}`)
    if (result.status > 0) {
        console.error(
            `Error executing typedoc: ${result.error} ${result.stderr}`,
        )
        throw Error(
            `Typedoc exited with non zero status code (${result.status})`,
        )
    }
    const fileContent = fs.readFileSync(output, 'utf8')
    fs.unlinkSync(output)
    return JSON.parse(fileContent)
}
