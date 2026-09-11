import { RedisEngineKind, RedisServer as LocalRedisServer } from '@awsless/redis-server'
import { Cluster, Redis } from 'ioredis'

export type RedisServerOptions = {
	// 'memory' (default) runs the in-process server, 'redis' the real
	// binary through redis-memory-server.
	engine?: RedisEngineKind
}

// Pulls `--databases N` out of redis-server style arguments so callers that
// used to configure the real binary keep working.
const parseDatabases = (args: string[]) => {
	const index = args.indexOf('--databases')
	const value = index === -1 ? undefined : args[index + 1]
	return value === undefined ? undefined : parseInt(value, 10)
}

export class RedisServer {
	private client?: Redis | Cluster
	private process?: LocalRedisServer

	constructor(private readonly options: RedisServerOptions = {}) {}

	// The version only applies to the real engine: the in-memory server
	// always behaves like redis 7, matching the elasticache engine.
	async start(port?: number, version = '7.2.4', args: string[] = []) {
		if (this.process) {
			throw new Error(`Redis server is already listening on port: ${this.process.port}`)
		}

		if (port && (port < 0 || port >= 65536)) {
			throw new RangeError(`Port should be >= 0 and < 65536. Received ${port}.`)
		}

		const server = new LocalRedisServer({
			engine: this.options.engine,
			port,
			version,
			databases: parseDatabases(args),
			args: args.filter((arg, i) => arg !== '--databases' && args[i - 1] !== '--databases'),
		})

		await server.listen()
		this.process = server
	}

	// Only the real binary can die or log on its own - the in-memory
	// engine never fires these.
	onExit(handler: (code: number | null, signal: string | null) => void) {
		this.process?.onExit(handler)
	}

	onOutput(handler: (line: string) => void) {
		this.process?.onOutput(handler)
	}

	async kill() {
		if (this.process) {
			this.client?.disconnect()
			await this.process.close()
			this.process = undefined
		}
	}

	async getPort() {
		const port = this.process?.port

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
				host: this.process?.host,
				port: this.process?.port,
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
