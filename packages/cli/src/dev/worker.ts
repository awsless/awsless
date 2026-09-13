import { ChildProcess } from 'child_process'
import { writeFile } from 'fs/promises'
import { availableParallelism } from 'os'
import { join } from 'path'
import { debug } from '../cli/debug.js'
import { spawnDevChild } from './children.js'
import { findFreePort, stopChild, stripAnsi, WATCHDOG_FILE, WATCHDOG_SOURCE } from './util.js'

export type BundleWorker = {
	start: () => Promise<void>
	restart: () => Promise<void>
	stop: () => Promise<void>
	// The trace is the formatted trace header value of the dispatch's
	// span - the worker carries it through the handler's async context
	// into every outgoing loopback request.
	dispatch: (event: unknown, trace?: string) => Promise<unknown>
	// The number of live worker processes, for the dashboard's session
	// header.
	size: () => number
}

export class WorkerError extends Error {
	constructor(
		readonly name: string,
		message: string,
		stack?: string
	) {
		super(message)

		if (stack) {
			this.stack = stack
		}
	}
}

// Its own node process, so a rebuild gets a clean module cache & a
// crashing handler never takes down the dev server. HTTP instead of
// IPC, so the worker runtime never needs to match the cli runtime.
const WORKER_ENTRY = `import { AsyncLocalStorage } from 'node:async_hooks'
import http from 'node:http'
import https from 'node:https'
import { createServer } from 'node:http'
import { syncBuiltinESMExports } from 'node:module'
import { format } from 'node:util'

let handler
let getCurrentRoute = () => undefined

// The trace of the running invocation, set per dispatch by the dev
// server. The async context keeps it accurate under concurrent
// requests, exactly like the route context.
const traceContext = new AsyncLocalStorage()

const isLoopback = host => host === '127.0.0.1' || host === 'localhost' || host === '::1'

// Outgoing requests to the local emulators carry the active trace as a
// header, so a queue send or task invoke made by a handler links the
// dispatch it causes back to this invocation. Only loopback targets:
// a request to a real external api must never see the header.
const injectTrace = module => {
	const original = module.request

	module.request = function (...args) {
		const trace = traceContext.getStore()

		if (trace) {
			// The options may sit behind an optional url argument.
			const index = typeof args[0] === 'string' || args[0] instanceof URL ? 1 : 0
			let url

			try {
				url = index === 1 ? new URL(String(args[0])) : undefined
			} catch (_) {}

			let options = args[index]

			if (typeof options === 'function' || options === undefined) {
				args.splice(index, 0, {})
				options = args[index]
			}

			const host = String(url?.hostname ?? options.hostname ?? options.host ?? '').split(':')[0]

			if (isLoopback(host)) {
				args[index] = { ...options, headers: { ...options.headers, 'x-awsless-trace': trace } }
			}
		}

		return original.apply(this, args)
	}
}

injectTrace(http)
injectTrace(https)

// The aws sdk grabs request via ESM named imports (like
// "const { request } = await import('node:http')"), and ESM named
// exports of builtins are snapshots - the sync pushes the patched
// functions into those bindings too.
syncBuiltinESMExports()

const originalFetch = globalThis.fetch

globalThis.fetch = (input, init) => {
	const trace = traceContext.getStore()

	if (trace) {
		try {
			const url = new URL(input instanceof Request ? input.url : String(input))

			if (isLoopback(url.hostname)) {
				const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))

				headers.set('x-awsless-trace', trace)
				init = { ...init, headers }
			}
		} catch (_) {}
	}

	return originalFetch(input, init)
}

// One framed record per console call (marker, route, json text), so
// multi-line output stays a single log entry downstream.
const patchConsole = (method, stream) => {
	console[method] = (...args) => {
		const route = getCurrentRoute() ?? ''

		stream.write('\\x1f' + route + '\\x1f' + JSON.stringify(format(...args)) + '\\n')
	}
}

patchConsole('log', process.stdout)
patchConsole('info', process.stdout)
patchConsole('debug', process.stdout)
patchConsole('warn', process.stderr)
patchConsole('error', process.stderr)

try {
	const bundle = await import('./files/index.mjs')

	handler = bundle.default
	getCurrentRoute = bundle.getCurrentRoute ?? getCurrentRoute
} catch (error) {
	// Keep module load failures readable, instead of node dumping the
	// whole minified line that threw.
	console.error('The bundle failed to load:')
	console.error(error?.message ?? error)
	process.exit(1)
}

const server = createServer((req, res) => {
	if (req.method !== 'POST') {
		res.writeHead(200)
		res.end('ready')
		return
	}

	const chunks = []
	req.on('data', chunk => chunks.push(chunk))
	req.on('end', async () => {
		let body

		try {
			const { event, context, trace } = JSON.parse(Buffer.concat(chunks).toString())

			// Fabricate the parts of the lambda context that only exist
			// at runtime, like the remaining time counter.
			const started = Date.now()
			const run = () => handler(event, {
				functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
				functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
				memoryLimitInMB: '512',
				awsRequestId: crypto.randomUUID(),
				getRemainingTimeInMillis: () => 15 * 60 * 1000 - (Date.now() - started),
				...context,
			})

			const result = await (trace ? traceContext.run(trace, run) : run())

			// Serialized inside the try: a result the json encoder rejects
			// (a bigint, a cycle) is a handler error, not a worker crash.
			body = JSON.stringify({ result: typeof result === 'undefined' ? null : result })
		} catch (error) {
			body = JSON.stringify({
				error: {
					name: error?.name ?? 'Error',
					message: error?.message ?? String(error),
					stack: error?.stack,
				},
			})
		}

		res.writeHead(200, { 'content-type': 'application/json' })
		res.end(body)
	})
})

server.listen(Number(process.env.AWSLESS_DEV_WORKER_PORT), '127.0.0.1')
`

