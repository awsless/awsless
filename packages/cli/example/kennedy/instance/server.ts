import { seconds } from '@awsless/duration'
import { subscribe } from '@awsless/sqs'
import { serve, ServerType } from '@hono/node-server'
import { Hono } from 'hono'
import { getQueueName } from 'awsless'

let server: ServerType | undefined
const ac = new AbortController()

;(async () => {
	try {
		for await (const records of subscribe({
			queue: getQueueName('test'),
			maxMessages: 10,
			waitTime: seconds(20),
			visibilityTimeout: seconds(60),
			signal: ac.signal,
		})) {
			for (const { payload } of records) {
				console.log(payload)
			}
		}
	} catch (error) {
		console.log(
			JSON.stringify({
				message: 'Queue subscription failed',
				error,
			})
		)

		ac.abort()
		server?.close()
	}
})()

// --------------------------------------

const app = new Hono().get('/health', (c: any) => {
	return c.text('OK')
})

server = serve({ fetch: app.fetch, port: 80 }, (info: any) => {
	console.log(`Http server for health check is running on port ${info.port}`)
})

const shutdown = () => {
	ac.abort()
	server?.close()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export { app, server }
