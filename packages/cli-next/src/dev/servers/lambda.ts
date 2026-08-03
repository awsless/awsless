import { createServer, Server } from 'http'
import { DevDispatch, DevReportFailure } from '../../feature.js'
import { WorkerError } from '../worker.js'
import { trackConnections } from '../util.js'

// A minimal lambda emulator that routes Invoke calls into the bundle
// worker. This carries the bundle's own sns fan-out self-invokes, the
// async task invokes & any code outside the bundle calling functions.
export const createLambdaServer = (props: { functionName: string }) => {
	let server: Server | undefined
	let closeServer: (() => Promise<void>) | undefined
	let dispatch: DevDispatch | undefined
	let reportFailure: DevReportFailure | undefined

	return {
		connect(dispatchFn: DevDispatch, reportFailureFn?: DevReportFailure) {
			dispatch = dispatchFn
			reportFailure = reportFailureFn
		},
		// Binds immediately on a free port & returns the actual port, so
		// a stale reserved port can never end up in the environment.
		async listen(port = 0) {
			server = createServer((req, res) => {
				const chunks: Buffer[] = []
				req.on('data', chunk => chunks.push(chunk))
				req.on('end', async () => {
					const match = req.url?.match(/^\/2015-03-31\/functions\/([^/]+)\/invocations/)

					if (!match || req.method !== 'POST') {
						res.writeHead(400, { 'content-type': 'application/json' })
						res.end(JSON.stringify({ message: `The local dev lambda emulator only supports Invoke.` }))
						return
					}

					// The name can be a bare name, name:qualifier or a full arn.
					const name = decodeURIComponent(match[1]!).split(':function:').at(-1)!.split(':')[0]!

					if (name !== props.functionName) {
						res.writeHead(404, { 'content-type': 'application/json' })
						res.end(
							JSON.stringify({
								message: `Unknown local function: ${name}. Only the app bundle runs locally.`,
							})
						)
						return
					}

					const type = String(req.headers['x-amz-invocation-type'] ?? 'RequestResponse')
					const event = JSON.parse(Buffer.concat(chunks).toString() || '{}')

					if (type === 'Event') {
						res.writeHead(202, { 'content-type': 'application/json' })
						res.end()

						dispatch?.(event).catch(error => {
							const routeKey = (event as { '$awsless-route'?: string })?.['$awsless-route']

							reportFailure?.({
								kind: 'async',
								routeKey: typeof routeKey === 'string' ? routeKey : undefined,
								event: (event as { event?: unknown })?.event ?? event,
								error,
							})
						})
						return
					}

					try {
						const result = await dispatch?.(event)

						res.writeHead(200, { 'content-type': 'application/json' })
						res.end(typeof result === 'undefined' || result === null ? '' : JSON.stringify(result))
					} catch (error) {
						const name = error instanceof WorkerError ? error.name : 'Error'
						const message = error instanceof Error ? error.message : String(error)

						res.writeHead(200, {
							'content-type': 'application/json',
							'x-amz-function-error': 'Unhandled',
						})
						res.end(JSON.stringify({ errorType: name, errorMessage: message, trace: [] }))
					}
				})
			})

			await new Promise<void>((resolve, reject) => {
				server!.once('error', reject)
				closeServer = trackConnections(server!)
				server!.listen(port, '127.0.0.1', () => resolve())
			})

			return (server!.address() as { port: number }).port
		},
		stop() {
			return closeServer?.() ?? Promise.resolve()
		},
	}
}
