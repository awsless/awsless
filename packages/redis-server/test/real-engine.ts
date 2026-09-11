import { Redis } from 'ioredis'
import { RedisServer } from '../src'

// Opt-in, since it builds the real redis binary through redis-memory-server:
// AWSLESS_LOCAL_ENGINE=real pnpm test
describe.skipIf(process.env.AWSLESS_LOCAL_ENGINE !== 'real')('Real redis engine', () => {
	const server = new RedisServer({ engine: 'redis', databases: 32 })

	afterAll(() => server.close())

	it(
		'boots the real binary and answers commands',
		async () => {
			await server.listen()
			expect(server.port).toBeGreaterThan(0)

			const client = new Redis({ host: server.host, port: server.port, db: 31 })
			await client.set('key', 'value')
			expect(await client.get('key')).toBe('value')

			await server.flushAll()
			expect(await client.get('key')).toBeNull()
			client.disconnect()
		},
		10 * 60 * 1000
	)
})
