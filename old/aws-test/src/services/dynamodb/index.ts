
import { requestPort } from '../../helpers/port'
import { DynamoDBServer } from './server'
import { SeedData } from './database'

export interface StartDynamoDBOptions {
	path: string
	timeout?: number
	port?: number
	seed?: SeedData
}

export const startDynamoDB = ({ path, timeout = 30 * 1000, seed = {} }:StartDynamoDBOptions) => {

	const server = new DynamoDBServer()
	let releasePort

	beforeAll(async () => {
		const [ port, release ] = await requestPort()
		releasePort = release

		await server.listen(port)
		await server.wait()
		await server.migrate(path)
		await server.seed(seed)
	}, timeout)

	afterAll(async () => {
		await server.kill()
		await releasePort()
	}, timeout)

	return server
}
