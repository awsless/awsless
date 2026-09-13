import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { Store } from './engine/store'
import { OpenSearchError } from './errors'
import { createRoutes, dispatch, Request } from './routes'

export type MemoryOpenSearchServerOptions = {
	host?: string
	port?: number
}

const readBody = (req: IncomingMessage): Promise<string> => {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = []
		req.on('data', (chunk: Buffer) => chunks.push(chunk))
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
		req.on('error', reject)
	})
}

export class MemoryOpenSearchServer {
	readonly host: string
	private readonly initialPort: number
	private readonly store = new Store()
	private readonly routes = createRoutes(this.store)
	private readonly sockets = new Set<Socket>()
	private server: Server | undefined
	private boundPort = 0

	constructor(options: MemoryOpenSearchServerOptions = {}) {
		this.host = options.host ?? '127.0.0.1'
		this.initialPort = options.port ?? 0
	}

	get port() {
		return this.boundPort
	}

	get endpoint() {
		return `http://${this.host}:${this.boundPort}`
	}

	async listen(port = this.initialPort): Promise<void> {
		if (this.server) throw new Error('The OpenSearch server is already listening')

		const server = createServer((req, res) => {
			this.handle(req, res).catch((error: unknown) => {
				const message = error instanceof Error ? error.message : String(error)
				this.send(res, 500, {
					error: { root_cause: [{ type: 'exception', reason: message }], type: 'exception', reason: message },
					status: 500,
				})
			})
		})

		// Keep-alive sockets are tracked so close() can cut them; Bun does not
		// reliably end them through closeAllConnections.
		server.on('connection', socket => {
			this.sockets.add(socket)
			socket.on('close', () => this.sockets.delete(socket))
		})

		this.server = server

		await new Promise<void>((resolve, reject) => {
			server.once('error', reject)
			server.listen(port, this.host, () => {
				server.off('error', reject)
				const address = server.address()
				this.boundPort = typeof address === 'object' && address ? address.port : port
				resolve()
			})
		})
	}

	async close(): Promise<void> {
		const server = this.server
		if (!server) return
		this.server = undefined

		for (const socket of this.sockets) socket.destroy()
		this.sockets.clear()

		await new Promise<void>(resolve => server.close(() => resolve()))
		this.boundPort = 0
	}

	reset() {
		this.store.reset()
	}

	private send(res: ServerResponse, status: number, body: unknown, head = false) {
		const payload = body === undefined ? '' : JSON.stringify(body)
		res.writeHead(status, {
			'content-type': 'application/json; charset=UTF-8',
			'content-length': Buffer.byteLength(payload),
		})
		res.end(head ? undefined : payload)
	}

	private async handle(req: IncomingMessage, res: ServerResponse) {
		const url = new URL(req.url ?? '/', 'http://localhost')
		const method = (req.method ?? 'GET').toUpperCase()
		const rawBody = await readBody(req)
		const isHead = method === 'HEAD'

		try {
			const request: Request = {
				method,
				segments: url.pathname.split('/').filter(Boolean).map(decodeURIComponent),
				params: url.searchParams,
				rawBody,
				body: parseBody(rawBody, url.pathname),
			}
			const response = dispatch(this.routes, request)
			this.send(res, response.status, isHead ? undefined : response.body, isHead)
		} catch (error) {
			if (error instanceof OpenSearchError) {
				this.send(res, error.status, error.toBody(), isHead)
				return
			}
			throw error
		}
	}
}

// Bulk bodies are NDJSON and parsed by their handler; everything else is one
// JSON document.
const parseBody = (rawBody: string, pathname: string): unknown => {
	if (rawBody.trim() === '' || pathname.endsWith('/_bulk')) return undefined
	try {
		return JSON.parse(rawBody)
	} catch {
		throw new OpenSearchError('parsing_exception', 400, 'request body is not valid JSON')
	}
}
