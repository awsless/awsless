import { Redis } from 'ioredis';

declare class RedisServer {
    private client?;
    private process?;
    start(): Promise<void>;
    /** Kill the Redis server. */
    kill(): Promise<void>;
    /** Ping the Redis server if its ready. */
    ping(): Promise<boolean>;
    /** Get RedisClient connected to redis memory server. */
    getClient(): Promise<Redis>;
}

export { RedisServer };
