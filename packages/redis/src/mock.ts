import { RedisServer } from '@awsless/redis-server'

let server: RedisServer
export const mockRedis = async () => {
	server = new RedisServer()

	beforeAll &&
		beforeAll(async () => {
			await server.start()
			await server.ping()
		})

	afterAll &&
		afterAll(async () => {
			await server.kill()
		})

	vi.mock('./client.ts', async () => {
		return { redisClient: async () => await server.getClient() }
	})

	return server
}
