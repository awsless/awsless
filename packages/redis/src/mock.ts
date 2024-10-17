import { requestPort } from '@heat/request-port'
import { overrideOptions } from './client'
import { RedisServer } from './server'

export const mockRedis = () => {
	const server = new RedisServer()
	let releasePort: () => Promise<void>

	beforeAll &&
		beforeAll(async () => {
			const [port, release] = await requestPort()
			releasePort = release

			// console.log(port)

			await server.start(port)
			await server.ping()

			overrideOptions({
				port,
				host: 'localhost',
				cluster: false,
			})
		}, 30 * 1000)

	afterAll &&
		afterAll(async () => {
			await server.kill()
			await releasePort()
		}, 30 * 1000)

	// vi.mock('ioredis', async () => {
	// 	const module = (await vi.importActual('ioredis-mock')) as { default: typeof Redis }
	// 	return { Redis: module.default }
	// })
}
