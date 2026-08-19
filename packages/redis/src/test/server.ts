import { Cluster, Redis } from 'ioredis'
import { RedisMemoryServer } from 'redis-memory-server'

export class RedisServer {
	private client?: Redis | Cluster
	private process?: RedisMemoryServer
	private stopping = false

	async start(port?: number, version = '7.2.4', args: string[] = []) {
		if (this.process) {
			throw new Error(`Redis server is already listening on port: ${await this.process.getPort()}`)
		}

		if (port && (port < 0 || port >= 65536)) {
			throw new RangeError(`Port should be >= 0 and < 65536. Received ${port}.`)
		}

		this.stopping = false
		this.process = await RedisMemoryServer.create({
			instance: {
				port,
				args,
			},
			// The default "stable" resolves to redis 8, which bundles
			// native modules that fail to build on macos. Redis 7 builds
			// everywhere & matches the elasticache engine.
			binary: { version },
			// binary: { systemBinary: '/usr/local/bin/redis-server' },
		})
	}

	// Fires when the redis child dies without kill() asking for it -
	// the local dev environment surfaces it on the health strip.
	onExit(handler: (code: number | null, signal: string | null) => void) {
		const child = this.process?.instanceInfoSync?.childProcess

		child?.once('exit', (code, signal) => {
			if (!this.stopping) {
				handler(code, signal)
			}
		})
	}

	// Streams the redis output, for the local dev dashboard's log view.
	onOutput(handler: (line: string) => void) {
		const child = this.process?.instanceInfoSync?.childProcess

		const capture = (chunk: Buffer) => {
			for (const line of chunk.toString().split('\n')) {
				if (line.trim() !== '') {
					handler(line)
				}
			}
		}

		child?.stdout?.on('data', capture)
		child?.stderr?.on('data', capture)
	}

	async kill() {
		if (this.process) {
			this.stopping = true
			this.client?.disconnect()
			await this.process.stop()
			this.process = undefined
		}
	}

	async getPort() {
		const port = await this.process?.getPort()

		if (!port) {
			throw new Error('The redis server is not running.')
		}

		return port
	}

	async ping() {
		const client = await this.getClient()
		return (await client.ping()) === 'PONG'
	}

	async getClient() {
		if (!this.client) {
			this.client = new Redis({
				host: await this.process?.getHost(),
				port: await this.process?.getPort(),
				stringNumbers: true,
				keepAlive: 0,
				noDelay: true,
				enableReadyCheck: false,
				maxRetriesPerRequest: null,

				// A dead local server must never trigger an endless
				// reconnect loop.
				retryStrategy(times) {
					return times > 3 ? null : Math.min(times * 200, 1000)
				},
			})

			// Without a listener every connection error logs an
			// unhandled error event warning.
			this.client.on('error', () => {})
		}

		return this.client
	}
}
