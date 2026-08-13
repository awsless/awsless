import { ChildProcess } from 'child_process'
import { IncomingMessage, Server } from 'http'
import { createServer, Socket } from 'net'

// The fake account every fully-local environment synthesizes with -
// the dev environment & the test runner share it.
export const LOCAL_ACCOUNT_ID = '000000000000'

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
// set), and waiting for its exit event would hang the shutdown.
export const stopChild = async (child: ChildProcess | undefined, gracePeriod = 5000) => {
	if (child && child.exitCode === null && child.signalCode === null) {
		const exited = new Promise<void>(resolve => child.once('exit', () => resolve()))
		child.kill()

		// A child that survives the sigterm (like a program with its own
		// signal handler & open keep-alive sockets) gets sigkilled after
		// the grace period, like ecs after its stop timeout - a restart
		// or shutdown must never hang on a child that won't exit.
		const timer = setTimeout(() => child.kill('SIGKILL'), gracePeriod)
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
