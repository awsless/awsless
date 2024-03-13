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
  Cluster: () => import_ioredis3.Cluster,
  Redis: () => import_ioredis3.Redis,
  command: () => command,
  mockRedis: () => mockRedis,
  redisClient: () => redisClient
});
module.exports = __toCommonJS(src_exports);

// src/server.ts
var import_redis_memory_server = require("redis-memory-server");
var import_ioredis = require("ioredis");
var RedisServer = class {
  client;
  process;
  async start(port) {
    if (this.process) {
      throw new Error(`Redis server is already listening on port: ${await this.process.getPort()}`);
    }
    if (port && (port < 0 || port >= 65536)) {
      throw new RangeError(`Port should be >= 0 and < 65536. Received ${port}.`);
    }
    this.process = await import_redis_memory_server.RedisMemoryServer.create({
      instance: {
        port,
        args: []
      }
      // binary: { systemBinary: '/usr/local/bin/redis-server' },
    });
  }
  async kill() {
    if (this.process) {
      await this.client?.disconnect();
      await this.process.stop();
      this.process = void 0;
    }
  }
  async ping() {
    const client = await this.getClient();
    return await client.ping() === "PONG";
  }
  async getClient() {
    if (!this.client) {
      this.client = new import_ioredis.Redis({
        host: await this.process?.getHost(),
        port: await this.process?.getPort(),
        stringNumbers: true,
        keepAlive: 0,
        noDelay: true,
        enableReadyCheck: false,
        maxRetriesPerRequest: null
        // retryStrategy: (options) => {
        // 	return
        // },
      });
    }
    return this.client;
  }
};

// src/mock.ts
var import_request_port = require("@heat/request-port");

// src/client.ts
var import_ioredis2 = require("ioredis");
var optionOverrides = {};
var overrideOptions = (options) => {
  optionOverrides = options;
};
var redisClient = (options) => {
  const props = {
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
  };
  if (!props.cluster) {
    return new import_ioredis2.Redis(props);
  }
  return new import_ioredis2.Cluster(
    [
      {
        host: props.host,
        port: props.port
      }
    ],
    {
      redisOptions: props
    }
    // {
    // 	dnsLookup: (address, callback) => callback(null, address),
    // 	enableReadyCheck: false,
    // 	redisOptions: {
    // 		...props,
    // 		// username: options.username,
    // 		// password: options.password,
    // 		tls: {
    // 			checkServerIdentity: (/*host, cert*/) => {
    // 				// skip certificate hostname validation
    // 				return undefined
    // 			},
    // 		},
    // 	},
    // }
  );
};

// src/mock.ts
var mockRedis = () => {
  const server = new RedisServer();
  let releasePort;
  beforeAll && beforeAll(async () => {
    const [port, release] = await (0, import_request_port.requestPort)();
    releasePort = release;
    await server.start(port);
    await server.ping();
    overrideOptions({
      port,
      host: "localhost",
      cluster: false
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
    await client.quit();
  }
  return result;
};

// src/index.ts
var import_ioredis3 = require("ioredis");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Cluster,
  Redis,
  command,
  mockRedis,
  redisClient
});
