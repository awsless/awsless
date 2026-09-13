import { Socket } from 'node:net'

type RedisMemoryServerInstance = {
	getPort(): Promise<number>
	getHost(): Promise<string>
	stop(): Promise<boolean>
	instanceInfoSync?: {
		childProcess?: {
			stdout?: NodeJS.ReadableStream | null
			stderr?: NodeJS.ReadableStream | null
			once(event: 'exit', listener: (code: number | null, signal: string | null) => void): unknown
		}
	}
}

export type RealRedisServerOptions = {
	host?: string
	port?: number
	databases?: number
	version?: string
	args?: string[]
}

// The real redis binary through redis-memory-server, which downloads and
// compiles redis from source on first use. Optional because that build
// needs network access and a compiler, which the in-memory engine avoids.
export class RealRedisServer {
	readonly host: string

	private readonly options: RealRedisServerOptions
	private process: RedisMemoryServerInstance | undefined
	private boundPort = 0
	private stopping = false

	constructor(options: RealRedisServerOptions = {}) {
		this.host = options.host ?? '127.0.0.1'
		this.options = options
	}

	get port() {
		return this.boundPort
	}

	async listen(port = this.options.port ?? 0) {
		if (this.process) {
			throw new Error(`Redis server is already listening on port: ${this.boundPort}`)
		}

		const { RedisMemoryServer } = await import('redis-memory-server')
		const args = [...(this.options.args ?? [])]

		if (this.options.databases !== undefined) {
			args.push('--databases', String(this.options.databases))
		}

		this.stopping = false
		this.process = (await RedisMemoryServer.create({
			instance: {
				port: port || undefined,
				args,
			},
			// The default "stable" resolves to redis 8, which bundles
			// native modules that fail to build on macos. Redis 7 builds
			// everywhere & matches the elasticache engine.
			binary: { version: this.options.version ?? '7.2.4' },
		})) as unknown as RedisMemoryServerInstance

		this.boundPort = await this.process.getPort()
	}

	// Fires when the redis child dies without close() asking for it.
	onExit(handler: (code: number | null, signal: string | null) => void) {
		this.process?.instanceInfoSync?.childProcess?.once('exit', (code, signal) => {
			if (!this.stopping) {
				handler(code, signal)
			}
		})
	}

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

	async close() {
		if (!this.process) {
			return
		}

		this.stopping = true
		await this.process.stop()
		this.process = undefined
		this.boundPort = 0
	}

	// One raw command over a fresh socket, so flushing needs no client
	// library on this side.
	async flushAll() {
		if (!this.process) {
			return
		}

		await new Promise<void>((resolve, reject) => {
			const socket = new Socket()
			socket.once('error', reject)
			socket.connect(this.boundPort, this.host, () => socket.write('FLUSHALL\r\n'))
			socket.once('data', data => {
				socket.destroy()
				data.toString().startsWith('+OK') ? resolve() : reject(new Error(data.toString().trim()))
			})
		})
	}
}
