import { RealRedisServer } from './real-server'
import { MemoryRedisServer } from './server'

export type RedisEngineKind = 'memory' | 'redis'

export type RedisServerOptions = {
	host?: string
	port?: number
	databases?: number
	// 'memory' runs the in-process engine, 'redis' the real binary through
	// redis-memory-server.
	engine?: RedisEngineKind
	// Real engine only: the redis version to build & extra server arguments.
	version?: string
	args?: string[]
}

export class RedisServer {
	readonly engine: RedisEngineKind
	readonly host: string

	private readonly memory: MemoryRedisServer | undefined
	private readonly real: RealRedisServer | undefined

	constructor(options: RedisServerOptions = {}) {
		this.engine = options.engine ?? 'memory'
		this.host = options.host ?? '127.0.0.1'

		if (this.engine === 'redis') {
			this.real = new RealRedisServer(options)
		} else {
			this.memory = new MemoryRedisServer(options)
		}
	}

	get port() {
		return this.memory?.port ?? this.real?.port ?? 0
	}

	async listen(port?: number) {
		await (this.memory ? this.memory.listen(port) : this.real!.listen(port))
	}

	async close() {
		await (this.memory ? this.memory.close() : this.real!.close())
	}

	// The in-memory engine flushes synchronously, the real one over a socket.
	flushAll(): Promise<void> {
		if (this.memory) {
			this.memory.flushAll()
			return Promise.resolve()
		}

		return this.real!.flushAll()
	}

	// The in-memory engine never dies or logs on its own, so these only
	// ever fire for the real binary.
	onExit(handler: (code: number | null, signal: string | null) => void) {
		this.real?.onExit(handler)
	}

	onOutput(handler: (line: string) => void) {
		this.real?.onOutput(handler)
	}
}
