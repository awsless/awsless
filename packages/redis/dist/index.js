// src/mock.ts
import { requestPort } from "@heat/request-port";

// src/client.ts
import { Cluster, Redis } from "ioredis";
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
    return new Redis(props);
  }
  return new Cluster(
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

// src/server.ts
import { RedisMemoryServer } from "redis-memory-server";
import { Redis as Redis2 } from "ioredis";
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
    this.process = await RedisMemoryServer.create({
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
      this.client = new Redis2({
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
var mockRedis = () => {
  const server = new RedisServer();
  let releasePort;
  beforeAll && beforeAll(async () => {
    const [port, release] = await requestPort();
    releasePort = release;
    await server.start(port);
    await server.ping();
    overrideOptions({
      port,
      host: "localhost",
      cluster: false,
      tls: void 0
    });
  }, 30 * 1e3);
  afterAll && afterAll(async () => {
    await server.kill();
    await releasePort();
  }, 30 * 1e3);
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
import { Redis as Redis3, Cluster as Cluster3 } from "ioredis";
export {
  Cluster3 as Cluster,
  Redis3 as Redis,
  command,
  mockRedis,
  redisClient
};
