import { Duration, hours } from '@awsless/duration'
import { createRedisClient, mockRedis, redis } from '../../src'

describe('TTL', () => {
	mockRedis()
	const client = createRedisClient({})

	it('set', async () => {
		await redis.string.set(client, 'key', 1)
		const result = await redis.ttl.set(client, 'key', hours(1))
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()
	})

	it('get', async () => {
		const result = await redis.ttl.get(client, 'key')
		expect(result).toBeInstanceOf(Date)
		expectTypeOf(result).toEqualTypeOf<Date | undefined>()
	})

	it('duration', async () => {
		const result = await redis.ttl.duration(client, 'key')
		expect(result).toBeInstanceOf(Duration)
		expectTypeOf(result).toEqualTypeOf<Duration | undefined>()
	})

	it('delete', async () => {
		const result = await redis.ttl.delete(client, 'key')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()

		const ttl = await redis.ttl.get(client, 'key')
		expect(ttl).toBeUndefined()
	})
})
