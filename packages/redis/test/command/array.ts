import { createRedisClient, mockRedis, redis } from '../../src'

describe('Array', () => {
	mockRedis()

	const client = createRedisClient({})

	it('append', async () => {
		const result = await redis.array.append(client, 'key', 4, 5, 6)
		expect(result).toBe(3)
		expectTypeOf(result).toBeNumber()
	})

	it('prepend', async () => {
		const result = await redis.array.prepend(client, 'key', 1, 2, 3)
		expect(result).toBe(6)
		expectTypeOf(result).toBeNumber()
	})

	it('replace', async () => {
		const result = await redis.array.replace(client, 'key', 0, 1)
		expect(result).toBeUndefined()
		expectTypeOf(result).toBeVoid()
	})

	it('insertBefore', async () => {
		const result = await redis.array.insertBefore(client, 'key', 3, 'before-3')
		expect(result).toBe(7)
		expectTypeOf(result).toBeNumber()

		const list = await redis.array.range(client, 'key', 0, -1)
		expect(list).toStrictEqual(['1', '2', 'before-3', '3', '4', '5', '6'])
	})

	it('insertAfter', async () => {
		const result = await redis.array.insertAfter(client, 'key', 3, 'after-3')
		expect(result).toBe(8)
		expectTypeOf(result).toBeNumber()

		const list = await redis.array.range(client, 'key', 0, -1)
		expect(list).toStrictEqual(['1', '2', 'before-3', '3', 'after-3', '4', '5', '6'])
	})

	it('insertBefore missing pivot', async () => {
		const result = await redis.array.insertBefore(client, 'key', 'unknown', 'value')
		expect(result).toBe(-1)
		expectTypeOf(result).toBeNumber()
	})

	it('at', async () => {
		const result = await redis.array.at(client, 'key', 0)
		expect(result).toBe('1')
		expectTypeOf(result).toEqualTypeOf<string | undefined>()
	})

	it('indexOf', async () => {
		const result = await redis.array.indexOf(client, 'key', 4)
		expect(result).toBe(5)
		expectTypeOf(result).toEqualTypeOf<number | undefined>()
	})

	it('has', async () => {
		const result = await redis.array.has(client, 'key', 2)
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()
	})

	it('length', async () => {
		const result = await redis.array.length(client, 'key')
		expect(result).toBe(8)
		expectTypeOf(result).toBeNumber()
	})

	it('range', async () => {
		const result = await redis.array.range(client, 'key', 2, 4)

		expect(result).toStrictEqual(['before-3', '3', 'after-3'])
		expectTypeOf(result).toEqualTypeOf<string[]>()
	})

	it('all', async () => {
		const result = await redis.array.all(client, 'key')

		expect(result).toStrictEqual(['1', '2', 'before-3', '3', 'after-3', '4', '5', '6'])
		expectTypeOf(result).toEqualTypeOf<string[]>()
	})

	it('scan', async () => {
		const result = await redis.array.scan(client, 'key')

		expect(result).toStrictEqual({
			cursor: undefined,
			items: ['1', '2', 'before-3', '3', 'after-3', '4', '5', '6'],
		})

		expectTypeOf(result).toEqualTypeOf<{
			cursor: number | undefined
			items: string[]
		}>()
	})

	it('scan iterate', async () => {
		const result: string[][] = []

		for await (const items of redis.array.scan(client, 'key', { limit: 3 })) {
			result.push(items)

			expectTypeOf(items).toEqualTypeOf<string[]>()
		}

		expect(result).toStrictEqual([
			['1', '2', 'before-3'],
			['3', 'after-3', '4'],
			['5', '6'],
		])
	})

	it('pop', async () => {
		const result = await redis.array.pop(client, 'key')

		expect(result).toBe('6')
		expectTypeOf(result).toEqualTypeOf<string | undefined>()

		const list = await redis.array.scan(client, 'key')

		expect(list).toStrictEqual({
			cursor: undefined,
			items: ['1', '2', 'before-3', '3', 'after-3', '4', '5'],
		})
	})

	it('shift', async () => {
		const result = await redis.array.shift(client, 'key')

		expect(result).toBe('1')
		expectTypeOf(result).toEqualTypeOf<string | undefined>()

		const list = await redis.array.scan(client, 'key')

		expect(list).toStrictEqual({
			cursor: undefined,
			items: ['2', 'before-3', '3', 'after-3', '4', '5'],
		})
	})

	it('delete', async () => {
		await redis.array.append(client, 'delete-key', 1, 2, 1, 3, 1)

		const result = await redis.array.delete(client, 'delete-key', 1)
		expect(result).toBe(3)
		expectTypeOf(result).toBeNumber()

		const list = await redis.array.range(client, 'delete-key', 0, -1)
		expect(list).toStrictEqual(['2', '3'])
	})

	it('delete count', async () => {
		await redis.array.append(client, 'delete-count-key', 1, 2, 1, 3, 1)

		const result = await redis.array.delete(client, 'delete-count-key', 1, { count: 2 })
		expect(result).toBe(2)
		expectTypeOf(result).toBeNumber()

		const list = await redis.array.range(client, 'delete-count-key', 0, -1)
		expect(list).toStrictEqual(['2', '3', '1'])
	})

	it('delete missing value', async () => {
		const result = await redis.array.delete(client, 'key', 'unknown')
		expect(result).toBe(0)
		expectTypeOf(result).toBeNumber()
	})

	it('clear', async () => {
		const result = await redis.array.clear(client, 'key')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()

		const length = await redis.array.length(client, 'key')
		expect(length).toBe(0)
	})
})
