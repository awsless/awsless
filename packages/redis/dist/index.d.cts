import { RedisOptions, Cluster, Redis } from 'ioredis';
export { Cluster, Redis } from 'ioredis';

declare const mockRedis: () => void;

type CommandOptions<Cluster extends boolean = boolean> = RedisOptions & {
    cluster?: Cluster;
};
type Client<O extends CommandOptions> = O['cluster'] extends true ? Cluster : Redis;
declare const redisClient: <O extends CommandOptions>(options: O) => Client<O>;

declare const command: <O extends CommandOptions, T>(options: O, callback: (client: Client<O>) => T) => Promise<T>;

export { type Client, type CommandOptions, command, mockRedis, redisClient };
