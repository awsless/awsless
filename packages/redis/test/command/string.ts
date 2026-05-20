import { StringNumericLiteral } from '@awsless/big-float'
import { hours } from '@awsless/duration'
import { createRedisClient, mockRedis, redis } from '../../src'

describe('String', () => {
	mockRedis()

	const client = createRedisClient({})

	describe('set', () => {
		it('set PXAT', async () => {
			const result = await redis.string.set(client, 'key', 1, {
				ttl: new Date('01-01-3000'),
			})

			expect(result).toBe(true)
			expectTypeOf(result).toBeBoolean()

			const ttl = await redis.ttl.get(client, 'key')
			expect(ttl).toBeInstanceOf(Date)
		})

		it('set PX', async () => {
			const result = await redis.string.set(client, 'key', 1, {
				ttl: hours(1),
			})

			expect(result).toBe(true)
			expectTypeOf(result).toBeBoolean()

			const ttl = await redis.ttl.get(client, 'key')
			expect(ttl).toBeInstanceOf(Date)
		})

		it('set KEEPTTL', async () => {
			const result = await redis.string.set(client, 'key', 1, {
				ttl: 'keep',
			})

			expect(result).toBe(true)
			expectTypeOf(result).toBeBoolean()

			const ttl = await redis.ttl.get(client, 'key')
			expect(ttl).toBeInstanceOf(Date)
		})
	})

	it('get', async () => {
		const result = await redis.string.get(client, 'key')
		expect(result).toBe('1')
		expectTypeOf(result).toEqualTypeOf<string | undefined>()
	})

	it('has', async () => {
		const result = await redis.string.has(client, 'key')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()
	})

	it('incr', async () => {
		const result = await redis.string.incr(client, 'key', 1)
		expect(result).toBe('2')
		expectTypeOf(result).toEqualTypeOf<StringNumericLiteral>()
	})

	it('decr', async () => {
		const result = await redis.string.decr(client, 'key', 1)
		expect(result).toBe('1')
		expectTypeOf(result).toEqualTypeOf<StringNumericLiteral>()
	})

	it('append', async () => {
		await redis.string.set(client, 'str', 'hello')
		const result = await redis.string.append(client, 'str', ' world')
		expect(result).toBe(11)
		expectTypeOf(result).toBeNumber()
	})

	it('substring', async () => {
		const result = await redis.string.substring(client, 'str', 2)
		expect(result).toBe('llo world')
		expectTypeOf(result).toBeString()
	})

	it('delete', async () => {
		const result = await redis.string.delete(client, 'key')
		expect(result).toBe(true)
		expectTypeOf(result).toBeBoolean()

		const value = await redis.string.get(client, 'key')
		expect(value).toBeUndefined()
	})
})