export type WorkerRecord = {
	text: string
	route?: string
}

// One console record from the worker's output stream: the framed
// records the worker entry writes carry their route & json text, and
// anything else (like node's own crash output) passes through as is.
const parseFrame = (raw: string): WorkerRecord => {
	if (!raw.startsWith('\x1f')) {
		return { text: raw }
	}

	const end = raw.indexOf('\x1f', 1)

	if (end <= 0) {
		return { text: raw }
	}

	const route = raw.slice(1, end) || undefined
	const encoded = raw.slice(end + 1)

	try {
		return { route, text: String(JSON.parse(encoded)) }
	} catch {
		return { route, text: encoded }
	}
}

// Reassembles the worker's output chunks into whole records: a chunk
// boundary can land anywhere inside a line, so the partial tail waits
// for the next chunk instead of surfacing as a torn record.
export const createFrameReader = (onRecord: (record: WorkerRecord) => void) => {
	let buffer = ''

	return (chunk: Buffer | string) => {
		buffer += chunk.toString()

		const parts = buffer.split('\n')
		buffer = parts.pop() ?? ''

		for (const raw of parts) {
			if (raw !== '') {
				onRecord(parseFrame(raw))
			}
		}
	}
}

type PoolWorker = {
	child: ChildProcess
	port: number
	// The number of requests currently inside this worker, so dispatch
	// can route to the least busy one.
	inflight: number
	// The exit code once the process died on its own.
	exited?: number | null
}

