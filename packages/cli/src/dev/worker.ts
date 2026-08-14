import { ChildProcess, spawn } from 'child_process'
import { writeFile } from 'fs/promises'
import { availableParallelism } from 'os'
import { join } from 'path'
import { debug } from '../cli/debug.js'
import { findFreePort, stopChild, stripAnsi } from './util.js'

export type BundleWorker = {
	start: () => Promise<void>
	restart: () => Promise<void>
	stop: () => Promise<void>
	dispatch: (event: unknown) => Promise<unknown>
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

// The worker runs the bundle in its own node process, so a rebuild can
// restart it with a clean module cache & a crashing handler can never
// take down the dev server. The dev server talks to it over local HTTP
// instead of IPC, so the worker runtime never needs to match the CLI
// runtime.
const WORKER_ENTRY = `import { createServer } from 'node:http'
import { format } from 'node:util'

let handler
let getCurrentRoute = () => undefined

// Every console call writes ONE framed record: an invisible \\x1f
// marker with the active bundle route & the json-encoded text, so
// multi-line output stays a single log entry downstream. The route
// comes from the bundle's async context, accurate even under
// concurrent requests.
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
		let response

		try {
			const { event, context } = JSON.parse(Buffer.concat(chunks).toString())

			// Fabricate the parts of the lambda context that only exist
			// at runtime, like the remaining time counter.
			const started = Date.now()
			const result = await handler(event, {
				functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
				functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
				memoryLimitInMB: '512',
				awsRequestId: crypto.randomUUID(),
				getRemainingTimeInMillis: () => 15 * 60 * 1000 - (Date.now() - started),
				...context,
			})

			response = { result: typeof result === 'undefined' ? null : result }
		} catch (error) {
			response = {
				error: {
					name: error?.name ?? 'Error',
					message: error?.message ?? String(error),
					stack: error?.stack,
				},
			}
		}

		res.writeHead(200, { 'content-type': 'application/json' })
		res.end(JSON.stringify(response))
	})
})

server.listen(Number(process.env.AWSLESS_DEV_WORKER_PORT), '127.0.0.1')
`

type PoolWorker = {
	child: ChildProcess
	port: number
	// The number of requests currently inside this worker, so dispatch
	// can route to the least busy one.
	inflight: number
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

	const waitForReady = async (worker: PoolWorker) => {
		const deadline = Date.now() + 10_000

		while (Date.now() < deadline) {
			if (worker.child.exitCode !== null) {
				throw new Error(`The bundle worker exited with code ${worker.child.exitCode} during startup.`)
			}

			try {
				const res = await fetch(`http://127.0.0.1:${worker.port}`)

				if (res.ok) {
					return
				}
			} catch (_) {}

			await new Promise(resolve => setTimeout(resolve, 50))
		}

		throw new Error('The bundle worker never became ready.')
	}

	const startWorker = async (): Promise<PoolWorker> => {
		const entry = join(props.buildDir, 'worker.mjs')
		const port = await findFreePort()

		// Piped instead of inherited: a node child that inherits the tty
		// snapshots its termios at spawn & restores it on exit - so a
		// worker spawned during the boot spinner's raw mode would put
		// the terminal back into raw mode on every reload, killing
		// ctrl-c.
		const child = spawn('node', ['--enable-source-maps', entry], {
			cwd: props.buildDir,
			stdio: ['ignore', 'pipe', 'pipe'],
			env: {
				PATH: process.env.PATH,
				...props.env,
				AWSLESS_DEV_WORKER_PORT: String(port),
			},
		})

		// Console records arrive framed from the worker entry: one
		// \x1f<route>\x1f<json text> line per console call, so multi-line
		// output stays a single log entry. The buffer holds partial lines
		// across chunk boundaries per worker, so a record never splits or
		// interleaves between workers.
		const buffers = { stdout: '', stderr: '' }

		const capture = (stream: 'stdout' | 'stderr') => (chunk: Buffer) => {
			buffers[stream] += chunk.toString()

			const parts = buffers[stream].split('\n')
			buffers[stream] = parts.pop() ?? ''

			for (const raw of parts) {
				if (raw === '') {
					continue
				}

				let text = raw
				let route: string | undefined

				if (raw.startsWith('\x1f')) {
					const end = raw.indexOf('\x1f', 1)

					if (end > 0) {
						route = raw.slice(1, end) || undefined

						try {
							text = JSON.parse(raw.slice(end + 1))
						} catch (_) {
							text = raw.slice(end + 1)
						}
					}
				}

				// The terminal shows the route as a readable prefix on the
				// first line of the record.
				if (!props.quiet?.()) {
					process[stream].write((route ? `[${route}] ` : '') + text + '\n')
				}

				const clean = stripAnsi(text)

				if (clean.trim() !== '') {
					props.onOutput?.(clean, stream, route)
				}
			}
		}

		child.stdout?.on('data', capture('stdout'))
		child.stderr?.on('data', capture('stderr'))

		child.on('exit', code => {
			if (code !== null && code !== 0) {
				debug(`Bundle worker exited with code ${code}`)
			}
		})

		const worker: PoolWorker = { child, port, inflight: 0 }

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
		await writeFile(join(props.buildDir, 'worker.mjs'), WORKER_ENTRY)

		const results = await Promise.allSettled(Array.from({ length: concurrency }, () => startWorker()))
		const started = results.filter(result => result.status === 'fulfilled').map(result => result.value)
		const failed = results.find(result => result.status === 'rejected')

		// A partial pool never leaks: the siblings that did boot stop
		// before the failure surfaces.
		if (failed) {
			await Promise.all(started.map(worker => stopChild(worker.child)))
			throw failed.reason
		}

		workers = started
	}

	const doStop = async () => {
		const stopping = workers
		workers = []

		await Promise.all(stopping.map(worker => stopChild(worker.child)))
	}

	// Lifecycle operations run strictly one at a time: a restart racing
	// another restart (or the shutdown) would interleave stop/start &
	// leak the losing pool's children.
	let lifecycle: Promise<unknown> = Promise.resolve()

	const serialize = <T>(action: () => Promise<T>) => {
		const run = lifecycle.then(action)
		lifecycle = run.catch(() => {})
		return run
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
		async dispatch(event) {
			if (workers.length === 0) {
				throw new Error('The bundle worker is not running.')
			}

			// The least busy worker takes the request, so a stalled or
			// slow worker never queues up work while others sit idle.
			const worker = workers.reduce((a, b) => (b.inflight < a.inflight ? b : a))

			worker.inflight++

			try {
				const res = await fetch(`http://127.0.0.1:${worker.port}`, {
					method: 'POST',
					body: JSON.stringify({ event, context }),
				})

				const body = (await res.json()) as {
					result?: unknown
					error?: { name: string; message: string; stack?: string }
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
