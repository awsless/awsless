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
  DynamoDBServer: () => DynamoDBServer
});
module.exports = __toCommonJS(src_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var import_url_parser = require("@aws-sdk/url-parser");
var import_sleep_await = require("sleep-await");
var import_dynamo_db_local = require("dynamo-db-local");
var DynamoDBServer = class {
  constructor(region = "us-east-1") {
    this.region = region;
    this.endpoint = (0, import_url_parser.parseUrl)(`http://localhost`);
  }
  client;
  documentClient;
  endpoint;
  process;
  async listen(port) {
    if (this.process) {
      throw new Error(`DynamoDB server is already listening on port: ${this.endpoint.port}`);
    }
    if (port < 0 || port >= 65536) {
      throw new RangeError(`Port should be >= 0 and < 65536. Received ${port}.`);
    }
    this.endpoint.port = port;
    this.process = await (0, import_dynamo_db_local.spawn)({ port });
  }
  /** Kill the DynamoDB server. */
  async kill() {
    if (this.process) {
      await this.process.kill();
      this.process = void 0;
    }
  }
  /** Ping the DynamoDB server if its ready. */
  async ping() {
    const client = this.getClient();
    const command = new import_client_dynamodb.ListTablesCommand({});
    try {
      const response = await client.send(command);
      return Array.isArray(response.TableNames);
    } catch (error) {
      return false;
    }
  }
  /** Ping the DynamoDB server untill its ready. */
  async wait(times = 10) {
    while (times--) {
      if (await this.ping()) {
        return;
      }
      await (0, import_sleep_await.sleepAwait)(100 * times);
    }
    throw new Error("DynamoDB server is unavailable");
  }
  /** Get DynamoDBClient connected to dynamodb local. */
  getClient() {
    if (!this.client) {
      this.client = new import_client_dynamodb.DynamoDBClient({
        maxAttempts: 3,
        endpoint: this.endpoint,
        region: this.region,
        tls: false,
        credentials: {
          accessKeyId: "fake",
          secretAccessKey: "fake"
        }
      });
    }
    return this.client;
  }
  /** Get DynamoDBDocumentClient connected to dynamodb local. */
  getDocumentClient() {
    if (!this.documentClient) {
      this.documentClient = import_lib_dynamodb.DynamoDBDocumentClient.from(this.getClient(), {
        marshallOptions: {
          removeUndefinedValues: true
        }
      });
    }
    return this.documentClient;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DynamoDBServer
});
