import { redisClient } from './client'
import type { Redis, RedisOptions } from 'ioredis'

export const command = async <T>(options: RedisOptions, callback: (client:Redis) => T): Promise<T> => {
	const client = redisClient(options)

	let result:T | undefined

	try {
		result = await callback(client)
	} catch (error) {
		throw error
	} finally {
		await client.disconnect()
	}

	return result
}
