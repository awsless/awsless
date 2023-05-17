// src/index.ts
import { RedisMemoryServer } from "redis-memory-server";
import { Redis } from "ioredis";
var RedisServer = class {
  client;
  process;
  async start() {
    if (this.process) {
      throw new Error(`Redis server is already listening on port: ${await this.process.getPort()}`);
    }
    this.process = new RedisMemoryServer({
      autoStart: true,
      binary: { systemBinary: "/usr/local/bin/redis-server" }
    });
  }
  /** Kill the Redis server. */
  async kill() {
    if (this.process) {
      await this.client?.disconnect();
      await this.process.stop();
      this.process = void 0;
    }
  }
  /** Ping the Redis server if its ready. */
  async ping() {
    const client = await this.getClient();
    return await client.ping() === "PONG";
  }
  /** Get RedisClient connected to redis memory server. */
  async getClient() {
    if (!this.client) {
      this.client = new Redis({
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
export {
  RedisServer
};
