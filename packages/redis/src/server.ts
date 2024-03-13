import { RedisMemoryServer } from 'redis-memory-server'
import { Redis, Cluster } from 'ioredis'

export class RedisServer {
	private client?: Redis | Cluster
	private process?: RedisMemoryServer

	async start(port?: number) {
		if (this.process) {
			throw new Error(`Redis server is already listening on port: ${await this.process.getPort()}`)
		}

		if (port && (port < 0 || port >= 65536)) {
			throw new RangeError(`Port should be >= 0 and < 65536. Received ${port}.`)
		}

		this.process = await RedisMemoryServer.create({
			instance: {
				port,
				args: [],
			},
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
				// retryStrategy: (options) => {
				// 	return
				// },
			})
		}

		return this.client
	}
}
