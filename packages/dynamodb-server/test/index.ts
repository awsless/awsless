
import { DynamoDBServer } from '../src/index'

describe('DynamoDB Server', () => {

	const server = new DynamoDBServer()

	afterAll(async () => {
		await server.kill()
	})

	it('should start a local DynamoDB server listening on port X', async () => {
		await server.listen(333333)
	})

	it('should wait until the server is ready for use', async () => {
		await server.wait()
	})

	it('should kill the server', async () => {
		await server.kill()
	})
})
