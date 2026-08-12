import { stringify } from '@awsless/json'
import { lambda } from '@awsless/lambda'
import { maxLength, minLength, object, optional, pipe, string, unknown } from '@awsless/validate'
import { Redis } from 'ioredis'

const createClient = () => {
	return new Redis({
		host: process.env.REDIS_HOST!,
		port: Number(process.env.REDIS_PORT ?? 6379),
		tls: {},
		lazyConnect: true,
		keepAlive: 0,
		noDelay: true,
		enableReadyCheck: false,
		maxRetriesPerRequest: 3,
		connectTimeout: 5000,
		commandTimeout: 5000,
	})
}

export default lambda({
	schema: object({
		topic: pipe(string(), minLength(1), maxLength(128)),
		event: pipe(string(), minLength(1), maxLength(64)),
		payload: optional(unknown()),
	}),
	async handle({ topic, event, payload }, ctx) {
		const redis = createClient()

		ctx.onFinally(() => {
			return redis.quit().catch(() => {
				redis.disconnect()
			})
		})

		await redis.publish(
			process.env.CHANNEL!,
			stringify({
				topic,
				event,
				payload: typeof payload === 'undefined' ? undefined : stringify(payload),
			})
		)
	},
})
