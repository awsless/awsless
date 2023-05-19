// src/mock.ts
import { RedisServer } from "@awsless/redis-server";
import { requestPort } from "@heat/request-port";

// src/client.ts
import { Redis } from "ioredis";
var optionOverrides = {};
var overrideOptions = (options) => {
  optionOverrides = options;
};
var redisClient = (options) => {
  return new Redis({
    lazyConnect: true,
    stringNumbers: true,
    keepAlive: 0,
    noDelay: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    autoResubscribe: false,
    commandQueue: false,
    offlineQueue: false,
    autoResendUnfulfilledCommands: false,
    connectTimeout: 1e3 * 5,
    commandTimeout: 1e3 * 5,
    ...options,
    ...optionOverrides
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

// src/mock.ts
var mockRedis = async () => {
  const server = new RedisServer();
  let releasePort;
  beforeAll && beforeAll(async () => {
    const [port, release] = await requestPort();
    releasePort = release;
    await server.start(port);
    await server.ping();
    overrideOptions({
      port,
      host: "localhost"
    });
  });
  afterAll && afterAll(async () => {
    await server.kill();
    await releasePort();
  });
};

// src/commands.ts
var command = async (options, callback) => {
  const client = redisClient(options);
  let result;
  try {
    result = await callback(client);
  } catch (error) {
    throw error;
  } finally {
    await client.disconnect();
  }
  return result;
};
export {
  command,
  mockRedis,
  redisClient
};
