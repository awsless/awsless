"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
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
var import_dynamo_db_local = __toESM(require("dynamo-db-local"));
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
    this.endpoint.port = port;
    this.process = await import_dynamo_db_local.default.spawn({ port });
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
    const response = await client.send(command);
    return Array.isArray(response.TableNames);
  }
  /** Ping the DynamoDB server untill its ready. */
  async wait(times = 10) {
    while (times--) {
      try {
        if (await this.ping()) {
          return;
        }
      } catch (error) {
        await (0, import_sleep_await.sleepAwait)(100 * times);
        continue;
      }
    }
    throw new Error("DynamoDB server is unavailable");
  }
  /** Get DynamoDBClient connected to dynamodb local. */
  getClient() {
    if (!this.client) {
      this.client = new import_client_dynamodb.DynamoDBClient({
        maxAttempts: 10,
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
