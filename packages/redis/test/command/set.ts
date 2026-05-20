import { createRedisClient, mockRedis, redis } from '../../src'

describe('Set', () => {
	mockRedis()

	const client = createRedisClient({})

	it('add', async () => {
		const result = await redis.set.add(client, 'key', 1, 2, 3, 4, 5)
		expect(result).toBe(5)
		expectTypeOf(result).toBeNumber()
	})

	it('has', async () => {
		const result = await redis.set.has(client, 'key', 2)
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()
	})

	it('length', async () => {
		const result = await redis.set.length(client, 'key')
		expect(result).toBe(5)
		expectTypeOf(result).toBeNumber()
	})

	it('random', async () => {
		const result = await redis.set.random(client, 'key')
		expect(result).toBeTypeOf('string')
		expectTypeOf(result).toEqualTypeOf<string | undefined>()
	})

	it('random count', async () => {
		const result = await redis.set.random(client, 'key', 2)
		expect(result).toBeInstanceOf(Set)
		expectTypeOf(result).toEqualTypeOf<Set<string>>()
	})

	it('all', async () => {
		const result = await redis.set.all(client, 'key')

		expect(result).toStrictEqual(new Set(['1', '2', '3', '4', '5']))
		expectTypeOf(result).toEqualTypeOf<Set<string>>()
	})

	it('scan', async () => {
		const result = await redis.set.scan(client, 'key')

		expect(result).toStrictEqual({
			cursor: undefined,
			items: new Set(['1', '2', '3', '4', '5']),
		})

		expectTypeOf(result).toEqualTypeOf<{
			cursor: string | undefined
			items: Set<string>
		}>()
	})

	it('scan iterate', async () => {
		const result: Set<string>[] = []

		for await (const items of redis.set.scan(client, 'key', { limit: 5 })) {
			result.push(items)
			expectTypeOf(items).toEqualTypeOf<Set<string>>()
		}

		expect(result).toStrictEqual([new Set(['1', '2', '3', '4', '5'])])
	})

	it('pop', async () => {
		const result = await redis.set.pop(client, 'key')
		expect(result).toBeTypeOf('string')
		expectTypeOf(result).toEqualTypeOf<string | undefined>()
	})

	it('pop count', async () => {
		const result = await redis.set.pop(client, 'key', 2)
		expect(result).toBeInstanceOf(Set)
		expectTypeOf(result).toEqualTypeOf<Set<string>>()
	})

	it('delete', async () => {
		const random = await redis.set.random(client, 'key')
		const result = await redis.set.delete(client, 'key', random!)
		expect(result).toBe(1)
		expectTypeOf(result).toBeNumber()
	})

	it('clear', async () => {
		const result = await redis.set.clear(client, 'key')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()

		const length = await redis.set.length(client, 'key')
		expect(length).toBe(0)
	})
})
