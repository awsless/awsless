import { createIoRedisClient, IoRedisOptions } from './ioredis'
import { createLazyClient } from './lazy'

export type RedisClientOptions = IoRedisOptions

export const createRedisClient = (options: RedisClientOptions) => {
	return createLazyClient(() => createIoRedisClient(options))
}
