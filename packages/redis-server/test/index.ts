import { RedisServer } from '../src/index'

describe('Redis Server', () => {
	const server = new RedisServer()

	afterAll(async () => {
		await server.kill()
	})

	it('should start a local Redis server listening on an available port', async () => {
		await server.start()
	})

	it('should throw an eror when trying to start the server if already started', async () => {
		await expect(server.start()).rejects.toThrow()
	})

	it('should ping the server OK', async () => {
		const result = await server.ping()
		expect(result).toBe(true)
	})

	it('should kill the server', async () => {
		await server.kill()
	})
})
