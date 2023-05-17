import { Redis } from 'ioredis'

// This is an async call because the mock client is async
export const redisClient = async (host: string, port: number, db: number) => {
	return new Redis({
		host,
		port,
		db,
		stringNumbers: true,
		keepAlive: 0,
		noDelay: true,
		enableReadyCheck: false,
		maxRetriesPerRequest: null,
		autoResubscribe: false,
		autoResendUnfulfilledCommands: false,
		connectTimeout: 1000 * 5,
		commandTimeout: 1000 * 5,

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
