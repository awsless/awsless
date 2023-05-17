import type { Redis } from 'ioredis'

export const mockRedis = async () => {
	vi.mock('ioredis', async () => {
		const module = (await vi.importActual('ioredis-mock')) as { default: typeof Redis }
		return { Redis: module.default }
	})
}
