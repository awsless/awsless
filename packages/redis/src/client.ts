import { Redis } from 'ioredis'
import type { RedisOptions } from 'ioredis'

let optionOverrides: RedisOptions = {}
export const overrideOptions = (options: RedisOptions) => {
	optionOverrides = options
}

export const redisClient = (options: RedisOptions) => {
	return new Redis({
		lazyConnect: true,
		stringNumbers: true,
		keepAlive: 0,
		noDelay: true,
		enableReadyCheck: false,
		maxRetriesPerRequest: 3,
		autoResubscribe: false,
		commandQueue: false,
		offlineQueue: false,
		autoResendUnfulfilledCommands: false,
		connectTimeout: 1000 * 5,
		commandTimeout: 1000 * 5,
		...options,
		...optionOverrides

		// retryStrategy: (times) => {
		// 	if (options.error && options.error.code === 'ECONNREFUSED') {
		// 		return new Error 'The redis server refused the connection'
		// 	}

		// 	if (options.total_retry_time > ( 1000 * 10 )) {
		// 		return new Error 'The redis retry time exhausted'
		// 	}

		// 	if (options.attempt > 10) {
		// 		return
		// 	}

		// 	return Math.min(options.attempt * 100, 3000)
		// },
	})
}
