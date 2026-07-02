import {
	createLazyClient,
	createRedisClient,
	mockRedis,
	type InputValue,
	type RedisClient,
	type RedisCommandOptions,
} from '../src'

describe('Redis Client', () => {
	mockRedis()

	const client = createRedisClient({})

	it('send', async () => {
		await client.send('SET', ['key', 'value'])
		const result = await client.send('GET', ['key'])
		expect(result).toBe('value')
	})

	it('send readonly', async () => {
		await client.send('SET', ['readonly-key', 'value'])
		const result = await client.send('GET', ['readonly-key'], { readonly: true })
		expect(result).toBe('value')
	})

	it('forwards send command options through lazy client', async () => {
		const calls: unknown[] = []
		const redis: RedisClient = {
			send: async <T = any>(
				name: string,
				args: (InputValue | undefined)[],
				options?: RedisCommandOptions
			): Promise<T> => {
				calls.push({ name, args, options })
				return 'value' as T
			},
			batch: async <T = any[]>(): Promise<T> => [] as T,
			transact: async <T = any[]>(): Promise<T> => [] as T,
			destroy: async () => {},
		}

		const lazy = createLazyClient(() => redis)
		const result = await lazy.send('CUSTOM', ['key'], { readonly: true })

		expect(result).toBe('value')
		expect(calls).toStrictEqual([
			{
				name: 'CUSTOM',
				args: ['key'],
				options: { readonly: true },
			},
		])
	})

	it('transact', async () => {
		const result = await client.transact([
			{ name: 'SET', args: ['transaction-key', 'value'] },
			{ name: 'GET', args: ['transaction-key'], options: { readonly: true } },
		])

		expect(result).toStrictEqual([
			[null, 'OK'],
			[null, 'value'],
		])
	})
})
