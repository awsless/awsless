import { ChildProcess } from 'child_process'
import { randomBytes } from 'crypto'
import { IncomingMessage, Server } from 'http'
import { createServer, Socket } from 'net'
import { join } from 'path'
import { DevTrace } from '../feature.js'
import { directories } from '../util/path.js'
import { killTree } from './children.js'

// The fake account every fully-local environment synthesizes with -
// the dev environment & the test runner share it.
export const LOCAL_ACCOUNT_ID = '000000000000'

// A tiny preload for every long lived child (instances, the pubsub ws
// server): when the dev server dies without a graceful stop (a crash,
// kill -9), the child gets reparented & exits on its own - the pid
// file reaper only runs on the next boot, while the watchdog cleans
// up even when dev is never started again. Loaded with -r, which both
// node & bun understand.
export const WATCHDOG_FILE = 'parent-watchdog.cjs'

export const WATCHDOG_SOURCE = `const parent = process.ppid
const timer = setInterval(() => {
	// Probing the parent instead of watching process.ppid: bun caches
	// the ppid at startup, so a reparenting is invisible there.
	try {
		process.kill(parent, 0)
	} catch (_) {
		process.exit(0)
	}
}, 2000)

// An unref'd timer never fires on bun, so only node children get the
// unref that lets them exit naturally.
if (typeof Bun === 'undefined') {
	timer.unref()
}
`

export const watchdogPath = () => {
	return join(directories.output, 'local', WATCHDOG_FILE)
}

// The request header carrying the active trace out of the bundle
// worker into the local emulators, as "traceId:spanId". The worker
// injects it into every outgoing loopback request, so a queue send or
// task invoke links the dispatch it causes back to its caller.
export const TRACE_HEADER = 'x-awsless-trace'

export const traceId = () => randomBytes(4).toString('hex')

export const formatTraceHeader = (trace: DevTrace) => `${trace.traceId}:${trace.spanId}`

export const parseTraceHeader = (value: unknown): DevTrace | undefined => {
	if (typeof value !== 'string') {
		return undefined
	}

	const [traceId, spanId] = value.split(':')

	return traceId && spanId ? { traceId, spanId } : undefined
}

// Reads a request body with an error listener attached: a request
// stream failing without one (like a reset connection) throws out of
// the emitter & takes down the whole dev process.
export const readBody = (req: IncomingMessage) => {
	return new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = []
		req.on('data', chunk => chunks.push(chunk))
		req.on('error', reject)
		req.on('end', () => resolve(Buffer.concat(chunks)))
	})
}

// Gracefully stops a spawned child process. A ctrl-c in the terminal
// signals the whole process group, so the child may already be dead by
// signal - node then keeps exitCode null forever (only signalCode is
// set), and waiting for its exit event would hang the shutdown. The
// kills walk the child's whole process tree, so grandchildren (like
// the bundler a vite dev server spawns) die with it.
const signalChild = (child: ChildProcess, signal: NodeJS.Signals) => {
	if (child.pid) {
		void killTree(child.pid, signal)
	} else {
		child.kill(signal)
	}
}

export const stopChild = async (child: ChildProcess | undefined, gracePeriod = 5000) => {
	if (child && child.exitCode === null && child.signalCode === null) {
		const exited = new Promise<void>(resolve => child.once('exit', () => resolve()))
		signalChild(child, 'SIGTERM')

		// A child that survives the sigterm (like a program with its own
		// signal handler & open keep-alive sockets) gets sigkilled after
		// the grace period, like ecs after its stop timeout - a restart
		// or shutdown must never hang on a child that won't exit.
		const timer = setTimeout(() => signalChild(child, 'SIGKILL'), gracePeriod)
		await exited
		clearTimeout(timer)
	}
}

// Bun's node:http closeAllConnections never destroys connections with
// an in-flight streaming response (like an sse stream) or idle browser
// keep-alives, hanging server.close forever. The sockets are tracked &
// destroyed manually, so stopping the dev environment never hangs on
// an open dashboard tab.
export const trackConnections = (server: Server) => {
	const sockets = new Set<Socket>()

	server.on('connection', socket => {
		sockets.add(socket)
		socket.once('close', () => sockets.delete(socket))
	})

	return () =>
		new Promise<void>(resolve => {
			server.close(() => resolve())
			server.closeAllConnections()

			for (const socket of sockets) {
				socket.destroy()
			}
		})
}

export const findFreePort = () => {
	return new Promise<number>((resolve, reject) => {
		const server = createServer()
		server.once('error', reject)
		server.listen(0, '127.0.0.1', () => {
			const port = (server.address() as { port: number }).port
			server.close(() => resolve(port))
		})
	})
}

// Decode an aws-chunked encoded body, which the sdk uses for payloads
// with flexible checksums: [hex-size];chunk-signature=...\r\n[data]\r\n
export const decodeAwsChunked = (body: Buffer) => {
	const chunks: Buffer[] = []
	let offset = 0

	while (offset < body.length) {
		const lineEnd = body.indexOf('\r\n', offset)

		if (lineEnd === -1) {
			break
		}

		const line = body.subarray(offset, lineEnd).toString()
		const size = parseInt(line.split(';')[0]!, 16)

		if (!Number.isFinite(size) || size === 0) {
			break
		}

		chunks.push(body.subarray(lineEnd + 2, lineEnd + 2 + size))
		offset = lineEnd + 2 + size + 2
	}

	return Buffer.concat(chunks)
}

// Terminal color & cursor escape codes mean nothing in the log views.
export const stripAnsi = (line: string) => {
	// eslint-disable-next-line no-control-regex
	return line.replaceAll(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
}
