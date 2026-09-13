import { createServer } from 'node:net'
import { download } from './download'
import { launch } from './launch'
import { VERSION_3_5_0_MIN, VersionArgs } from './version'

export type RealOpenSearchServerOptions = {
	host?: string
	port?: number
	version?: VersionArgs
	debug?: boolean
	onExit?: (code: number | null, signal: string | null) => void
	onOutput?: (line: string) => void
}

// The real binary can't pick its own port, so a free one is claimed up
// front the way the cli does.
const findFreePort = () =>
	new Promise<number>((resolve, reject) => {
		const server = createServer()
		server.once('error', reject)
		server.listen(0, '127.0.0.1', () => {
			const port = (server.address() as { port: number }).port
			server.close(() => resolve(port))
		})
	})

// The real OpenSearch min distribution, downloaded on first use. Needs
// network access, and a local JDK 21+ on macOS.
export class RealOpenSearchServer {
	readonly host: string

	private readonly options: RealOpenSearchServerOptions
	private kill: (() => Promise<void>) | undefined
	private boundPort = 0

	constructor(options: RealOpenSearchServerOptions = {}) {
		this.host = options.host ?? 'localhost'
		this.options = options
	}

	get port() {
		return this.boundPort
	}

	get endpoint() {
		return `http://${this.host}:${this.boundPort}`
	}

	async listen(port = this.options.port ?? 0) {
		if (this.kill) {
			throw new Error('The OpenSearch server is already listening')
		}

		const version = this.options.version ?? VERSION_3_5_0_MIN
		const path = await download(version)
		const boundPort = port || (await findFreePort())

		this.kill = await launch({
			path,
			port: boundPort,
			host: this.host,
			version,
			debug: this.options.debug,
			onExit: this.options.onExit,
			onOutput: this.options.onOutput,
		})

		this.boundPort = boundPort
		await this.waitForReady(60_000)
	}

	async close() {
		const kill = this.kill

		if (!kill) {
			return
		}

		this.kill = undefined
		this.boundPort = 0
		await kill()
	}

	// Drops every index, the reset the in-memory engine does in-process.
	async reset() {
		if (!this.kill) {
			return
		}

		const result = await fetch(`${this.endpoint}/_all`, { method: 'DELETE' })

		if (!result.ok) {
			throw new Error(`Resetting the OpenSearch server failed: ${await result.text()}`)
		}
	}

	private async waitForReady(timeoutMs: number) {
		const deadline = Date.now() + timeoutMs

		while (Date.now() < deadline) {
			try {
				const res = await fetch(this.endpoint)

				if (res.ok) {
					return
				}
			} catch {}

			await new Promise(resolve => setTimeout(resolve, 500))
		}

		throw new Error('The local OpenSearch server never became ready.')
	}
}
