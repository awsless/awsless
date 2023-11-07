// src/mock.ts
import { RedisServer } from "@awsless/redis-server";
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
  if (!options.cluster) {
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
      dnsLookup: (address, callback) => callback(null, address),
      enableReadyCheck: false,
      redisOptions: {
        ...props,
        // username: options.username,
        // password: options.password,
        tls: {
          checkServerIdentity: () => {
            return void 0;
          }
        }
      }
    }
  );
};

// src/mock.ts
var mockRedis = () => {
  const server = new RedisServer();
  let releasePort;
  beforeAll && beforeAll(async () => {
    const [port, release] = await requestPort();
    releasePort = release;
    console.log(port);
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
    await client.quit();
  }
  return result;
};

// src/index.ts
import { Redis as Redis2, Cluster as Cluster2 } from "ioredis";
export {
  Cluster2 as Cluster,
  Redis2 as Redis,
  command,
  mockRedis,
  redisClient
};
