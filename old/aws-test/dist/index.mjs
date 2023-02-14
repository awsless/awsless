// src/services/dynamodb/server.ts
import dynamoDbLocal from "dynamo-db-local";
import { DynamoDBClient as DynamoDBClient2, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient as DynamoDBDocumentClient2 } from "@aws-sdk/lib-dynamodb";
import { parseUrl } from "@aws-sdk/url-parser";
import sleep from "await-sleep";

// src/services/dynamodb/database.ts
import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
var migrate = (client, definitions) => {
  return Promise.all(definitions.map((definition) => {
    return client.send(new CreateTableCommand(definition));
  }));
};
var seed = (client, data) => {
  return Promise.all(Object.entries(data).map(([TableName, items]) => {
    return Promise.all(items.map(async (item) => {
      try {
        await client.send(new PutCommand({
          TableName,
          Item: item
        }));
      } catch (error) {
        throw new Error(`DynamoDB Seeding Error: ${error.message}`);
      }
    }));
  }));
};

// src/services/dynamodb/definition.ts
import { load } from "@heat/awsless";
var loadDefinitions = async (paths) => {
  const definitions = [];
  if (!Array.isArray(paths)) {
    paths = [paths];
  }
  await Promise.all(paths.map(async (path) => {
    const stacks = await load(path, {
      resolveRemoteResolvers: false,
      resolveLocalResolvers: false
    });
    for (let stack of stacks) {
      const template = JSON.parse(stack.templateBody);
      Object.values(template.Resources).map((resource) => {
        if (resource.Type !== "AWS::DynamoDB::Table") {
          return;
        }
        const properties = Object.assign({}, resource.Properties, {
          BillingMode: "PAY_PER_REQUEST"
        });
        delete properties.TableClass;
        delete properties.TimeToLiveSpecification;
        delete properties.PointInTimeRecoverySpecification;
        delete properties.Tags;
        if (properties.StreamSpecification) {
          properties.StreamSpecification.StreamEnabled = true;
        }
        definitions.push(properties);
      });
    }
  }));
  return definitions;
};

// src/services/dynamodb/server.ts
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
    this.endpoint.port = port;
    this.process = await dynamoDbLocal.spawn({ port });
  }
  async kill() {
    if (this.process) {
      await this.process.kill();
      this.process = void 0;
    }
  }
  async ping() {
    const client = this.getClient();
    const command = new ListTablesCommand({});
    const response = await client.send(command);
    return Array.isArray(response.TableNames);
  }
  async wait(times = 10) {
    while (times--) {
      try {
        if (await this.ping()) {
          return;
        }
      } catch (error) {
        await sleep(100 * times);
        continue;
      }
    }
    throw new Error("DynamoDB server is unavailable");
  }
  async migrate(path) {
    const definitions = await loadDefinitions(path);
    await migrate(this.getClient(), definitions);
  }
  async seed(data) {
    await seed(this.getDocumentClient(), data);
  }
  getClient() {
    if (!this.client) {
      this.client = new DynamoDBClient2({
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
  getDocumentClient() {
    if (!this.documentClient) {
      this.documentClient = DynamoDBDocumentClient2.from(this.getClient(), {
        marshallOptions: {
          removeUndefinedValues: true
        }
      });
    }
    return this.documentClient;
  }
};

// src/helpers/port.ts
import net from "net";
import lockfile from "proper-lockfile";
import { unlink, access, constants, open } from "fs/promises";
var random = (min, max) => {
  return Math.floor(
    Math.random() * (max - min) + min
  );
};
var isAvailable = (port) => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error) => {
      error.code === "EADDRINUSE" ? resolve(false) : reject(error);
    });
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
};
var prepareLockFile = async (file) => {
  try {
    await access(file, constants.W_OK);
  } catch (error) {
    const handle = await open(file, "w");
    await handle.close();
  }
};
var lock = async (file, timeout) => {
  try {
    await prepareLockFile(file);
    await lockfile.lock(file, {
      stale: timeout,
      retries: 0
    });
  } catch (error) {
    return false;
  }
  return true;
};
var unlock = (file) => {
  return lockfile.unlock(file);
};
var requestPort = async ({ min = 32768, max = 65535, timeout = 1e3 * 60 * 5 } = {}) => {
  let times = 10;
  while (times--) {
    const port = random(min, max);
    const open2 = await isAvailable(port);
    if (!open2)
      continue;
    const file = `/var/tmp/port-${port}`;
    if (await lock(file, timeout)) {
      return [
        port,
        async () => {
          await unlock(file);
          await unlink(file);
        }
      ];
    }
  }
  throw new Error("No port found");
};

