import { DynamoDBServer } from '../src/index'

describe('DynamoDB Server', () => {
	const server = new DynamoDBServer()

	afterAll(async () => {
		await server.kill()
	})

	it('should ping the server FAIL', async () => {
		const result = await server.ping()
		expect(result).toBe(false)
	})

	it('should start a local DynamoDB server listening on port X', async () => {
		await server.listen(33333)
	})

	it('should wait until the server is ready for use', async () => {
		await server.wait()
	}, 20000)

	it('should ping the server OK', async () => {
		const result = await server.ping()
		expect(result).toBe(true)
	})

	it('should kill the server', async () => {
		await server.kill()
	})
})
