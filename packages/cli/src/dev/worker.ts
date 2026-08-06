import { ChildProcess, spawn } from 'child_process'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { debug } from '../cli/debug.js'
import { findFreePort, stopChild } from './util.js'

export type BundleWorker = {
	start: () => Promise<void>
	restart: () => Promise<void>
	stop: () => Promise<void>
	dispatch: (event: unknown) => Promise<unknown>
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

let handler

try {
	handler = (await import('./files/index.mjs')).default
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

export const createBundleWorker = (props: {
	buildDir: string
	env: Record<string, string>
	functionName: string
}): BundleWorker => {
	let child: ChildProcess | undefined
	let port: number | undefined

	const context = {
		invokedFunctionArn: `arn:aws:lambda:${props.env.AWS_REGION}:${props.env.AWS_ACCOUNT_ID}:function:${props.functionName}:local`,
	}

	const waitForReady = async () => {
		const deadline = Date.now() + 10_000

		while (Date.now() < deadline) {
			if (child?.exitCode !== null && typeof child?.exitCode !== 'undefined') {
				throw new Error(`The bundle worker exited with code ${child.exitCode} during startup.`)
			}

			try {
				const res = await fetch(`http://127.0.0.1:${port}`)

				if (res.ok) {
					return
				}
			} catch (_) {}

			await new Promise(resolve => setTimeout(resolve, 50))
		}

		throw new Error('The bundle worker never became ready.')
	}

	const start = async () => {
		const entry = join(props.buildDir, 'worker.mjs')

		await writeFile(entry, WORKER_ENTRY)

		port = await findFreePort()
		// Piped instead of inherited: a node child that inherits the tty
		// snapshots its termios at spawn & restores it on exit - so a
		// worker spawned during the boot spinner's raw mode would put
		// the terminal back into raw mode on every reload, killing
		// ctrl-c.
		child = spawn('node', ['--enable-source-maps', entry], {
			cwd: props.buildDir,
			stdio: ['ignore', 'pipe', 'pipe'],
			env: {
				PATH: process.env.PATH,
				...props.env,
				AWSLESS_DEV_WORKER_PORT: String(port),
			},
		})

		child.stdout?.on('data', chunk => process.stdout.write(chunk))
		child.stderr?.on('data', chunk => process.stderr.write(chunk))

		child.on('exit', code => {
			if (code !== null && code !== 0) {
				debug(`Bundle worker exited with code ${code}`)
			}
		})

		await waitForReady()
	}

	const stop = async () => {
		await stopChild(child)
		child = undefined
	}

	return {
		start,
		stop,
		async restart() {
			await stop()
			await start()
		},
		async dispatch(event) {
			if (!port) {
				throw new Error('The bundle worker is not running.')
			}

			const res = await fetch(`http://127.0.0.1:${port}`, {
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
		},
	}
}
