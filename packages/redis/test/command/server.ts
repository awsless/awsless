import { createRedisClient, mockRedis, redis } from '../../src'

describe('Server', () => {
	mockRedis()

	const client = createRedisClient({})

	it('time', async () => {
		const result = await redis.server.time(client)

		expect(result).toBeInstanceOf(Date)
		expectTypeOf(result).toEqualTypeOf<Date>()
	})

	it('flushAll', async () => {
		await redis.string.set(client, 'a', 1)

		const result = await redis.server.flushAll(client)

		expect(result).toBeUndefined()
		expectTypeOf(result).toBeVoid()
	})

	it('swap', async () => {
		await redis.string.set(client, 'a', 1)

		const result = await redis.server.swap(client, 0, 1)

		expect(result).toBeUndefined()
		expectTypeOf(result).toBeVoid()

		const result2 = await redis.db.size(client)
		expect(result2).toBe(0)
	})

	// it('info', async () => {
	// 	const result = await redis.server.info(client)

	// 	console.log(result)

	// 	expect(result.server.redis_version).toBeTypeOf('string')
	// 	expectTypeOf(result).toEqualTypeOf<Info>()
	// })

	// it('info section', async () => {
	// 	const result = await redis.server.info(client, 'server')

	// 	expect(result.server.redis_version).toBeTypeOf('string')
	// 	expect(result.clients).toBeUndefined()
	// 	expectTypeOf(result).toEqualTypeOf<Info>()
	// })
})
