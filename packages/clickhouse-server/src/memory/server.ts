import { randomUUID } from 'crypto'
import { createServer, IncomingMessage, Server, ServerResponse } from 'http'
import { gunzipSync, gzipSync } from 'zlib'
import { Engine } from './engine'
import { ClickHouseException } from './errors'
import { formatResult, outputSettings } from './format'

export type MemoryClickHouseServerOptions = {
	host?: string
	port?: number
}

// The url parameters that aren't settings.
const RESERVED = new Set([
	'query',
	'query_id',
	'database',
	'default_format',
	'user',
	'password',
	'quota_key',
	'session_id',
	'session_timeout',
	'session_check',
	'compress',
	'decompress',
	'buffer_size',
	'wait_end_of_query',
	'role',
])

const readBody = (req: IncomingMessage) =>
	new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = []
		req.on('data', chunk => chunks.push(chunk))
		req.on('end', () => resolve(Buffer.concat(chunks)))
		req.on('error', reject)
	})

const SUMMARY_KEYS = [
	'read_rows',
	'read_bytes',
	'written_rows',
	'written_bytes',
	'total_rows_to_read',
	'result_rows',
	'result_bytes',
	'elapsed_ns',
	'memory_usage',
]

// ClickHouse's http interface in TypeScript, speaking enough of it for the
// official clients: queries in the body or the url, parameters, settings,
// formats, compression & errors in ClickHouse's own words.
export class MemoryClickHouseServer {
	readonly host: string
	readonly engine = new Engine()

	private server: Server | undefined
	private boundPort = 0

	constructor(private readonly options: MemoryClickHouseServerOptions = {}) {
		this.host = options.host ?? '127.0.0.1'
	}

	get port() {
		return this.boundPort
	}

	get endpoint() {
		return `http://${this.host}:${this.boundPort}`
	}

	async listen(port = this.options.port ?? 0) {
		if (this.server) {
			throw new Error('The ClickHouse server is already listening')
		}

		const server = createServer((req, res) => {
			this.handle(req, res).catch(error => {
				res.writeHead(500, { 'content-type': 'text/plain; charset=UTF-8' })
				res.end(String(error))
			})
		})

		// The official client keeps its sockets alive between requests.
		server.keepAliveTimeout = 10_000

		await new Promise<void>((resolve, reject) => {
			server.once('error', reject)
			server.listen(port, this.host, () => resolve())
		})

		this.server = server
		this.boundPort = (server.address() as { port: number }).port
	}

	async close() {
		const server = this.server

		this.server = undefined
		this.boundPort = 0

		if (server) {
			server.closeAllConnections()
			await new Promise(resolve => server.close(resolve))
		}
	}

	// Drops every table & database, so a run starts from nothing.
	async reset() {
		this.engine.reset()
	}

	// Runs a statement directly, without http.
	query(sql: string, params: Record<string, string> = {}) {
		return this.engine.execute(sql, { params })
	}

	private async handle(req: IncomingMessage, res: ServerResponse) {
		const url = new URL(req.url ?? '/', 'http://localhost')

		if (
			url.pathname === '/ping' ||
			(url.pathname === '/' && req.method === 'GET' && !url.searchParams.has('query'))
		) {
			res.writeHead(200, { 'content-type': 'text/plain; charset=UTF-8' })
			res.end('Ok.\n')
			return
		}

		if (url.pathname === '/replicas_status') {
			res.writeHead(200, { 'content-type': 'text/plain; charset=UTF-8' })
			res.end('Ok.\n')
			return
		}

		if (url.pathname !== '/') {
			res.writeHead(404, { 'content-type': 'text/plain; charset=UTF-8' })
			res.end('There is no handle ' + url.pathname + '\n')
			return
		}

		let body = await readBody(req)

		if (req.headers['content-encoding'] === 'gzip' || url.searchParams.get('decompress') === '1') {
			body = gunzipSync(body)
		}

		const params: Record<string, string> = {}
		const settings: Record<string, unknown> = {}

		for (const [key, value] of url.searchParams) {
			if (key.startsWith('param_')) params[key.slice(6)] = value
			else if (!RESERVED.has(key)) settings[key] = value
		}

		const queryId = url.searchParams.get('query_id') || randomUUID()
		const started = process.hrtime.bigint()
		const headers: Record<string, string> = {
			'x-clickhouse-query-id': queryId,
			'x-clickhouse-timezone': 'UTC',
			'x-clickhouse-server-display-name': 'localhost',
		}

		// The query is the url's query followed by the body, which is the
		// data of an INSERT.
		const sql = [url.searchParams.get('query'), body.length > 0 ? body.toString('utf8') : undefined]
			.filter(part => part !== null && part !== undefined)
			.join('\n')
		const database =
			req.headers['x-clickhouse-database']?.toString() || url.searchParams.get('database') || 'default'

		try {
			const executed = this.engine.execute(sql, { params, settings, database })
			const elapsed = Number(process.hrtime.bigint() - started)
			const summary = Object.fromEntries(SUMMARY_KEYS.map(key => [key, '0']))

			summary.read_rows = String(executed.readRows)
			summary.written_rows = String(executed.writtenRows)
			summary.result_rows = String(executed.result?.rows.length ?? 0)
			summary.elapsed_ns = String(elapsed)
			headers['x-clickhouse-summary'] = JSON.stringify(summary)

			if (!executed.result) {
				headers['content-type'] = 'text/plain; charset=UTF-8'
				this.send(req, res, 200, headers, '')
				return
			}

			const format =
				executed.format ??
				String(executed.settings.default_format ?? url.searchParams.get('default_format') ?? 'TabSeparated')
			const formatted = formatResult(executed.result, format, outputSettings(executed.settings), elapsed / 1e9)

			headers['content-type'] = formatted.contentType
			headers['x-clickhouse-format'] = formatted.format

			this.send(req, res, 200, headers, formatted.body, url.searchParams.get('enable_http_compression') === '1')
		} catch (error) {
			const exception =
				error instanceof ClickHouseException
					? error
					: new ClickHouseException(
							1001,
							'STD_EXCEPTION',
							error instanceof Error ? error.message : String(error)
						)

			headers['x-clickhouse-exception-code'] = String(exception.code)
			headers['content-type'] = 'text/plain; charset=UTF-8'

			this.send(req, res, exception.status, headers, exception.toString())
		}
	}

	private send(
		req: IncomingMessage,
		res: ServerResponse,
		status: number,
		headers: Record<string, string>,
		body: string,
		compress = false
	) {
		const accept = String(req.headers['accept-encoding'] ?? '')

		if (compress && accept.includes('gzip') && body.length > 0) {
			res.writeHead(status, { ...headers, 'content-encoding': 'gzip' })
			res.end(gzipSync(body))
			return
		}

		res.writeHead(status, headers)
		res.end(body)
	}
}
