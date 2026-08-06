import { toMilliSeconds } from '@awsless/duration'
import { randomUUID } from 'node:crypto'
import { connect, disconnect, subscribe, unsubscribe } from './action'
import { authenticate } from './auth'
import { startRelay } from './relay'
import { SocketData } from './type'

const PORT = Number(process.env.PORT ?? 3000)
const ORIGIN_SECRET = process.env.ORIGIN_SECRET

// The time the client has to send the AUTH message
// before we close the connection.
const AUTH_TIMEOUT = 10_000

const getClientIp = (request: Request, server: Bun.Server<SocketData>) => {
	const forwarded = request.headers.get('x-forwarded-for')

	if (forwarded) {
		const ips = forwarded
			.split(',')
			.map(ip => ip.trim())
			.filter(Boolean)

		// CloudFront appends the real client ip, and our load balancer
		// appends the CloudFront edge ip behind it. Everything before
		// those two entries is client supplied and can't be trusted.

		if (ips.length >= 2) {
			return ips[ips.length - 2]
		}

		return ips[0]
	}

	return server.requestIP(request)?.address
}

const server = Bun.serve({
	port: PORT,
	routes: {
		'/health': () => {
			return new Response('ok')
		},
		'/': (request, server) => {
			// Only allow traffic that passed through our router.
			if (ORIGIN_SECRET && request.headers.get('x-origin-secret') !== ORIGIN_SECRET) {
				return new Response('Forbidden', { status: 403 })
			}

			const ip = getClientIp(request, server)

			if (!ip) {
				return new Response('Unable to determine the client address', { status: 400 })
			}

			// Browsers can't send custom headers on websocket connections.
			// Authentication happens with the first AUTH message instead.
			const upgraded = server.upgrade(request, {
				data: {
					id: randomUUID(),
					ip,
					authenticated: false,
					allowed: [],
				} satisfies SocketData,
			})

			if (!upgraded) {
				return new Response('Upgrade failed', { status: 500 })
			}

			return
		},
	},
	websocket: {
		data: {} as SocketData,
		sendPings: true,
		idleTimeout: 15,
		// Compression breaks in safari.
		perMessageDeflate: false,
		open(ws) {
			ws.data.authTimeout = setTimeout(() => {
				ws.close(4001, 'Authentication timeout')
			}, AUTH_TIMEOUT)
		},
		async message(ws, message) {
			if (typeof message !== 'string') {
				ws.close(4000, 'Invalid message payload')
				return
			}

			if (message === 'PING') {
				ws.send('PONG')
				return
			}

			const [action, ...rest] = message.split(' ')

			// ------------------------------------------------------
			// The first message needs to authenticate the connection.

			if (!ws.data.authenticated) {
				if (action !== 'AUTH' || ws.data.authenticating) {
					ws.close(4001, 'Not authenticated')
					return
				}

				ws.data.authenticating = true

				const token = rest.join(' ')
				const auth = await authenticate(token !== '' ? token : undefined)

				// The socket could have been closed while we
				// were waiting for the auth response.
				if (ws.readyState !== WebSocket.OPEN) {
					return
				}

				if (!auth.authorized) {
					ws.close(4001, auth.reason)
					return
				}

				clearTimeout(ws.data.authTimeout)

				ws.data.authenticated = true
				ws.data.authenticating = false
				ws.data.context = auth.context
				ws.data.allowed = auth.allowed

				// The auth handle can set a deadline for the session.
				ws.data.sessionTimeout = setTimeout(() => {
					ws.close(4002, 'Session expired')
				}, toMilliSeconds(auth.disconnectAfter))

				ws.sendText('ACK')

				connect(ws)
				return
			}

			// ------------------------------------------------------

			const topics = rest.join(' ').split(',')

			if (action === 'SUB') {
				subscribe(ws, topics)
				return
			}

			if (action === 'UNSUB') {
				unsubscribe(ws, topics)
				return
			}

			ws.close(4000, 'Invalid message payload')
			return
		},
		close(ws) {
			clearTimeout(ws.data.authTimeout)
			clearTimeout(ws.data.sessionTimeout)
			disconnect(ws)
		},
	},
})

const relay = startRelay(server)

process.on('SIGTERM', async () => {
	server.stop()
	await relay.stop()
	process.exit(0)
})

console.log(`Socket server running on port ${PORT}`)
