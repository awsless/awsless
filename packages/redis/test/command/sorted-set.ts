import { createRedisClient, mockRedis, redis } from '../../src'

describe('SortedSet', () => {
	mockRedis()

	const client = createRedisClient({})

	it('add', async () => {
		const result = await redis.sortedSet.add(client, 'key', ['one', 1], ['two', 2], ['three', 3], ['highest', 4])
		expect(result).toBe(4)
		expectTypeOf(result).toBeNumber()
	})

	it('incr', async () => {
		const result = await redis.sortedSet.incr(client, 'key', 'highest', 3.33)
		expect(result).toBe(7.33)
		expectTypeOf(result).toBeNumber()
	})

	it('score', async () => {
		const result = await redis.sortedSet.score(client, 'key', 'highest')
		expect(result).toBe(7.33)
		expectTypeOf(result).toEqualTypeOf<number | undefined>()
	})

	it('score missing', async () => {
		const result = await redis.sortedSet.score(client, 'key', 'unknown')
		expect(result).toBeUndefined()
		expectTypeOf(result).toEqualTypeOf<number | undefined>()
	})

	it('has true', async () => {
		const result = await redis.sortedSet.has(client, 'key', 'one')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()
	})

	it('has true for rank zero', async () => {
		await redis.sortedSet.add(client, 'rank-zero-key', ['first', 1], ['second', 2])

		const result = await redis.sortedSet.has(client, 'rank-zero-key', 'first')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()
	})

	it('has false', async () => {
		const result = await redis.sortedSet.has(client, 'key', 'unknown')
		expect(result).toBe(false)
		expectTypeOf(result).toBeBoolean()
	})

	it('length', async () => {
		const result = await redis.sortedSet.length(client, 'key')
		expect(result).toBe(4)
		expectTypeOf(result).toBeNumber()
	})

	it('random', async () => {
		const result = await redis.sortedSet.random(client, 'key')
		expect(result).toBeTypeOf('string')
		expectTypeOf(result).toEqualTypeOf<string | undefined>()
	})

	it('random count = 2', async () => {
		const result = await redis.sortedSet.random(client, 'key', 2)
		expect(result).toStrictEqual([
			//
			expect.any(String),
			expect.any(String),
		])

		expectTypeOf(result).toEqualTypeOf<string[]>()
	})

	it('range by score', async () => {
		const result = await redis.sortedSet.rangeByScore(client, 'key', 0, Infinity)
		expect(result).toStrictEqual(['one', 'two', 'three', 'highest'])
		expectTypeOf(result).toEqualTypeOf<string[]>()
	})

	it('range by score with scores', async () => {
		const result = await redis.sortedSet.rangeByScore(client, 'key', 0, Infinity, { withScores: true })
		expect(result).toStrictEqual([
			['one', 1],
			['two', 2],
			['three', 3],
			['highest', 7.33],
		])
		expectTypeOf(result).toEqualTypeOf<[string, number][]>()
	})

	it('range by rank', async () => {
		const result = await redis.sortedSet.rangeByRank(client, 'key', 1, 2)
		expect(result).toStrictEqual(['two', 'three'])
		expectTypeOf(result).toEqualTypeOf<string[]>()
	})

	it('range by rank with scores', async () => {
		const result = await redis.sortedSet.rangeByRank(client, 'key', 1, 2, { withScores: true })
		expect(result).toStrictEqual([
			['two', 2],
			['three', 3],
		])
		expectTypeOf(result).toEqualTypeOf<[string, number][]>()
	})

	it('range by rank reverse', async () => {
		const result = await redis.sortedSet.rangeByRank(client, 'key', 1, 2, { reverse: true })
		expect(result).toStrictEqual(['three', 'two'])
		expectTypeOf(result).toEqualTypeOf<string[]>()
	})

	it('range by lex', async () => {
		await redis.sortedSet.add(client, 'lex-key', ['alpha', 1], ['bravo', 1], ['charlie', 1], ['delta', 1])

		const result = await redis.sortedSet.rangeByLex(client, 'lex-key', '[bravo', '[charlie')
		expect(result).toStrictEqual(['bravo', 'charlie'])
		expectTypeOf(result).toEqualTypeOf<string[]>()
	})

	it('range by score reverse', async () => {
		await redis.sortedSet.add(client, 'reverse-key', ['one', 1], ['two', 2], ['three', 3])

		const result = await redis.sortedSet.rangeByScore(client, 'reverse-key', 0, Infinity, {
			reverse: true,
		})
		expect(result).toStrictEqual(['three', 'two', 'one'])
		expectTypeOf(result).toEqualTypeOf<string[]>()
	})

	it('range by score reverse with scores', async () => {
		await redis.sortedSet.add(client, 'reverse-score-key', ['one', 1], ['two', 2], ['three', 3])

		const result = await redis.sortedSet.rangeByScore(client, 'reverse-score-key', 0, Infinity, {
			reverse: true,
			withScores: true,
		})

		expect(result).toStrictEqual([
			['three', 3],
			['two', 2],
			['one', 1],
		])
		expectTypeOf(result).toEqualTypeOf<[string, number][]>()
	})

	it('all', async () => {
		const result = await redis.sortedSet.all(client, 'key')

		expect(result).toStrictEqual(['one', 'two', 'three', 'highest'])
		expectTypeOf(result).toEqualTypeOf<string[]>()
	})

	it('all with scores', async () => {
		const result = await redis.sortedSet.all(client, 'key', { withScores: true })

		expect(result).toStrictEqual([
			['one', 1],
			['two', 2],
			['three', 3],
			['highest', 7.33],
		])
		expectTypeOf(result).toEqualTypeOf<[string, number][]>()
	})

	it('scan', async () => {
		const result = await redis.sortedSet.scan(client, 'key')

		expect(result).toStrictEqual({
			cursor: undefined,
			items: [
				['one', 1],
				['two', 2],
				['three', 3],
				['highest', 7.33],
			],
		})

		expectTypeOf(result).toEqualTypeOf<{
			cursor: string | undefined
			items: [string, number][]
		}>()
	})

	it('scan iterate', async () => {
		const result: [string, number][][] = []

		for await (const items of redis.sortedSet.scan(client, 'key', { limit: 1 })) {
			result.push(items)
			expectTypeOf(items).toEqualTypeOf<[string, number][]>()
		}

		expect(result).toStrictEqual([
			[
				['one', 1],
				['two', 2],
				['three', 3],
				['highest', 7.33],
			],
		])
	})

	it('pop max', async () => {
		const result = await redis.sortedSet.pop(client, 'key', 'max')
		expect(result).toStrictEqual(['highest', 7.33])
		expectTypeOf(result).toEqualTypeOf<[string, number] | undefined>()
	})

	it('pop min', async () => {
		const result = await redis.sortedSet.pop(client, 'key', 'min')
		expect(result).toStrictEqual(['one', 1])
		expectTypeOf(result).toEqualTypeOf<[string, number] | undefined>()
	})

	it('pop empty', async () => {
		const result = await redis.sortedSet.pop(client, 'empty-key', 'min')
		expect(result).toBeUndefined()
		expectTypeOf(result).toEqualTypeOf<[string, number] | undefined>()
	})

	it('pop multiple', async () => {
		const result = await redis.sortedSet.pop(client, 'key', 'min', 2)
		expect(result).toStrictEqual([
			['two', 2],
			['three', 3],
		])
		expectTypeOf(result).toEqualTypeOf<[string, number][]>()
	})

	it('delete', async () => {
		await redis.sortedSet.add(client, 'key', ['one', 1], ['two', 1])
		const result = await redis.sortedSet.delete(client, 'key', 'one', 'two')
		expect(result).toBe(2)
		expectTypeOf(result).toBeNumber()
	})

	it('clear', async () => {
		await redis.sortedSet.add(client, 'key', ['one', 1], ['two', 1])

		const result = await redis.sortedSet.clear(client, 'key')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()

		const length = await redis.sortedSet.length(client, 'key')
		expect(length).toBe(0)
	})
})
