import { createServer, Server } from 'http'
import { DevDispatch, DevReportFailure } from '../../feature.js'
import { readBody, trackConnections } from '../util.js'

// A minimal eventbridge scheduler emulator for delayed tasks: a
// CreateSchedule call dispatches the schedule's input into the bundle
// right away — waiting out a real delay makes no sense while developing
// locally, the handler is what you want to test.
export const createSchedulerServer = () => {
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
				// A bad body or read error answers 400 instead of throwing
				// out of the handler & killing the dev process.
				const fail = (error: unknown) => {
					if (res.writableEnded || res.destroyed) {
						return
					}

					res.writeHead(400, { 'content-type': 'application/json' })
					res.end(JSON.stringify({ message: error instanceof Error ? error.message : String(error) }))
				}

				void readBody(req)
					.then(body => {
						const match = req.url?.match(/^\/schedules\/([^/?]+)/)

						if (!match || req.method !== 'POST') {
							res.writeHead(400, { 'content-type': 'application/json' })
							res.end(
								JSON.stringify({
									message: 'The local dev scheduler emulator only supports CreateSchedule.',
								})
							)
							return
						}

						const name = decodeURIComponent(match[1]!)
						const input = JSON.parse(body.toString() || '{}') as {
							Target?: { Input?: string }
						}

						const payload = input.Target?.Input ? JSON.parse(input.Target.Input) : {}

						setImmediate(() => {
							dispatch?.(payload).catch(error => {
								const routeKey = (payload as { '$awsless-route'?: string })?.['$awsless-route']

								reportFailure?.({
									kind: 'async',
									routeKey: typeof routeKey === 'string' ? routeKey : undefined,
									event: (payload as { event?: unknown })?.event ?? payload,
									error,
								})
							})
						})

						res.writeHead(200, { 'content-type': 'application/json' })
						res.end(
							JSON.stringify({ ScheduleArn: `arn:aws:scheduler:local:000000000000:schedule/${name}` })
						)
					})
					.catch(fail)
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
