// src/mock.ts
var mockRedis = async () => {
  vi.mock("ioredis", async () => {
    const module = await vi.importActual("ioredis-mock");
    return { Redis: module.default };
  });
};

// src/client.ts
import { Redis } from "ioredis";
var redisClient = (options) => {
  return new Redis({
    ...options,
    stringNumbers: true,
    keepAlive: 0,
    noDelay: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    autoResubscribe: false,
    commandQueue: false,
    offlineQueue: false,
    enableOfflineQueue: false,
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

// src/commands.ts
var command = async (options, callback) => {
  const client = redisClient(options);
  try {
    var result = await callback(client);
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
