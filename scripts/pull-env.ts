#!/usr/bin/env bun

/**
 * Pulls Railway environment variables into .env and regenerates
 * .env.example with dummy values for each key.
 */

import { writeFile } from 'node:fs/promises'

const TARGET_ENV = 'dev'
const TARGET_SERVICE = 'vars'

type RunResult = {
	success: boolean
	stdout: string
	stderr: string
}

function run(command: string[]): RunResult {
	const proc = Bun.spawnSync(command, {
		stdout: 'pipe',
		stderr: 'pipe'
	})

	return {
		success: proc.exitCode === 0,
		stdout: proc.stdout.toString(),
		stderr: proc.stderr.toString()
	}
}

function toExample(envContent: string): string {
	return envContent
		.split('\n')
		.flatMap((line) => {
			const trimmed = line.trim()
			if (!trimmed || trimmed.startsWith('#')) return [line]

			const eqIndex = line.indexOf('=')
			if (eqIndex === -1) return [line]

			const key = line.slice(0, eqIndex)
			if (key === 'NODE_ENV') return []

			return [`${key}=dummy`]
		})
		.join('\n')
}

function usage() {
	console.log('Usage: bun run update:env')
}

async function main() {
	if (process.argv.includes('--help') || process.argv.includes('-h')) {
		usage()
		process.exit(0)
	}

	const setEnv = run(['railway', 'environment', TARGET_ENV])
	if (!setEnv.success) {
		console.error(`Failed to select Railway environment "${TARGET_ENV}".`)
		if (setEnv.stderr) console.error(setEnv.stderr.trim())
		process.exit(1)
	}

	const pullVars = run(['railway', 'variables', '-e', TARGET_ENV, '-s', TARGET_SERVICE, '-k'])

	if (!pullVars.success) {
		console.error(
			`Failed to pull Railway variables for environment "${TARGET_ENV}" and service "${TARGET_SERVICE}".`
		)
		if (pullVars.stderr) console.error(pullVars.stderr.trim())
		process.exit(1)
	}

	const envContent = pullVars.stdout
	await writeFile('.env', envContent)
	await writeFile('.env.example', toExample(envContent))

	console.log('Updated .env and regenerated .env.example')
}

main().catch((err) => {
	console.error('Failed to pull and generate env files:', err)
	process.exit(1)
})
