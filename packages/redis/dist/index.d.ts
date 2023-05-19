import { RedisOptions, Redis } from 'ioredis';

declare const mockRedis: () => Promise<void>;

declare const redisClient: (options: RedisOptions) => Redis;

declare const command: <T>(options: RedisOptions, callback: (client: Redis) => T) => Promise<T>;

export { command, mockRedis, redisClient };
