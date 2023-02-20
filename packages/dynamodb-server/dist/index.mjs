// src/index.ts
import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { parseUrl } from "@aws-sdk/url-parser";
import { sleepAwait } from "sleep-await";
import dynamoDbLocal from "dynamo-db-local";
var DynamoDBServer = class {
  constructor(region = "us-east-1") {
    this.region = region;
    this.endpoint = parseUrl(`http://localhost`);
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
    this.process = await dynamoDbLocal.spawn({ port });
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
    const command = new ListTablesCommand({});
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
        await sleepAwait(100 * times);
        continue;
      }
    }
    throw new Error("DynamoDB server is unavailable");
  }
  /** Get DynamoDBClient connected to dynamodb local. */
  getClient() {
    if (!this.client) {
      this.client = new DynamoDBClient({
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
      this.documentClient = DynamoDBDocumentClient.from(this.getClient(), {
        marshallOptions: {
          removeUndefinedValues: true
        }
      });
    }
    return this.documentClient;
  }
};
export {
  DynamoDBServer
};
