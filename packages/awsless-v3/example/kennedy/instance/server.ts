import { seconds } from '@awsless/duration'
import { subscribe } from '@awsless/sqs'
import { serve, ServerType } from '@hono/node-server'
import { Hono } from 'hono'
import { getQueueName } from '../../../src/server'

let server: ServerType | undefined
let unsub: () => void = () => {}

try {
	unsub = subscribe({
		queue: getQueueName('test'),
		maxMessages: 10,
		waitTime: seconds(20),
		visibilityTimeout: seconds(60),
		handleMessage({ payload }) {
			console.log(payload)
		},
	})
} catch (error) {
	console.log(
		JSON.stringify({
			message: 'Queue subscription failed',
			error,
		})
	)

	unsub()
	server?.close()

	throw error
}

// --------------------------------------

const app = new Hono().get('/health', (c: any) => {
	return c.text('OK')
})

server = serve({ fetch: app.fetch, port: 80 }, (info: any) => {
	console.log(`Http server for health check is running on port ${info.port}`)
})

const shutdown = () => {
	unsub()
	server?.close()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export { app, server }
