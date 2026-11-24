import { createServer, type AddressInfo, type Server, type Socket } from 'node:net'
import { createIoRedisClient } from '../src'

type StubRedisServer = {
	port: number
	connections: Socket[]
	stallSockets(sockets?: Iterable<Socket>): void
	stallNextConnections(count: number): void
	close(): Promise<void>
	reopen(): Promise<void>
}

// Parses complete RESP arrays from a stream buffer, leaving trailing partial bytes.
const parseRespCommands = (buffer: string): { commands: string[][]; rest: string } => {
	const commands: string[][] = []
	let offset = 0

	while (offset < buffer.length) {
		if (buffer[offset] !== '*') break
		const headerEnd = buffer.indexOf('\r\n', offset)
		if (headerEnd === -1) break

		const count = parseInt(buffer.slice(offset + 1, headerEnd), 10)
		let cursor = headerEnd + 2
		const args: string[] = []
		let complete = true

		for (let i = 0; i < count; i++) {
			if (cursor >= buffer.length || buffer[cursor] !== '$') {
				complete = false
				break
			}
			const lenEnd = buffer.indexOf('\r\n', cursor)
			if (lenEnd === -1) {
				complete = false
				break
			}
			const len = parseInt(buffer.slice(cursor + 1, lenEnd), 10)
			const argStart = lenEnd + 2
			const argEnd = argStart + len
			if (argEnd + 2 > buffer.length) {
				complete = false
				break
			}
			args.push(buffer.slice(argStart, argEnd))
			cursor = argEnd + 2
		}

		if (!complete) break
		commands.push(args)
		offset = cursor
	}

	return { commands, rest: buffer.slice(offset) }
}

const startStubServer = async (port = 0): Promise<StubRedisServer> => {
	const store = new Map<string, string>()
	const connections: Socket[] = []
	const stalled = new WeakSet<Socket>()
	let stallRemaining = 0
	let actualPort = port

	const formatReply = (cmd: string[]): string => {
		const name = cmd[0]?.toUpperCase()
		if (name === 'HELLO') {
			return '-ERR unknown command `HELLO`\r\n'
		}
		if (name === 'CLIENT' || name === 'QUIT') {
			return '+OK\r\n'
		}
		if (name === 'PING') {
			return '+PONG\r\n'
		}
		if (name === 'SET') {
			store.set(cmd[1]!, cmd[2]!)
			return '+OK\r\n'
		}
		if (name === 'GET') {
			const value = store.get(cmd[1]!)
			return value === undefined ? '$-1\r\n' : `$${Buffer.byteLength(value)}\r\n${value}\r\n`
		}
		if (name === 'CLUSTER' && cmd[1]?.toUpperCase() === 'SLOTS') {
			const host = '127.0.0.1'
			return `*1\r\n*3\r\n:0\r\n:16383\r\n*2\r\n$${host.length}\r\n${host}\r\n:${actualPort}\r\n`
		}
		return '+OK\r\n'
	}

	const createTcpServer = () =>
		createServer(socket => {
			connections.push(socket)
			if (stallRemaining > 0) {
				stallRemaining -= 1
				stalled.add(socket)
			}

			let buffer = ''
			socket.on('data', chunk => {
				if (stalled.has(socket)) return
				buffer += chunk.toString('utf8')
				const parsed = parseRespCommands(buffer)
				buffer = parsed.rest
				for (const cmd of parsed.commands) {
					socket.write(formatReply(cmd))
					if (cmd[0]?.toUpperCase() === 'QUIT') {
						socket.end()
					}
				}
			})
		})

	let server: Server = createTcpServer()

	const listen = (targetPort: number) =>
		new Promise<number>((resolve, reject) => {
			server.once('error', reject)
			server.listen(targetPort, '127.0.0.1', () => {
				server.off('error', reject)
				resolve((server.address() as AddressInfo).port)
			})
		})

	actualPort = await listen(port)

	return {
		get port() {
			return actualPort
		},
		connections,
		stallSockets(sockets = connections) {
			for (const socket of sockets) {
				stalled.add(socket)
			}
		},
		stallNextConnections(count: number) {
			stallRemaining = count
		},
		async close() {
			for (const socket of connections) {
				socket.destroy()
			}
			await new Promise<void>(resolve => server.close(() => resolve()))
		},
		async reopen() {
			server = createTcpServer()
			actualPort = await listen(actualPort)
		},
	}
}

