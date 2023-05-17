import { RedisServer } from '@awsless/redis-server';
import { Redis } from 'ioredis';

declare const mockRedis: () => Promise<RedisServer>;

declare const redisClient: (host: string, port: number, db: number) => Promise<Redis>;

export { mockRedis, redisClient };
