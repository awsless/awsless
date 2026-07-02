import { authenticate } from './auth'
import { connect, disconnect, subscribe, unsubscribe } from './action'
import { SocketData } from './type'
import EventEmitter from 'events'

const emitter = new EventEmitter()

setInterval(() => {
	emitter.emit('$interal', createInternalEventSource({ event: 'KA' }))
}, 5000)

const createInternalEventSource = (props: { event?: string; data?: string }) => {
	return `${props.event ? `event: ${props.event}\n` : ''}data: ${props.data ?? ''}\n\n`
}

const createMessage = (event: string, data?: unknown) => {
	return `${event} ${data ? JSON.stringify(data) : ''}`
}

const createEventSource = (data: string) => {
	return `data: ${data}\n\n`
}

const server = Bun.serve({
	routes: {
		// '/events': async (request, server) => {
		// 	const token = request.headers.get('authentication')
		// 	const auth = await authenticate(token)

		// 	if (!auth.authorized) {
		// 		return new Response(auth.reason, { status: 403 })
		// 	}

		// 	const url = new URL(request.url)
		// 	const topics = url.searchParams.getAll('subscribe')

		// 	server.timeout(request, 15000)

		// 	return new Response(
		// 		new ReadableStream({
		// 			async start(controller) {
		// 				console.log('CONNECTED')
		// 				controller.enqueue(
		// 					createInternalEventSource({
		// 						event: 'SETUP',
		// 						data: '5000',
		// 					})
		// 				)

		// 				const callback = (payload: unknown) => {
		// 					controller.enqueue(payload)
		// 					// console.log(payload)
		// 				}

		// 				emitter.on('$interal', callback)

		// 				for (const topic of topics) {
		// 					emitter.on(topic, callback)
		// 				}

		// 				request.signal.addEventListener('abort', () => {
		// 					console.log('DISCONNECTED')
		// 					emitter.off('$interal', callback)

		// 					for (const topic of topics) {
		// 						emitter.off(topic, callback)
		// 					}
		// 				})
		// 			},
		// 		}),
		// 		{
		// 			headers: {
		// 				'Access-Control-Allow-Origin': '*',
		// 				'Content-Type': 'text/event-stream',
		// 				'Cache-Control': 'no-cache',
		// 				Connection: 'keep-alive',
		// 			},
		// 		}
		// 	)
		// },
		'/ws': async (request, server) => {
			const token = request.headers.get('authentication')
			const auth = await authenticate(token)

			if (!auth.authorized) {
				return new Response(auth.reason, { status: 403 })
			}

			// const url = new URL(request.url)
			// const topics = url.searchParams.getAll('subscribe')

			const upgraded = server.upgrade(request, {
				data: {
					context: auth.context,
					allowed: auth.allowed,
					// topics,
				},
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
		// 'maxPayloadLength',
		// 'perMessageDeflate',
		// 'closeOnBackpressureLimit',
		// 'idleTimeout',
		open(ws) {
			connect(ws)
		},
		message(ws, message) {
			if (typeof message !== 'string') {
				ws.close(4000, 'Invalid message payload')
				return
			}

			if (message === 'PING') {
				ws.send('PONG')
				return
			}

			const [action, ...rest] = message.split(' ')
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
			disconnect(ws)
		},
		ping() {
			console.log(`Native ping`)
			// Note: Bun automatically replies with a pong under the hood.
		},
		// Intercept when the client replies to the server's ping
		pong() {
			console.log(`Native pong`)
		},
	},
})

console.log('Running...')

setInterval(() => {
	const topicEvent = createMessage('topic', Date.now())
	const otherEvent = createMessage('other', Date.now())

	emitter.emit('topic', createEventSource(topicEvent))
	emitter.emit('other', createEventSource(otherEvent))

	server.publish('topic', topicEvent)
	server.publish('other', otherEvent)
}, 3000)
