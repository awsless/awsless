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
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  DynamoDBServer: () => DynamoDBServer,
  mockDynamoDB: () => mockDynamoDB,
  mockIoT: () => mockIoT,
  mockLambda: () => mockLambda,
  mockSES: () => mockSES,
  mockSNS: () => mockSNS,
  mockSQS: () => mockSQS,
  mockSSM: () => mockSSM,
  mockScheduler: () => mockScheduler,
  startDynamoDB: () => startDynamoDB
});
module.exports = __toCommonJS(src_exports);

// src/services/dynamodb/server.ts
var import_dynamo_db_local = __toESM(require("dynamo-db-local"));
var import_client_dynamodb2 = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb2 = require("@aws-sdk/lib-dynamodb");
var import_url_parser = require("@aws-sdk/url-parser");
var import_await_sleep = __toESM(require("await-sleep"));

// src/services/dynamodb/database.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var migrate = (client, definitions) => {
  return Promise.all(definitions.map((definition) => {
    return client.send(new import_client_dynamodb.CreateTableCommand(definition));
  }));
};
var seed = (client, data) => {
  return Promise.all(Object.entries(data).map(([TableName, items]) => {
    return Promise.all(items.map(async (item) => {
      try {
        await client.send(new import_lib_dynamodb.PutCommand({
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
var import_awsless = require("@heat/awsless");
var loadDefinitions = async (paths) => {
  const definitions = [];
  if (!Array.isArray(paths)) {
    paths = [paths];
  }
  await Promise.all(paths.map(async (path) => {
    const stacks = await (0, import_awsless.load)(path, {
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
    this.endpoint = (0, import_url_parser.parseUrl)(`http://localhost`);
  }
  client;
  documentClient;
  endpoint;
  process;
  async listen(port) {
    this.endpoint.port = port;
    this.process = await import_dynamo_db_local.default.spawn({ port });
  }
  async kill() {
    if (this.process) {
      await this.process.kill();
      this.process = void 0;
    }
  }
  async ping() {
    const client = this.getClient();
    const command = new import_client_dynamodb2.ListTablesCommand({});
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
        await (0, import_await_sleep.default)(100 * times);
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
      this.client = new import_client_dynamodb2.DynamoDBClient({
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
      this.documentClient = import_lib_dynamodb2.DynamoDBDocumentClient.from(this.getClient(), {
        marshallOptions: {
          removeUndefinedValues: true
        }
      });
    }
    return this.documentClient;
  }
};

// src/helpers/port.ts
var import_net = __toESM(require("net"));
var import_proper_lockfile = __toESM(require("proper-lockfile"));
var import_promises = require("fs/promises");
var random = (min, max) => {
  return Math.floor(
    Math.random() * (max - min) + min
  );
};
var isAvailable = (port) => {
  return new Promise((resolve, reject) => {
    const server = import_net.default.createServer();
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
    await (0, import_promises.access)(file, import_promises.constants.W_OK);
  } catch (error) {
    const handle = await (0, import_promises.open)(file, "w");
    await handle.close();
  }
};
var lock = async (file, timeout) => {
  try {
    await prepareLockFile(file);
    await import_proper_lockfile.default.lock(file, {
      stale: timeout,
      retries: 0
    });
  } catch (error) {
    return false;
  }
  return true;
};
var unlock = (file) => {
  return import_proper_lockfile.default.unlock(file);
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
          await (0, import_promises.unlink)(file);
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
var import_client_dynamodb3 = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb3 = require("@aws-sdk/lib-dynamodb");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
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
  (0, import_aws_sdk_client_mock.mockClient)(import_client_dynamodb3.DynamoDBClient).on(import_client_dynamodb3.CreateTableCommand).callsFake((input) => clientSend(new import_client_dynamodb3.CreateTableCommand(input))).on(import_client_dynamodb3.ListTablesCommand).callsFake((input) => clientSend(new import_client_dynamodb3.ListTablesCommand(input))).on(import_client_dynamodb3.GetItemCommand).callsFake((input) => clientSend(new import_client_dynamodb3.GetItemCommand(input))).on(import_client_dynamodb3.PutItemCommand).callsFake((input) => clientSend(new import_client_dynamodb3.PutItemCommand(input))).on(import_client_dynamodb3.DeleteItemCommand).callsFake((input) => clientSend(new import_client_dynamodb3.DeleteItemCommand(input))).on(import_client_dynamodb3.UpdateItemCommand).callsFake((input) => clientSend(new import_client_dynamodb3.UpdateItemCommand(input))).on(import_client_dynamodb3.QueryCommand).callsFake((input) => clientSend(new import_client_dynamodb3.QueryCommand(input))).on(import_client_dynamodb3.ScanCommand).callsFake((input) => clientSend(new import_client_dynamodb3.ScanCommand(input))).on(import_client_dynamodb3.BatchGetItemCommand).callsFake((input) => clientSend(new import_client_dynamodb3.BatchGetItemCommand(input))).on(import_client_dynamodb3.BatchWriteItemCommand).callsFake((input) => clientSend(new import_client_dynamodb3.BatchWriteItemCommand(input))).on(import_client_dynamodb3.TransactGetItemsCommand).callsFake((input) => clientSend(new import_client_dynamodb3.TransactGetItemsCommand(input))).on(import_client_dynamodb3.TransactWriteItemsCommand).callsFake((input) => clientSend(new import_client_dynamodb3.TransactWriteItemsCommand(input)));
  (0, import_aws_sdk_client_mock.mockClient)(import_lib_dynamodb3.DynamoDBDocumentClient).on(import_lib_dynamodb3.GetCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb3.GetCommand(input))).on(import_lib_dynamodb3.PutCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb3.PutCommand(input))).on(import_lib_dynamodb3.DeleteCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb3.DeleteCommand(input))).on(import_lib_dynamodb3.UpdateCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb3.UpdateCommand(input))).on(import_lib_dynamodb3.QueryCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb3.QueryCommand(input))).on(import_lib_dynamodb3.ScanCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb3.ScanCommand(input))).on(import_lib_dynamodb3.BatchGetCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb3.BatchGetCommand(input))).on(import_lib_dynamodb3.BatchWriteCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb3.BatchWriteCommand(input))).on(import_lib_dynamodb3.TransactGetCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb3.TransactGetCommand(input))).on(import_lib_dynamodb3.TransactWriteCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb3.TransactWriteCommand(input)));
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
var import_client_lambda = require("@aws-sdk/client-lambda");
var import_util_utf8_node = require("@aws-sdk/util-utf8-node");
var import_aws_sdk_client_mock2 = require("aws-sdk-client-mock");
var mockLambda = (lambdas) => {
  const list = mockObjectKeys(lambdas);
  (0, import_aws_sdk_client_mock2.mockClient)(import_client_lambda.LambdaClient).on(import_client_lambda.InvokeCommand).callsFake(async (input) => {
    const name = input.FunctionName;
    const type = input.InvocationType || "RequestResponse";
    const payload = input.Payload ? JSON.parse((0, import_util_utf8_node.toUtf8)(input.Payload)) : void 0;
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Lambda mock function not defined for: ${name}`);
    }
    const result = await callback(payload);
    if (type === "RequestResponse" && result) {
      return {
        Payload: (0, import_util_utf8_node.fromUtf8)(JSON.stringify(result))
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
var import_client_iot = require("@aws-sdk/client-iot");
var import_client_iot_data_plane = require("@aws-sdk/client-iot-data-plane");
var import_aws_sdk_client_mock3 = require("aws-sdk-client-mock");
var mockIoT = () => {
  const fn = vi.fn();
  (0, import_aws_sdk_client_mock3.mockClient)(import_client_iot.IoTClient).on(import_client_iot.DescribeEndpointCommand).resolves({
    endpointAddress: "endpoint"
  });
  (0, import_aws_sdk_client_mock3.mockClient)(import_client_iot_data_plane.IoTDataPlaneClient).on(import_client_iot_data_plane.PublishCommand).callsFake(() => {
    fn();
  });
  beforeEach(() => {
    fn.mockClear();
  });
  return fn;
};

// src/mocks/scheduler.ts
var import_client_scheduler = require("@aws-sdk/client-scheduler");
var import_aws_sdk_client_mock4 = require("aws-sdk-client-mock");
var mockScheduler = (lambdas) => {
  const list = mockObjectKeys(lambdas);
  (0, import_aws_sdk_client_mock4.mockClient)(import_client_scheduler.SchedulerClient).on(import_client_scheduler.CreateScheduleCommand).callsFake(async (input) => {
    const parts = input.Target.Arn.split(":");
    const name = parts[parts.length - 1];
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Scheduler mock function not defined for: ${name}`);
    }
    const payload = input.Target.Input ? JSON.parse(input.Target.Input) : void 0;
    await callback(payload);
  }).on(import_client_scheduler.DeleteScheduleCommand).resolves({});
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};

// src/mocks/sns.ts
var import_client_sns = require("@aws-sdk/client-sns");
var import_crypto = require("crypto");
var import_aws_sdk_client_mock5 = require("aws-sdk-client-mock");
var mockSNS = (topics) => {
  const list = mockObjectKeys(topics);
  (0, import_aws_sdk_client_mock5.mockClient)(import_client_sns.SNSClient).on(import_client_sns.PublishCommand).callsFake(async (input) => {
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
          MessageId: (0, import_crypto.randomUUID)(),
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
var import_client_sqs = require("@aws-sdk/client-sqs");
var import_crypto2 = require("crypto");
var import_aws_sdk_client_mock6 = require("aws-sdk-client-mock");
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
  (0, import_aws_sdk_client_mock6.mockClient)(import_client_sqs.SQSClient).on(import_client_sqs.GetQueueUrlCommand).callsFake((input) => ({ QueueUrl: input.QueueName })).on(import_client_sqs.SendMessageCommand).callsFake(async (input) => {
    const callback = get(input);
    await callback({
      Records: [{
        body: input.MessageBody,
        messageId: (0, import_crypto2.randomUUID)(),
        messageAttributes: formatAttributes(input.MessageAttributes)
      }]
    });
  }).on(import_client_sqs.SendMessageBatchCommand).callsFake(async (input) => {
    const callback = get(input);
    await callback({
      Records: input.Entries.map((entry) => ({
        body: entry.MessageBody,
        messageId: entry.Id || (0, import_crypto2.randomUUID)(),
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
var import_client_ssm = require("@aws-sdk/client-ssm");
var import_aws_sdk_client_mock7 = require("aws-sdk-client-mock");
var mockSSM = (values) => {
  (0, import_aws_sdk_client_mock7.mockClient)(import_client_ssm.SSMClient).on(import_client_ssm.GetParametersCommand).callsFake((input) => {
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
var import_client_sesv2 = require("@aws-sdk/client-sesv2");
var import_aws_sdk_client_mock8 = require("aws-sdk-client-mock");
var mockSES = () => {
  const fn = vi.fn();
  (0, import_aws_sdk_client_mock8.mockClient)(import_client_sesv2.SESv2Client).on(import_client_sesv2.SendEmailCommand).callsFake(() => {
    fn();
  });
  beforeEach(() => {
    fn.mockClear();
  });
  return fn;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
