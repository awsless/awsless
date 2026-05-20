import { StringNumericLiteral } from '@awsless/big-float'
import { createRedisClient, mockRedis, redis } from '../../src'

describe('Map', () => {
	mockRedis()

	const client = createRedisClient({})

	it('set', async () => {
		const result = await redis.map.set(client, 'key', 'field', 1)
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()
	})

	it('get', async () => {
		const result = await redis.map.get(client, 'key', 'field')
		expect(result).toBe('1')
		expectTypeOf(result).toEqualTypeOf<string | undefined>()
	})

	it('has', async () => {
		const result = await redis.map.has(client, 'key', 'field')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()
	})

	it('incr', async () => {
		const result = await redis.map.incr(client, 'key', 'field', 1)
		expect(result).toBe('2')
		expectTypeOf(result).toEqualTypeOf<StringNumericLiteral>()
	})

	it('decr', async () => {
		const result = await redis.map.decr(client, 'key', 'field', 1)
		expect(result).toBe('1')
		expectTypeOf(result).toEqualTypeOf<StringNumericLiteral>()
	})

	it('length', async () => {
		const result = await redis.map.length(client, 'key')
		expect(result).toBe(1)
		expectTypeOf(result).toBeNumber()
	})

	it('all', async () => {
		const result = await redis.map.all(client, 'key')

		expect(result).toStrictEqual(new Map([['field', '1']]))
		expectTypeOf(result).toEqualTypeOf<Map<string, string>>()
	})

	it('scan', async () => {
		const result = await redis.map.scan(client, 'key')

		expect(result).toStrictEqual({
			cursor: undefined,
			items: new Map([['field', '1']]),
		})

		expectTypeOf(result).toEqualTypeOf<{
			cursor: string | undefined
			items: Map<string, string>
		}>()
	})

	it('scan iterate', async () => {
		for await (const items of redis.map.scan(client, 'key')) {
			expect(items).toStrictEqual(new Map([['field', '1']]))
			expectTypeOf(items).toEqualTypeOf<Map<string, string>>()
		}
	})

	it('delete', async () => {
		const result = await redis.map.delete(client, 'key', 'field')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()

		const value = await redis.map.get(client, 'key', 'field')
		expect(value).toBeUndefined()
	})

	it('clear', async () => {
		await redis.map.set(client, 'key', 'field-1', 1)
		await redis.map.set(client, 'key', 'field-2', 1)
		await redis.map.set(client, 'key', 'field-3', 1)

		const result = await redis.map.clear(client, 'key')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()

		const length = await redis.map.length(client, 'key')
		expect(length).toBe(0)
	})

	// describe('ttl', () => {
	// 	it('set', async () => {
	// 		await redis.map.set(client, 'key', 'field', 1)
	// 		const result = await redis.map.ttl.set(client, 'key', hours(1), 'field')
	// 		expect(result).toStrictEqual([true])
	// 	})

	// 	it('get', async () => {
	// 		const result = await redis.map.ttl.get(client, 'key', 'field')
	// 		expect(result).toStrictEqual([new Date()])
	// 	})

	// 	it('duration', async () => {
	// 		const result = await redis.map.ttl.duration(client, 'key', 'field')
	// 		expect(result).toStrictEqual([new Date()])
	// 	})

	// 	it('delete', async () => {
	// 		const result = await redis.map.ttl.delete(client, 'key', 'field')
	// 		expect(result).toBe(true)

	// 		const ttl = await redis.map.ttl.get(client, 'key', 'field')
	// 		expect(ttl).toBeUndefined()
	// 	})
	// })
})
