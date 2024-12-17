#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const JSON5 = require('json5')

// Define the default configuration
const defaultConfig = `
import { DefaultLayout } from 'mkdocs-ts'

export type LayoutOptionsMap = {
    default: DefaultLayout.NavNodeOptions
}

export type NavMetadata = {}

export type NavDecoration = DefaultLayout.NodeDecoration

`

const configFilePath = path.join(process.cwd(), 'mkdocs-ts.config.ts')

if (fs.existsSync(configFilePath)) {
    console.log(`Configuration file already exists at ${configFilePath}`)
} else {
    fs.writeFileSync(configFilePath, defaultConfig, 'utf8')
    console.log(`Configuration file created at ${configFilePath}`)
}

const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')

console.log(`Adjust tsconfig.json at ${tsconfigPath}.`)

if (!fs.existsSync(tsconfigPath)) {
    console.error(`tsconfig.json not found at ${tsconfigPath}`)
    process.exit(1)
}

// Read and parse tsconfig.json
const tsconfig = JSON5.parse(fs.readFileSync(tsconfigPath, 'utf8'))

// Ensure compilerOptions and paths exist
if (!tsconfig.compilerOptions) {
    tsconfig.compilerOptions = {}
}
if (!tsconfig.compilerOptions.paths) {
    tsconfig.compilerOptions.paths = {}
}

// Define the path alias and its target
const alias = '@mkdocsTsConfig'
const targetPath = ['./mkdocs-ts.config']

// Add the path mapping if it doesn't exist
if (tsconfig.compilerOptions.paths[alias]) {
    console.log(`Path mapping "${alias}" already exists.`)
    process.exit(0)
} else {
    tsconfig.compilerOptions.paths[alias] = targetPath
    console.log(`Added path mapping: "${alias}": ${JSON.stringify(targetPath)}`)
}

// Write the updated tsconfig.json back to disk
const updatedTsconfig = JSON.stringify(tsconfig, null, 2)
fs.writeFileSync(tsconfigPath, updatedTsconfig, 'utf8')
console.log(`Updated tsconfig.json at ${tsconfigPath}`)
