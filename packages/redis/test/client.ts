import { createRedisClient, mockRedis } from '../src'

describe('Redis Client', () => {
	mockRedis()

	const client = createRedisClient({})

	it('send', async () => {
		await client.send('SET', ['key', 'value'])
		const result = await client.send('GET', ['key'])
		expect(result).toBe('value')
	})
})
