#!/usr/bin/env bun
/**
 * Copies the current Docker service connection URL to the macOS clipboard
 */

import { getServicePort } from './compose'

type Service = {
	composeService: string
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
		composeService: 'db',
		containerPort: 5432,
		label: 'Postgres',
		orbService: 'db',
		orbUrl: (host) => `postgres://root:password@${host}/local`,
		url: (port) => `postgres://root:password@localhost:${port}/local`
	},
	pg: {
		composeService: 'db',
		containerPort: 5432,
		label: 'Postgres',
		orbService: 'db',
		orbUrl: (host) => `postgres://root:password@${host}/local`,
		url: (port) => `postgres://root:password@localhost:${port}/local`
	},
	postgres: {
		composeService: 'db',
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

	const port = await getServicePort(service.composeService, service.containerPort)
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
