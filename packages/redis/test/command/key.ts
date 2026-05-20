import { createRedisClient, mockRedis, redis } from '../../src'

describe('Key', () => {
	mockRedis()

	const client = createRedisClient({})

	it('has', async () => {
		await redis.string.set(client, 'key', 'value')

		const result = await redis.key.has(client, 'key')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()
	})

	it('has missing', async () => {
		const result = await redis.key.has(client, 'missing-key')
		expect(result).toBe(false)
		expectTypeOf(result).toBeBoolean()
	})

	it('type', async () => {
		const result = await redis.key.type(client, 'key')
		expect(result).toBe('string')
		expectTypeOf(result).toEqualTypeOf<redis.key.KeyType>()
	})

	it('type missing', async () => {
		const result = await redis.key.type(client, 'missing-key')
		expect(result).toBe('none')
		expectTypeOf(result).toEqualTypeOf<redis.key.KeyType>()
	})

	it('rename', async () => {
		const result = await redis.key.rename(client, 'key', 'renamed-key')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()

		const value = await redis.string.get(client, 'renamed-key')
		expect(value).toBe('value')
	})

	it('rename not-exists', async () => {
		await redis.string.set(client, 'target-key', 'target')

		const result = await redis.key.rename(client, 'renamed-key', 'target-key', {
			when: 'not-exists',
		})

		expect(result).toBe(false)
		expectTypeOf(result).toBeBoolean()

		const source = await redis.string.get(client, 'renamed-key')
		const target = await redis.string.get(client, 'target-key')
		expect(source).toBe('value')
		expect(target).toBe('target')
	})

	it('delete', async () => {
		const result = await redis.key.delete(client, 'renamed-key')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()

		const exists = await redis.key.has(client, 'renamed-key')
		expect(exists).toBe(false)
	})
})
