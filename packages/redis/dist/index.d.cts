import { RedisOptions, Cluster, Redis } from 'ioredis';
export { Cluster, Redis } from 'ioredis';

declare const mockRedis: () => void;

type CommandOptions<Cluster extends boolean = boolean> = RedisOptions & {
    cluster?: Cluster;
};
type Client<O extends CommandOptions> = O['cluster'] extends true ? Cluster : Redis;
declare const redisClient: <O extends CommandOptions<boolean>>(options: O) => Client<O>;

declare const command: <O extends CommandOptions<boolean>, T>(options: O, callback: (client: Client<O>) => T) => Promise<T>;

export { Client, CommandOptions, command, mockRedis, redisClient };
