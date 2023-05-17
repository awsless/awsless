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
  RedisServer: () => RedisServer
});
module.exports = __toCommonJS(src_exports);
var import_redis_memory_server = require("redis-memory-server");
var import_ioredis = require("ioredis");
var RedisServer = class {
  client;
  process;
  async start() {
    if (this.process) {
      throw new Error(`Redis server is already listening on port: ${await this.process.getPort()}`);
    }
    this.process = new import_redis_memory_server.RedisMemoryServer({
      autoStart: false,
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RedisServer
});
