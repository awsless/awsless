import { RedisOptions, Redis } from 'ioredis';

declare const mockRedis: () => Promise<void>;

declare const redisClient: (options: RedisOptions) => Redis;

declare const command: (options: RedisOptions, callback: Function) => Promise<any>;

export { command, mockRedis, redisClient };
