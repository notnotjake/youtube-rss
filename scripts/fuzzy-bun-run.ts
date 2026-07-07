#!/usr/bin/env bun

import { spawnSync } from 'node:child_process'

const rootDir = `${import.meta.dir}/..`
const packageJsonPath = `${rootDir}/package.json`
const packageJsonFile = Bun.file(packageJsonPath)

if (!(await packageJsonFile.exists())) {
	console.error(`Could not find package.json at ${packageJsonPath}`)
	process.exit(1)
}

if (!Bun.which('fzf')) {
	console.error('fzf is required but was not found in PATH')
	process.exit(1)
}

const packageJson = (await packageJsonFile.json()) as {
	scripts?: Record<string, string>
}
const selfScriptNames = new Set(['fuzzy', 'f'])
const selfScriptPaths = ['scripts/fuzzy-bun-run.ts', 'scripts/fzf-scripts.ts']
const scripts = Object.entries(packageJson.scripts ?? {}).filter(
	([name, command]) =>
		!selfScriptNames.has(name) && !selfScriptPaths.some((selfPath) => command.includes(selfPath))
)

if (scripts.length === 0) {
	console.error('No scripts found in package.json')
	process.exit(1)
}

const candidates = scripts.map(([name, command]) => `${name}\t${command}`).join('\n')
const selectionResult = spawnSync(
	'fzf',
	[
		'--delimiter=\t',
		'--with-nth=1',
		'--nth=1',
		'--prompt=script > ',
		'--height=50%',
		'--reverse',
		'--border',
		'--preview=echo {2}',
		'--preview-window=down,3,wrap'
	],
	{
		input: candidates,
		encoding: 'utf8',
		stdio: ['pipe', 'pipe', 'inherit']
	}
)

if (selectionResult.error) {
	console.error('Failed to start fzf:', selectionResult.error.message)
	process.exit(1)
}

if (selectionResult.status !== 0) {
	process.exit(0)
}

const selectedLine = selectionResult.stdout.trim()
const selectedScript = selectedLine.split('\t')[0]

if (!selectedScript) {
	process.exit(0)
}

const extraArgs = process.argv.slice(2)
const runArgs = ['run', selectedScript, ...extraArgs]
console.log(`\nRunning: bun ${runArgs.join(' ')}\n`)

const runResult = spawnSync('bun', runArgs, { stdio: 'inherit' })

if (runResult.error) {
	console.error('Failed to run selected script:', runResult.error.message)
	process.exit(1)
}

if (typeof runResult.status === 'number') {
	process.exit(runResult.status)
}

process.exit(1)
