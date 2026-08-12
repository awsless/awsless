import { parse } from '@awsless/json'
import { Redis } from 'ioredis'
import { SocketData } from './type'

// The relay subscribes to the Redis pub/sub channel and forwards
// every published message to the locally connected sockets.

export const startRelay = (server: Bun.Server<SocketData>) => {
	const host = process.env.REDIS_HOST
	const port = Number(process.env.REDIS_PORT ?? 6379)
	const channel = process.env.CHANNEL

	if (!host || !channel) {
		console.warn('Relay disabled: missing REDIS_HOST or CHANNEL')

		return {
			async stop() {},
		}
	}

	const redis = new Redis({
		host,
		port,
		tls: {},
		keepAlive: 0,
		noDelay: true,
		enableReadyCheck: false,
		connectTimeout: 5000,
		retryStrategy(times) {
			// A silently disconnected relay would drop messages.
			// Crash the task when the subscription can't be re-established,
			// so that ECS replaces it with a fresh one.
			if (times > 20) {
				return null
			}

			return Math.min(times * 500, 5000)
		},
	})

	redis.on('error', error => {
		console.error('Relay redis error', error)
	})

	redis.on('end', () => {
		console.error('Relay redis connection ended')
		process.exit(1)
	})

	redis.subscribe(channel).catch(error => {
		console.error('Relay subscribe failed', error)
		process.exit(1)
	})

	redis.on('message', (_channel, json) => {
		let message: unknown

		try {
			message = parse(json)
		} catch {
			return
		}

		if (
			typeof message !== 'object' ||
			message === null ||
			!('topic' in message) ||
			typeof message.topic !== 'string' ||
			!('event' in message) ||
			typeof message.event !== 'string'
		) {
			return
		}

		const payload = 'payload' in message && typeof message.payload === 'string' ? message.payload : ''

		server.publish(message.topic, `${message.topic} ${message.event} ${payload}`)
	})

	return {
		async stop() {
			await redis.quit().catch(() => {})
		},
	}
}
