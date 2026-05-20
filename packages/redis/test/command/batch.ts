import { createRedisClient, mockRedis, redis } from '../../src'

describe('Batch', () => {
	mockRedis()

	const client = createRedisClient({})

	it('batch set', async () => {
		const result = await redis.batch(client, [
			//
			redis.string.set(client, 'key-1', 'value'),
			redis.string.set(client, 'key-2', 'value'),
			redis.string.set(client, 'key-3', 'value'),
		])

		expect(result).toStrictEqual([true, true, true])
		expectTypeOf(result).toEqualTypeOf<[boolean, boolean, boolean]>()
	})

	it('batch get', async () => {
		const result = await redis.batch(client, [
			//
			redis.string.get(client, 'key-1'),
			redis.string.get(client, 'key-2'),
			redis.string.get(client, 'key-3'),
		])

		expect(result).toStrictEqual(['value', 'value', 'value'])
		expectTypeOf(result).toEqualTypeOf<
			//
			[string | undefined, string | undefined, string | undefined]
		>()
	})
})
