import { DynamoDBServer } from '../src/index'

describe('Parallel', () => {
	const servers = Array.from({ length: 10 }).map(() => {
		return new DynamoDBServer()
	})

	afterAll(async () => {
		await Promise.all(
			servers.map(async server => {
				await server.kill()
			})
		)
	})

	it('should startup all servers', async () => {
		await Promise.all(
			servers.map(async (server, i) => {
				await server.listen(30000 + i)
			})
		)
	})

	it('should wait until the servers are ready for use', async () => {
		await Promise.all(
			servers.map(async server => {
				await server.wait()
			})
		)
	}, 20000)

	it('should ping the servers', async () => {
		await Promise.all(
			servers.map(async server => {
				const result = await server.ping()
				expect(result).toBe(true)
			})
		)
	})

	it('should kill the servers', async () => {
		await Promise.all(
			servers.map(async server => {
				await server.kill()
			})
		)
	})
})
