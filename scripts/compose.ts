import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dir, '..')

/** Resolve a service's published port using the same project configuration as compose up. */
export async function getServicePort(service: string, privatePort: number): Promise<number> {
	const proc = Bun.spawn(['docker', 'compose', 'port', service, String(privatePort)], {
		cwd: projectRoot,
		stdout: 'pipe',
		stderr: 'pipe'
	})
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited
	])

	if (exitCode !== 0) {
		throw new Error(
			`Could not resolve the published port for Compose service "${service}". ${stderr.trim()}\nRun: bun run docker:start`
		)
	}

	// Bindings may include both IPv4 and IPv6 addresses for the same host port.
	const ports = stdout
		.trim()
		.split('\n')
		.map((binding) => {
			const match = binding.trim().match(/:(\d+)$/)
			const port = match ? Number(match[1]) : NaN
			if (!Number.isInteger(port) || port < 1 || port > 65535) {
				throw new Error(
					`Unexpected port binding for Compose service "${service}": ${stdout.trim()}`
				)
			}
			return port
		})
	if (new Set(ports).size !== 1) {
		throw new Error(`Multiple host ports found for Compose service "${service}": ${stdout.trim()}`)
	}
	return ports[0]
}
