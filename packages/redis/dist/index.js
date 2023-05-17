// src/mock.ts
import { RedisServer } from "@awsless/redis-server";
var server;
var mockRedis = async () => {
  server = new RedisServer();
  beforeAll && beforeAll(async () => {
    await server.start();
    await server.ping();
  });
  afterAll && afterAll(async () => {
    await server.kill();
  });
  vi.mock("./client.ts", async () => {
    return { redisClient: async () => await server.getClient() };
  });
  return server;
};

// src/client.ts
import { Redis } from "ioredis";
var redisClient = async (host, port, db) => {
  return new Redis({
    host,
    port,
    db,
    stringNumbers: true,
    keepAlive: 0,
    noDelay: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    autoResubscribe: false,
    autoResendUnfulfilledCommands: false,
    connectTimeout: 1e3 * 5,
    commandTimeout: 1e3 * 5
    // retryStrategy: (times) => {
    // 	if (options.error && options.error.code === 'ECONNREFUSED') {
    // 		return new Error 'The redis server refused the connection'
    // 	}
    // 	if (options.total_retry_time > ( 1000 * 10 )) {
    // 		return new Error 'The redis retry time exhausted'
    // 	}
    // 	if (options.attempt > 10) {
    // 		return
    // 	}
    // 	return Math.min(options.attempt * 100, 3000)
    // },
  });
};
export {
  mockRedis,
  redisClient
};
