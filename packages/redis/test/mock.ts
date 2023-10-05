import { command, mockRedis } from '../src'

describe('Redis Mock', () => {
	mockRedis()

	it('should get and set data in redis', async () => {
		const hoi = await command({ host: 'localhost', port: 6379, db: 0 }, async client => {
			await client.set('foo', 'bar')
			const result = await client.get('foo')
			expect(result).toBe('bar')

			return 'hoi'
		})

		expect(hoi).toBe('hoi')
	}, 100000)
}, 100000)