// src/services/dynamodb/index.ts
var startDynamoDB = ({ path, timeout = 30 * 1e3, seed: seed2 = {} }) => {
  const server = new DynamoDBServer();
  let releasePort;
  beforeAll(async () => {
    const [port, release] = await requestPort();
    releasePort = release;
    await server.listen(port);
    await server.wait();
    await server.migrate(path);
    await server.seed(seed2);
  }, timeout);
  afterAll(async () => {
    await server.kill();
    await releasePort();
  }, timeout);
  return server;
};

// src/mocks/dynamodb.ts
import { BatchGetItemCommand, BatchWriteItemCommand, CreateTableCommand as CreateTableCommand2, DeleteItemCommand, DynamoDBClient as DynamoDBClient3, GetItemCommand, ListTablesCommand as ListTablesCommand2, PutItemCommand, QueryCommand, ScanCommand, TransactGetItemsCommand, TransactWriteItemsCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DeleteCommand, DynamoDBDocumentClient as DynamoDBDocumentClient3, GetCommand, PutCommand as PutCommand2, TransactGetCommand, TransactWriteCommand, UpdateCommand, QueryCommand as Query, ScanCommand as Scan, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
var mockDynamoDB = (configOrServer) => {
  const dynamo = configOrServer instanceof DynamoDBServer ? configOrServer : startDynamoDB(configOrServer);
  const client = dynamo.getClient();
  const documentClient = dynamo.getDocumentClient();
  const clientSend = (command) => {
    return client.__proto__.send.wrappedMethod.call(client, command);
  };
  const documentClientSend = (command) => {
    return documentClient.__proto__.send.wrappedMethod.call(documentClient, command);
  };
  mockClient(DynamoDBClient3).on(CreateTableCommand2).callsFake((input) => clientSend(new CreateTableCommand2(input))).on(ListTablesCommand2).callsFake((input) => clientSend(new ListTablesCommand2(input))).on(GetItemCommand).callsFake((input) => clientSend(new GetItemCommand(input))).on(PutItemCommand).callsFake((input) => clientSend(new PutItemCommand(input))).on(DeleteItemCommand).callsFake((input) => clientSend(new DeleteItemCommand(input))).on(UpdateItemCommand).callsFake((input) => clientSend(new UpdateItemCommand(input))).on(QueryCommand).callsFake((input) => clientSend(new QueryCommand(input))).on(ScanCommand).callsFake((input) => clientSend(new ScanCommand(input))).on(BatchGetItemCommand).callsFake((input) => clientSend(new BatchGetItemCommand(input))).on(BatchWriteItemCommand).callsFake((input) => clientSend(new BatchWriteItemCommand(input))).on(TransactGetItemsCommand).callsFake((input) => clientSend(new TransactGetItemsCommand(input))).on(TransactWriteItemsCommand).callsFake((input) => clientSend(new TransactWriteItemsCommand(input)));
  mockClient(DynamoDBDocumentClient3).on(GetCommand).callsFake((input) => documentClientSend(new GetCommand(input))).on(PutCommand2).callsFake((input) => documentClientSend(new PutCommand2(input))).on(DeleteCommand).callsFake((input) => documentClientSend(new DeleteCommand(input))).on(UpdateCommand).callsFake((input) => documentClientSend(new UpdateCommand(input))).on(Query).callsFake((input) => documentClientSend(new Query(input))).on(Scan).callsFake((input) => documentClientSend(new Scan(input))).on(BatchGetCommand).callsFake((input) => documentClientSend(new BatchGetCommand(input))).on(BatchWriteCommand).callsFake((input) => documentClientSend(new BatchWriteCommand(input))).on(TransactGetCommand).callsFake((input) => documentClientSend(new TransactGetCommand(input))).on(TransactWriteCommand).callsFake((input) => documentClientSend(new TransactWriteCommand(input)));
  return dynamo;
};

// src/helpers/mock.ts
var mockObjectKeys = (object) => {
  const list = {};
  Object.entries(object).forEach(([key, value]) => {
    list[key] = vi.fn(value);
  });
  return Object.freeze(list);
};

// src/mocks/lambda.ts
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { fromUtf8, toUtf8 } from "@aws-sdk/util-utf8-node";
import { mockClient as mockClient2 } from "aws-sdk-client-mock";
var mockLambda = (lambdas) => {
  const list = mockObjectKeys(lambdas);
  mockClient2(LambdaClient).on(InvokeCommand).callsFake(async (input) => {
    const name = input.FunctionName;
    const type = input.InvocationType || "RequestResponse";
    const payload = input.Payload ? JSON.parse(toUtf8(input.Payload)) : void 0;
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Lambda mock function not defined for: ${name}`);
    }
    const result = await callback(payload);
    if (type === "RequestResponse" && result) {
      return {
        Payload: fromUtf8(JSON.stringify(result))
      };
    }
    return {
      Payload: void 0
    };
  });
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};

// src/mocks/iot.ts
import { IoTClient, DescribeEndpointCommand } from "@aws-sdk/client-iot";
import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { mockClient as mockClient3 } from "aws-sdk-client-mock";
var mockIoT = () => {
  const fn = vi.fn();
  mockClient3(IoTClient).on(DescribeEndpointCommand).resolves({
    endpointAddress: "endpoint"
  });
  mockClient3(IoTDataPlaneClient).on(PublishCommand).callsFake(() => {
    fn();
  });
  beforeEach(() => {
    fn.mockClear();
  });
  return fn;
};

// src/mocks/scheduler.ts
import { SchedulerClient, CreateScheduleCommand, DeleteScheduleCommand } from "@aws-sdk/client-scheduler";
import { mockClient as mockClient4 } from "aws-sdk-client-mock";
var mockScheduler = (lambdas) => {
  const list = mockObjectKeys(lambdas);
  mockClient4(SchedulerClient).on(CreateScheduleCommand).callsFake(async (input) => {
    const parts = input.Target.Arn.split(":");
    const name = parts[parts.length - 1];
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Scheduler mock function not defined for: ${name}`);
    }
    const payload = input.Target.Input ? JSON.parse(input.Target.Input) : void 0;
    await callback(payload);
  }).on(DeleteScheduleCommand).resolves({});
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};

