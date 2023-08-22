import { Client, CommandOptions, redisClient } from './client'
// import type { Cluster, Redis, RedisOptions } from 'ioredis'

export const command = async <O extends CommandOptions, T>(options: O, callback: (client:Client<O>) => T): Promise<T> => {
	const client = redisClient(options)

	let result:T | undefined

	try {
		result = await callback(client)
	} catch (error) {
		throw error
	} finally {
		// await client.disconnect()
		await client.quit()
	}

	return result
}
