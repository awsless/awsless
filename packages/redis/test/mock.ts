import { mockRedis, redisClient } from '../src'

describe('Redis Mock', () => {
	mockRedis()

	const createClient = async () => {
		return await redisClient('https://google.com', 22, 0)
	}

	it('should get the mocked client', async () => {
		const client = await createClient()
		expect(client.options.host).toBe('127.0.0.1')
		expect(client.options.port).not.toBe(22)
	})

	it('should get the mocked client', async () => {
		const client = await createClient()
		await client.set('foo', 'bar')
		const result = await client.get('foo')
		expect(result).toBe('bar')
	})
})
