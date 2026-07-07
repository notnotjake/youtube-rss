#!/usr/bin/env bun
/**
 * Copies the current Docker service connection URL to the macOS clipboard
 */

type Service = {
	containerNamePart: string
	containerPort: number
	label: string
	orbService: string
	orbUrl(host: string): string
	url(port: number): string
}

const projectName = process.env.RAILWAY_PROJECT_NAME || 'youtube-rss'
const serviceArg = process.argv[2]?.toLowerCase()

const services: Record<string, Service> = {
	db: {
		containerNamePart: '-db-',
		containerPort: 5432,
		label: 'Postgres',
		orbService: 'db',
		orbUrl: (host) => `postgres://root:password@${host}/local`,
		url: (port) => `postgres://root:password@localhost:${port}/local`
	},
	pg: {
		containerNamePart: '-db-',
		containerPort: 5432,
		label: 'Postgres',
		orbService: 'db',
		orbUrl: (host) => `postgres://root:password@${host}/local`,
		url: (port) => `postgres://root:password@localhost:${port}/local`
	},
	postgres: {
		containerNamePart: '-db-',
		containerPort: 5432,
		label: 'Postgres',
		orbService: 'db',
		orbUrl: (host) => `postgres://root:password@${host}/local`,
		url: (port) => `postgres://root:password@localhost:${port}/local`
	}
}

function printUsage() {
	console.error('\x1b[31m✗ Choose a service to copy\x1b[0m')
	console.error('\nUsage:')
	console.error('  bun run url:pg')
}

async function getRunningContainers() {
	const proc = Bun.spawn(['docker', 'ps', '--format', '{{.Names}}'])
	const text = await new Response(proc.stdout).text()
	const exitCode = await proc.exited
	if (exitCode !== 0) {
		console.error('\x1b[31m✗ Docker is not available (is it installed and running?)\x1b[0m')
		process.exit(1)
	}
	return text.trim().split('\n').filter(Boolean)
}

async function getContainerPort(containerName: string, containerPort: number) {
	const proc = Bun.spawn(['docker', 'port', containerName, containerPort.toString()])
	const text = await new Response(proc.stdout).text()
	const exitCode = await proc.exited
	if (exitCode !== 0) {
		throw new Error(`Failed to get port for ${containerName}:${containerPort}`)
	}
	// Output format: "0.0.0.0:12345" or "[::]:12345"
	const match = text.trim().match(/:(\d+)$/)
	if (!match) {
		throw new Error(`Could not parse port from: ${text}`)
	}
	return parseInt(match[1], 10)
}

async function copyToClipboard(value: string) {
	const proc = Bun.spawn(['pbcopy'], {
		stdin: 'pipe'
	})
	proc.stdin.write(value)
	proc.stdin.end()

	const exitCode = await proc.exited
	if (exitCode !== 0) {
		throw new Error('Failed to copy URL to clipboard with pbcopy')
	}
}

async function main() {
	const service = serviceArg ? services[serviceArg] : undefined
	if (!service) {
		printUsage()
		process.exit(1)
	}

	const running = await getRunningContainers()
	const projectContainers = running.filter((name) => name.startsWith(`${projectName}-`))

	if (projectContainers.length === 0) {
		console.error(`\x1b[31m✗ No Docker containers running for ${projectName}\x1b[0m`)
		console.error(`\nRun: \x1b[33mbun run docker:start\x1b[0m`)
		process.exit(1)
	}

	const container = projectContainers.find((name) => name.includes(service.containerNamePart))

	if (!container) {
		console.error(`\x1b[31m✗ Could not find ${service.label} container\x1b[0m`)
		console.error('Found containers:', projectContainers)
		process.exit(1)
	}

	const port = await getContainerPort(container, service.containerPort)
	const url = service.url(port)
	const orbHost = `${service.orbService}.${projectName}.orb.local`
	const orbUrl = service.orbUrl(orbHost)

	await copyToClipboard(orbUrl)

	console.log(`\x1b[32m✓ Copied ${service.label} proxy URL to clipboard\x1b[0m`)
	console.log(`  raw:   ${url}`)
	console.log(`  proxy: ${orbUrl}`)
}

main().catch((err) => {
	console.error('\x1b[31m✗ Unexpected error:\x1b[0m', err.message)
	process.exit(1)
})
