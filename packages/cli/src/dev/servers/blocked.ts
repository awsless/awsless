import { createServer, Server } from 'http'
import { trackConnections } from '../util.js'

// The generic AWS_ENDPOINT_URL points here, so a call to a service
// without an emulator fails loud instead of reaching the real aws.
export const createBlockedServer = (props: { onLog?: (message: string) => void }) => {
	let server: Server | undefined
	let closeServer: (() => Promise<void>) | undefined

	return {
		// Binds immediately on a free port & returns the actual port, so
		// a stale reserved port can never end up in the environment.
		async listen(port = 0) {
			server = createServer((req, res) => {
				req.resume()

				// The sigv4 credential scope names the called service:
				// Credential=key/date/region/<service>/aws4_request
				const auth = req.headers.authorization ?? ''
				const service =
					auth.match(/Credential=[^/]+\/[^/]+\/[^/]+\/([^/]+)\//)?.[1] ??
					String(req.headers['x-amz-target'] ?? 'unknown')

				const message = `The "${service}" aws service is not emulated by the local dev environment yet.`

				props.onLog?.(`Blocked aws call: ${service}`)

				res.writeHead(400, { 'content-type': 'application/x-amz-json-1.1' })
				res.end(JSON.stringify({ __type: 'NotEmulatedLocally', message }))
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
