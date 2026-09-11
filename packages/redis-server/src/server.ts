import { createServer, Server, Socket } from 'node:net'
import { RedisEngine } from './engine/engine'
import { encodeReply, ProtocolError, RespParser } from './resp'

export type MemoryRedisServerOptions = {
	host?: string
	port?: number
	databases?: number
}

export class MemoryRedisServer {
	readonly host: string
	readonly engine: RedisEngine

	private defaultPort: number
	private server: Server | undefined
	private sockets = new Set<Socket>()
	private boundPort = 0

	constructor(options: MemoryRedisServerOptions = {}) {
		this.host = options.host ?? '127.0.0.1'
		this.defaultPort = options.port ?? 0
		this.engine = new RedisEngine({ databases: options.databases })
	}

	get port() {
		return this.boundPort
	}

	async listen(port = this.defaultPort) {
		if (this.server) {
			throw new Error(`Redis server is already listening on port: ${this.boundPort}`)
		}

		const server = createServer(socket => this.handle(socket))
		this.server = server

		await new Promise<void>((resolve, reject) => {
			const onError = (err: Error) => {
				this.server = undefined
				reject(err)
			}

			server.once('error', onError)
			server.listen(port, this.host, () => {
				server.off('error', onError)
				resolve()
			})
		})

		const address = server.address()
		this.boundPort = typeof address === 'object' && address ? address.port : port
		this.engine.port = this.boundPort
		this.engine.startSweeper()
	}

	async close() {
		const server = this.server

		if (!server) {
			return
		}

		this.server = undefined
		this.engine.stopSweeper()

		for (const socket of this.sockets) {
			socket.destroy()
		}

		this.sockets.clear()

		await new Promise<void>(resolve => server.close(() => resolve()))

		this.boundPort = 0
		this.engine.port = 0
	}

	flushAll() {
		this.engine.flushAll()
	}

	private handle(socket: Socket) {
		this.sockets.add(socket)
		socket.setNoDelay(true)

		const parser = new RespParser()
		// Replies and pub/sub pushes produced while a batch of pipelined
		// commands runs are queued so they leave the socket in order.
		let pending: string[] = []
		let processing = false

		const write = (data: string) => {
			if (data === '') {
				return
			}

			if (processing) {
				pending.push(data)
			} else if (!socket.destroyed) {
				socket.write(Buffer.from(data, 'latin1'))
			}
		}

		const conn = this.engine.createConnection(reply => write(encodeReply(reply, conn.protocol)))
		this.engine.stats.connections++

		socket.on('data', chunk => {
			let commands: string[][]

			try {
				commands = parser.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'latin1'))
			} catch (err) {
				const message = err instanceof ProtocolError ? err.message : 'invalid request'
				socket.write(Buffer.from(`-ERR Protocol error: ${message}\r\n`, 'latin1'))
				socket.destroy()
				return
			}

			processing = true

			for (const args of commands) {
				this.engine.stats.commands++
				write(encodeReply(this.engine.execute(args, conn), conn.protocol))

				if (conn.quit) {
					break
				}
			}

			processing = false
			const out = pending.join('')
			pending = []

			if (out !== '' && !socket.destroyed) {
				socket.write(Buffer.from(out, 'latin1'))
			}

			if (conn.quit) {
				socket.end()
			}
		})

		socket.on('close', () => {
			this.engine.releaseConnection(conn)
			this.sockets.delete(socket)
		})

		// A client that vanishes mid-write must not crash the server.
		socket.on('error', () => {})
	}
}