export const createBundleWorker = (props: {
	buildDir: string
	env: Record<string, string>
	functionName: string
	// While true, worker output skips the terminal echo & only reaches
	// onOutput - like during a noisy seed run.
	quiet?: () => boolean
	// Receives every output line of the workers, for the dashboard's
	// live log view. The raw output keeps streaming to the terminal.
	onOutput?: (line: string, stream: 'stdout' | 'stderr', route?: string) => void
	// Fires when a worker died on its own (not through a stop or a
	// restart) & left the pool. The size tells whether any are left.
	onCrash?: (info: { code: number | null; size: number }) => void
}): BundleWorker => {
	let workers: PoolWorker[] = []

	// The number of worker processes. Production runs every invocation
	// in its own isolated sandbox - a local pool approximates that, so
	// one cpu heavy handler can't stall every other request in the app.
	const concurrency = Math.max(
		1,
		Number(process.env.AWSLESS_DEV_WORKERS) || Math.min(4, Math.max(2, availableParallelism() - 2))
	)

	const context = {
		invokedFunctionArn: `arn:aws:lambda:${props.env.AWS_REGION}:${props.env.AWS_ACCOUNT_ID}:function:${props.functionName}:local`,
	}

	// Lifecycle operations run strictly one at a time: a restart racing
	// another restart (or the shutdown) would interleave stop/start &
	// leak the losing pool's children.
	let lifecycle: Promise<unknown> = Promise.resolve()
	let pending = 0

	const serialize = <T>(action: () => Promise<T>) => {
		pending++

		const run = lifecycle.then(action).finally(() => {
			pending--
		})

		lifecycle = run.catch(() => {})

		return run
	}

	const waitForReady = async (worker: PoolWorker) => {
		const deadline = Date.now() + 10_000

		while (Date.now() < deadline) {
			// A signal kill leaves exitCode null, so both fields count.
			if (worker.child.exitCode !== null || worker.child.signalCode !== null) {
				throw new Error(
					`The bundle worker exited (${worker.child.signalCode ?? `code ${worker.child.exitCode}`}) during startup.`
				)
			}

			try {
				const res = await fetch(`http://127.0.0.1:${worker.port}`)

				if (res.ok) {
					return
				}
			} catch {}

			await new Promise(resolve => setTimeout(resolve, 50))
		}

		throw new Error('The bundle worker never became ready.')
	}

	// A worker that died on its own leaves the pool right away, or the
	// least-busy pick would keep routing to it: its refused connections
	// fail instantly, which reads as "idle". The pool only shrinks - an
	// empty pool restarts as a whole on the next dispatch.
	const onExit = (worker: PoolWorker, code: number | null, signal: NodeJS.Signals | null) => {
		worker.exited = code

		const index = workers.indexOf(worker)

		if (index === -1) {
			return
		}

		workers.splice(index, 1)
		debug(`Bundle worker exited unexpectedly (${signal ?? `code ${code}`})`)
		props.onCrash?.({ code, size: workers.length })
	}

	const startWorker = async (): Promise<PoolWorker> => {
		const entry = join(props.buildDir, 'worker.mjs')
		const port = await findFreePort()

		// Piped, not inherited: a node child restores the tty termios it
		// saw at spawn, which under the boot spinner means raw mode.
		const child = spawnDevChild(
			'node',
			['--enable-source-maps', '-r', join(props.buildDir, WATCHDOG_FILE), entry],
			{
				cwd: props.buildDir,
				stdio: ['ignore', 'pipe', 'pipe'],
				env: {
					PATH: process.env.PATH,
					...props.env,
					AWSLESS_DEV_WORKER_PORT: String(port),
				},
			}
		)

		// One reader per stream & worker, so a record never interleaves
		// between workers.
		const capture = (stream: 'stdout' | 'stderr') =>
			createFrameReader(({ text, route }) => {
				// The terminal shows the route as a readable prefix on the
				// first line of the record.
				if (!props.quiet?.()) {
					process[stream].write((route ? `[${route}] ` : '') + text + '\n')
				}

				const clean = stripAnsi(text)

				if (clean.trim() !== '') {
					props.onOutput?.(clean, stream, route)
				}
			})

		child.stdout?.on('data', capture('stdout'))
		child.stderr?.on('data', capture('stderr'))

		const worker: PoolWorker = { child, port, inflight: 0 }

		child.on('exit', (code, signal) => onExit(worker, code, signal))

		try {
			await waitForReady(worker)
		} catch (error) {
			// A child that failed or hung during startup never outlives
			// the error, or every retry would leak another process.
			await stopChild(child)
			throw error
		}

		return worker
	}

	const doStart = async () => {
		await Promise.all([
			writeFile(join(props.buildDir, 'worker.mjs'), WORKER_ENTRY),
			writeFile(join(props.buildDir, WATCHDOG_FILE), WATCHDOG_SOURCE),
		])

		const results = await Promise.allSettled(Array.from({ length: concurrency }, () => startWorker()))
		const started = results.filter(result => result.status === 'fulfilled').map(result => result.value)
		const failed = results.find(result => result.status === 'rejected')

		// A partial pool never leaks: the siblings that did boot stop
		// before the failure surfaces.
		if (failed) {
			await Promise.all(started.map(worker => stopChild(worker.child)))
			throw failed.reason
		}

		// A worker that died between its ready check & this point never
		// enters the pool dead - it reports like any other crash.
		workers = started.filter(worker => worker.exited === undefined)

		for (const worker of started) {
			if (worker.exited !== undefined) {
				props.onCrash?.({ code: worker.exited, size: workers.length })
			}
		}
	}

	const doStop = async () => {
		const stopping = workers
		workers = []

		await Promise.all(stopping.map(worker => stopChild(worker.child)))
	}

	return {
		size: () => workers.length,
		start: () => serialize(doStart),
		stop: () => serialize(doStop),
		restart: () =>
			serialize(async () => {
				await doStop()
				await doStart()
			}),
		async dispatch(event, trace) {
			// A start or restart in flight finishes first, so a dispatch
			// landing between a restart's stop & start never sees an empty
			// pool. Only lifecycle operations count - a crash never stalls
			// dispatches to the healthy workers.
			while (pending > 0) {
				await lifecycle
			}

			if (workers.length === 0) {
				throw new Error('The bundle worker is not running.')
			}

			// The least busy worker takes the request, so a stalled or
			// slow worker never queues up work while others sit idle.
			const worker = workers.reduce((a, b) => (b.inflight < a.inflight ? b : a))

			worker.inflight++

			try {
				let body: { result?: unknown; error?: { name: string; message: string; stack?: string } }

				try {
					const res = await fetch(`http://127.0.0.1:${worker.port}`, {
						method: 'POST',
						body: JSON.stringify({ event, context, trace }),
					})

					body = await res.json()
				} catch (error) {
					// The socket can drop before the exit event lands, so give
					// the process a moment before deciding whether it crashed.
					const hasExited = () =>
						worker.exited !== undefined ||
						worker.child.exitCode !== null ||
						worker.child.signalCode !== null

					for (let i = 0; i < 10 && !hasExited(); i++) {
						await new Promise(resolve => setTimeout(resolve, 25))
					}

					if (hasExited()) {
						throw new WorkerError(
							'WorkerCrashed',
							`The bundle worker exited (${worker.child.signalCode ?? `code ${worker.child.exitCode}`}) while handling the request.`
						)
					}

					throw error
				}

				if (body.error) {
					throw new WorkerError(body.error.name, body.error.message, body.error.stack)
				}

				return body.result
			} finally {
				worker.inflight--
			}
		},
	}
}
