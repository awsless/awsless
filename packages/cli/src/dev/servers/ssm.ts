import { readFile } from 'fs/promises'
import { createServer, Server } from 'http'
import { readBody, trackConnections } from '../util.js'

// A minimal SSM emulator that only supports the GetParameters call the
// awsless config runtime uses. Values come from a local json file, so
// the file is read fresh on every request.
export const createSsmServer = (props: { file: string }) => {
	let server: Server | undefined
	let closeServer: (() => Promise<void>) | undefined
	let log: ((message: string) => void) | undefined

	const warned = new Set<string>()

	// The in-memory layer under the local file: the values pulled from
	// ssm on boot. They never touch disk.
	let pulled: Record<string, string> = {}

	const loadValues = async (): Promise<Record<string, string>> => {
		try {
			return JSON.parse(await readFile(props.file, 'utf8'))
		} catch (_) {
			return {}
		}
	}

	return {
		// Rebinds every dev run, since the server itself is pooled across
		// config restarts.
		setValues(next: { pulled: Record<string, string>; log?: (message: string) => void }) {
			pulled = next.pulled
			log = next.log ?? log
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

					res.writeHead(400, { 'content-type': 'application/x-amz-json-1.1' })
					res.end(
						JSON.stringify({
							__type: 'InvalidAction',
							message: error instanceof Error ? error.message : String(error),
						})
					)
				}

				void readBody(req)
					.then(async body => {
						const target = req.headers['x-amz-target']

						if (target !== 'AmazonSSM.GetParameters') {
							res.writeHead(400, { 'content-type': 'application/x-amz-json-1.1' })
							res.end(
								JSON.stringify({
									__type: 'InvalidAction',
									message: `The local dev SSM emulator only supports GetParameters, got: ${target}`,
								})
							)
							return
						}

						const { Names } = JSON.parse(body.toString() || '{}') as { Names?: string[] }
						const values = await loadValues()

						const parameters: { Name: string; Type: string; Value: string }[] = []

						for (const name of Names ?? []) {
							// Config parameters live at /.awsless/<app>/<name>
							const key = name.split('/').at(-1)!

							// A local override always wins & the pulled ssm value
							// fills the gaps.
							const value = values[key] ?? pulled[key]

							if (typeof value === 'string') {
								parameters.push({ Name: name, Type: 'SecureString', Value: value })
							} else if (!warned.has(key)) {
								// A missing value is deliberately NOT an invalid
								// parameter, so the worker boots & only fails when a
								// handler actually reads the missing config value.
								warned.add(key)
								log?.(
									`The "${key}" config has no value - the ssm pull didn't provide one. Set it with "awsless config set ${key}" or on the dashboard.`
								)
							}
						}

						res.writeHead(200, { 'content-type': 'application/x-amz-json-1.1' })
						res.end(JSON.stringify({ Parameters: parameters, InvalidParameters: [] }))
					})
					.catch(fail)
			})

			await new Promise<void>((resolve, reject) => {
				server!.once('error', reject)
				closeServer = trackConnections(server!)
				server!.listen(port, '127.0.0.1', () => resolve())
			})

			return (server.address() as { port: number }).port
		},
		stop() {
			return closeServer?.() ?? Promise.resolve()
		},
	}
}
