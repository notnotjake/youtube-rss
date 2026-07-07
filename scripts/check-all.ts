#!/usr/bin/env bun
/**
 * Runs all code quality checks and reports results
 */

type CheckResult = {
	name: string
	passed: boolean
	duration: number
}

async function runCheck(name: string, command: string[]): Promise<CheckResult> {
	const start = performance.now()
	process.stdout.write(`\x1b[90m○ ${name}...\x1b[0m`)

	const proc = Bun.spawn(command, {
		stdout: 'pipe',
		stderr: 'pipe'
	})

	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text()
	])
	const exitCode = await proc.exited
	const duration = performance.now() - start
	const passed = exitCode === 0

	// Clear the line and show result
	process.stdout.write(`\r\x1b[K`)
	if (passed) {
		console.log(`\x1b[32m✓ ${name}\x1b[90m (${formatDuration(duration)})\x1b[0m`)
	} else {
		console.log(`\x1b[31m✗ ${name}\x1b[90m (${formatDuration(duration)})\x1b[0m`)
		// Show output indented
		const output = (stdout + stderr).trim()
		if (output) {
			console.log(
				output
					.split('\n')
					.map((line) => `  ${line}`)
					.join('\n')
			)
		}
	}

	return { name, passed, duration }
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`
	return `${(ms / 1000).toFixed(1)}s`
}

async function main() {
	console.log('\x1b[1mRunning checks...\x1b[0m\n')

	const results: CheckResult[] = []

	// Run checks sequentially so output is clear
	results.push(await runCheck('Oxfmt', ['bunx', 'oxfmt', '--check', '.']))
	results.push(await runCheck('ESLint', ['bunx', 'eslint', '.', '--cache']))
	results.push(await runCheck('Svelte', ['bunx', 'svelte-kit', 'sync']))
	results.push(
		await runCheck('TypeScript', ['bunx', 'svelte-check', '--tsconfig', './tsconfig.json'])
	)
	results.push(await runCheck('Tests', ['bun', 'test']))
	results.push(await runCheck('Build', ['bunx', '--bun', 'vite', 'build']))

	// Summary
	const failed = results.filter((r) => !r.passed)
	const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

	console.log('')
	if (failed.length === 0) {
		console.log(
			`\x1b[32m\x1b[1m✓ All ${results.length} checks passed\x1b[0m\x1b[90m (${formatDuration(totalDuration)})\x1b[0m`
		)
	} else {
		console.log(
			`\x1b[31m\x1b[1m✗ ${failed.length}/${results.length} checks failed:\x1b[0m ${failed.map((r) => r.name).join(', ')}`
		)
		process.exit(1)
	}
}

main().catch((err) => {
	console.error('\x1b[31m✗ Unexpected error:\x1b[0m', err.message)
	process.exit(1)
})
