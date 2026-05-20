import { createRedisClient, mockRedis, redis } from '../../src'

describe('DB', () => {
	mockRedis()

	const client = createRedisClient({})

	it('size', async () => {
		await redis.string.set(client, 'a', 1)
		await redis.string.set(client, 'b', 2)
		await redis.string.set(client, 'c', 3)
		await redis.string.set(client, 'd', 4)

		const result = await redis.db.size(client)

		expect(result).toBe(4)
		expectTypeOf(result).toBeNumber()
	})

	it('flush', async () => {
		await redis.string.set(client, 'a', 1)

		const result = await redis.db.flush(client)

		expect(result).toBeUndefined()
		expectTypeOf(result).toBeVoid()
	})
})
