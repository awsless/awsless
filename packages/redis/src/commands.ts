import { redisClient } from './client'
import type { RedisOptions } from 'ioredis'

export const command = async (options: RedisOptions, callback: Function) => {
	const client = redisClient(options)

	try {
		var result = await callback(client)
	} catch (error) {
		throw error
	} finally {
		await client.disconnect()
	}

	return result
}