// src/mocks/sns.ts
import { PublishCommand as PublishCommand2, SNSClient } from "@aws-sdk/client-sns";
import { randomUUID } from "crypto";
import { mockClient as mockClient5 } from "aws-sdk-client-mock";
var mockSNS = (topics) => {
  const list = mockObjectKeys(topics);
  mockClient5(SNSClient).on(PublishCommand2).callsFake(async (input) => {
    const parts = input.TopicArn.split(":");
    const topic = parts[parts.length - 1];
    const callback = list[topic];
    if (!callback) {
      throw new TypeError(`Sns mock function not defined for: ${topic}`);
    }
    await callback({
      Records: [{
        Sns: {
          TopicArn: input.TopicArn,
          MessageId: randomUUID(),
          Timestamp: Date.now(),
          Message: input.Message
        }
      }]
    });
  });
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};

// src/mocks/sqs.ts
import { SQSClient, SendMessageCommand, GetQueueUrlCommand, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { randomUUID as randomUUID2 } from "crypto";
import { mockClient as mockClient6 } from "aws-sdk-client-mock";
var formatAttributes = (attributes) => {
  const list = {};
  for (let key in attributes) {
    list[key] = {
      dataType: attributes[key].DataType,
      stringValue: attributes[key].StringValue
    };
  }
  return list;
};
var mockSQS = (queues) => {
  const list = mockObjectKeys(queues);
  const get = (input) => {
    const name = input.QueueUrl;
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Sqs mock function not defined for: ${name}`);
    }
    return callback;
  };
  mockClient6(SQSClient).on(GetQueueUrlCommand).callsFake((input) => ({ QueueUrl: input.QueueName })).on(SendMessageCommand).callsFake(async (input) => {
    const callback = get(input);
    await callback({
      Records: [{
        body: input.MessageBody,
        messageId: randomUUID2(),
        messageAttributes: formatAttributes(input.MessageAttributes)
      }]
    });
  }).on(SendMessageBatchCommand).callsFake(async (input) => {
    const callback = get(input);
    await callback({
      Records: input.Entries.map((entry) => ({
        body: entry.MessageBody,
        messageId: entry.Id || randomUUID2(),
        messageAttributes: formatAttributes(entry.MessageAttributes)
      }))
    });
  });
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};

// src/mocks/ssm.ts
import { SSMClient, GetParametersCommand } from "@aws-sdk/client-ssm";
import { mockClient as mockClient7 } from "aws-sdk-client-mock";
var mockSSM = (values) => {
  mockClient7(SSMClient).on(GetParametersCommand).callsFake((input) => {
    return {
      Parameters: input.Names.map((name) => {
        return {
          Name: name,
          Value: values[name] || ""
        };
      })
    };
  });
};

// src/mocks/ses.ts
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { mockClient as mockClient8 } from "aws-sdk-client-mock";
var mockSES = () => {
  const fn = vi.fn();
  mockClient8(SESv2Client).on(SendEmailCommand).callsFake(() => {
    fn();
  });
  beforeEach(() => {
    fn.mockClear();
  });
  return fn;
};
export {
  DynamoDBServer,
  mockDynamoDB,
  mockIoT,
  mockLambda,
  mockSES,
  mockSNS,
  mockSQS,
  mockSSM,
  mockScheduler,
  startDynamoDB
};
