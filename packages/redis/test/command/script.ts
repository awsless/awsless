import { createHash } from 'crypto'
import { createRedisClient, mockRedis, redis } from '../../src'

describe('Script', () => {
	mockRedis()

	const client = createRedisClient({})
	const script = 'return ARGV[1]'

	it('eval', async () => {
		const result = await redis.script.eval(client, script, [], ['hello'])
		expect(result).toBe('hello')
		expectTypeOf(result).toBeUnknown()
	})

	it('evalSha', async () => {
		const hash = createHash('sha1').update(script).digest('hex')
		const result = await redis.script.evalSha(client, hash, [], ['world'])
		expect(result).toBe('world')
		expectTypeOf(result).toBeUnknown()
	})

	it('load', async () => {
		const result = await redis.script.load(client, script)
		const hash = createHash('sha1').update(script).digest('hex')

		expect(result).toBe(hash)
		expectTypeOf(result).toBeString()
	})

	it('exists', async () => {
		const hash = await redis.script.load(client, script)
		const missingHash = createHash('sha1').update('return "missing"').digest('hex')

		const result = await redis.script.exists(client, hash, missingHash)

		expect(result).toStrictEqual([true, false])
		expectTypeOf(result).toEqualTypeOf<boolean[]>()
	})

	it('flush', async () => {
		const hash = await redis.script.load(client, script)
		const result = await redis.script.flush(client)

		expect(result).toBeUndefined()
		expectTypeOf(result).toBeVoid()

		const exists = await redis.script.exists(client, hash)
		expect(exists).toStrictEqual([false])
	})

	it('define', async () => {
		const sum = redis.script.define<[number, number], string>({
			script: 'return ARGV[1] + ARGV[2]',
		})
		const result = await sum(client, 1, 2)
		expect(result).toBe('3')
		expectTypeOf(result).toBeString()
	})

	it('define keys', async () => {
		const sum = redis.script.define<[number, number], string>({
			script: 'return KEYS[1] + ARGV[1]',
			keys: 1,
		})

		const result = await sum(client, 1, 2)
		expect(result).toBe('3')
		expectTypeOf(result).toBeString()
	})

	it('define batch', async () => {
		const sum = redis.script.define<[number, number], string>({
			script: 'return ARGV[1] + ARGV[2]',
		})

		const result = await redis.batch(client, [
			//
			sum(client, 1, 2),
			sum(client, 2, 1),
			sum(client, 5, 5),
		])

		expect(result).toStrictEqual(['3', '3', '10'])
		expectTypeOf(result).toEqualTypeOf<[string, string, string]>()
	})

	it('lua', async () => {
		const sub = redis.script.lua`return ${10} - ${5}`
		const result = await sub<string>(client)
		expect(result).toBe('5')
		expectTypeOf(result).toBeString()
	})

	it('lua batch', async () => {
		const sub = redis.script.lua`return ${10} - ${5}`

		const result = await redis.batch(client, [
			//
			sub<string>(client),
			sub<string>(client),
			sub<string>(client),
		])

		expect(result).toStrictEqual(['5', '5', '5'])
		expectTypeOf(result).toEqualTypeOf<[string, string, string]>()
	})
})
