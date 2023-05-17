"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  command: () => command,
  mockRedis: () => mockRedis,
  redisClient: () => redisClient
});
module.exports = __toCommonJS(src_exports);

// src/mock.ts
var mockRedis = async () => {
  vi.mock("ioredis", async () => {
    const module2 = await vi.importActual("ioredis-mock");
    return { Redis: module2.default };
  });
};

// src/client.ts
var import_ioredis = require("ioredis");
var redisClient = (options) => {
  return new import_ioredis.Redis({
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  command,
  mockRedis,
  redisClient
});
