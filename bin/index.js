#!/usr/bin/env node
require('ts-node/register')
const commander = require('commander')
const { generateApiFiles } = require('../src/backends/ts-typedoc')

// Initialize commander
commander
    .option('--project <path>', 'Set the project path')
    .option('--nav <path>', 'Set the navigation path')
    .option('--out <path>', 'Set the output path')
    .parse(process.argv)

// Retrieve options
const { project, nav, out } = commander.opts()

// Ensure required options are provided
if (!project || !nav || !out) {
    console.error('Error: Required options not provided')
    commander.help() // Show help message
    process.exit(1) // Exit with failure
}
const folderPath = process.cwd()
console.log('process.cwd', folderPath)
// Log options and launch module
console.log('Options:', { project, nav, out })

generateApiFiles({
    projectFolder: project,
    outputFolder: out,
    baseNav: nav,
})