describe('Redis Client reconnect on timeout', () => {
	it('reconnects and retries standalone commands when the active socket times out', async () => {
		const server = await startStubServer()
		const client = createIoRedisClient({
			host: '127.0.0.1',
			port: server.port,
			cluster: false,
			tls: undefined,
			commandTimeout: 600,
		})

		try {
			await client.send('SET', ['k', 'v'])
			expect(await client.send('GET', ['k'])).toBe('v')
			expect(server.connections.length).toBe(1)

			// Freeze the existing socket without closing it (half-open connection).
			server.stallSockets()

			const value = await client.send('GET', ['k'])
			expect(value).toBe('v')
			expect(server.connections.length).toBeGreaterThanOrEqual(2)
		} finally {
			await client.destroy()
			await server.close()
		}
	})

	it('retries standalone connection when the initial handshake hangs', async () => {
		const server = await startStubServer()
		server.stallNextConnections(1)

		const client = createIoRedisClient({
			host: '127.0.0.1',
			port: server.port,
			cluster: false,
			tls: undefined,
			commandTimeout: 800,
		})

		try {
			expect(await client.send('PING', [])).toBe('PONG')
			expect(server.connections.length).toBeGreaterThanOrEqual(2)
		} finally {
			await client.destroy()
			await server.close()
		}
	})

	it('recreates a standalone client after its retry strategy gives up', async () => {
		const server = await startStubServer()
		const port = server.port
		await server.close()

		const client = createIoRedisClient({
			host: '127.0.0.1',
			port,
			cluster: false,
			tls: undefined,
			commandTimeout: 400,
			retryStrategy: () => null,
		})

		try {
			await expect(client.send('PING', [])).rejects.toThrow()

			await server.reopen()
			expect(await client.send('PING', [])).toBe('PONG')
		} finally {
			await client.destroy()
			await server.close()
		}
	})

	it('reconnects and retries cluster commands when a node socket times out', async () => {
		const server = await startStubServer()
		const client = createIoRedisClient({
			host: '127.0.0.1',
			port: server.port,
			cluster: true,
			tls: undefined,
			commandTimeout: 1000,
		})

		try {
			await client.send('SET', ['k', 'v'])
			expect(await client.send('GET', ['k'])).toBe('v')

			const before = server.connections.length
			server.stallSockets()

			const value = await client.send('GET', ['k'])
			expect(value).toBe('v')
			expect(server.connections.length).toBeGreaterThan(before)

			const beforeBatch = server.connections.length
			server.stallSockets()

			// On a single-node cluster, draining the pool moves the cluster out of
			// "ready" before the pipeline rejection microtask runs, so the in-flight
			// batch may report "Connection is closed." while the cluster reconnects.
			const firstBatch = await client.batch([
				{ name: 'GET', args: ['k'] },
				{ name: 'GET', args: ['k'] },
			])
			const batchRecovered = firstBatch.every(([err, res]: [Error | null, string]) => err === null && res === 'v')
			if (!batchRecovered) {
				const retryBatch = await client.batch([
					{ name: 'GET', args: ['k'] },
					{ name: 'GET', args: ['k'] },
				])
				expect(retryBatch).toStrictEqual([
					[null, 'v'],
					[null, 'v'],
				])
			}
			expect(server.connections.length).toBeGreaterThan(beforeBatch)
		} finally {
			await client.destroy()
			await server.close()
		}
	})

	it('recreates a cluster client after exhausting clusterRetryStrategy', async () => {
		const server = await startStubServer()
		const port = server.port
		await server.close()

		const client = createIoRedisClient({
			host: '127.0.0.1',
			port,
			cluster: true,
			tls: undefined,
			commandTimeout: 400,
		})

		try {
			await expect(client.send('PING', [])).rejects.toThrow()

			await server.reopen()
			expect(await client.send('PING', [])).toBe('PONG')
		} finally {
			await client.destroy()
			await server.close()
		}
	}, 10_000)
})
