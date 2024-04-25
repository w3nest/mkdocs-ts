import {
    existsSync,
    lstatSync,
    readdirSync,
    rmdirSync,
    unlinkSync,
} from 'node:fs'
import path, { join } from 'node:path'
import * as fs from 'fs'

export function deleteDirectoryIfExists(directoryPath: string): void {
    if (existsSync(directoryPath)) {
        const files = readdirSync(directoryPath)
        for (const file of files) {
            const filePath = join(directoryPath, file)
            const stats = lstatSync(filePath)
            if (stats.isDirectory()) {
                deleteDirectoryIfExists(filePath)
            } else {
                unlinkSync(filePath)
            }
        }
        rmdirSync(directoryPath)
    }
}

export function findProjectRoot(directory: string): string | null {
    // Check if package.json exists in the current directory
    const packageJsonPath = path.resolve(directory, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
        // Return the directory if package.json is found
        return directory
    }

    // Get the parent directory
    const parentDirectory = path.dirname(directory)

    // If we've reached the root directory and haven't found package.json, return null
    if (parentDirectory === directory) {
        return null
    }

    // Recursively search in the parent directory
    return findProjectRoot(parentDirectory)
}
