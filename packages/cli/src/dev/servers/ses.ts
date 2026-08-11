import { randomUUID } from 'crypto'
import { createServer, Server } from 'http'
import { trackConnections } from '../util.js'

export type CapturedEmail = {
	id: string
	date: number
	from?: string
	to: string[]
	subject?: string
	html?: string
}

// A minimal ses emulator: every SendEmail call is captured for the
// dashboard instead of being delivered.
export const createSesServer = () => {
	let server: Server | undefined
	let closeServer: (() => Promise<void>) | undefined

	const emails: CapturedEmail[] = []

	return {
		list() {
			return emails
		},
		async listen(port = 0) {
			server = createServer((req, res) => {
				const chunks: Buffer[] = []
				req.on('data', chunk => chunks.push(chunk))
				req.on('end', () => {
					let body: any = {}
					try {
						body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
					} catch (_) {}

					// The sesv2 SendEmail request shape - anything else is
					// accepted & ignored so unrelated calls never crash a
					// handler.
					emails.unshift({
						id: randomUUID(),
						date: Date.now(),
						from: body.FromEmailAddress,
						to: body.Destination?.ToAddresses ?? [],
						subject: body.Content?.Simple?.Subject?.Data,
						html: body.Content?.Simple?.Body?.Html?.Data,
					})

					res.writeHead(200, { 'content-type': 'application/json' })
					res.end(JSON.stringify({ MessageId: emails[0]!.id }))
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
