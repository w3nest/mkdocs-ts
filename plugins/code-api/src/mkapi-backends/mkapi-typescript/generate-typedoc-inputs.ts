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
    const result = spawnSync(
        typedoc,
        ['--json', output, '--basePath', projectFolder],
        { cwd: folder },
    )

    console.log(`stdout: ${result.stdout.toString()}`)

    // Log process exit code
    if (result.status !== null) {
        console.log(`typedoc process exited with code ${String(result.status)}`)
        if (result.status > 0) {
            console.error(
                `Error executing typedoc: ${String(result.error)} ${result.stderr.toString()}`,
            )
            throw Error(
                `Typedoc exited with non zero status code (${String(result.status)})`,
            )
        }
    }
    const fileContent = fs.readFileSync(output, 'utf8')
    fs.unlinkSync(output)
    return JSON.parse(fileContent) as TypedocNode & ProjectTrait
}
