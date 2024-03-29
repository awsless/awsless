import { RedisServer } from './server'
import { requestPort } from '@heat/request-port'
import { overrideOptions } from './client'

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
		})

	afterAll &&
		afterAll(async () => {
			await server.kill()
			await releasePort()
		})

	// vi.mock('ioredis', async () => {
	// 	const module = (await vi.importActual('ioredis-mock')) as { default: typeof Redis }
	// 	return { Redis: module.default }
	// })
}
