import { Cluster, Redis } from 'ioredis'
import { RedisMemoryServer } from 'redis-memory-server'

export class RedisServer {
	private client?: Redis | Cluster
	private process?: RedisMemoryServer

	async start(port?: number, version = '7.2.4', args: string[] = []) {
		if (this.process) {
			throw new Error(`Redis server is already listening on port: ${await this.process.getPort()}`)
		}

		if (port && (port < 0 || port >= 65536)) {
			throw new RangeError(`Port should be >= 0 and < 65536. Received ${port}.`)
		}

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

	async kill() {
		if (this.process) {
			await this.client?.disconnect()
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
