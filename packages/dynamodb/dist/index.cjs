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
  ConditionalCheckFailedException: () => import_client_dynamodb4.ConditionalCheckFailedException,
  Table: () => Table,
  TransactionCanceledException: () => import_client_dynamodb4.TransactionCanceledException,
  batchGetItem: () => batchGetItem,
  deleteItem: () => deleteItem,
  dynamoDBClient: () => dynamoDBClient,
  dynamoDBDocumentClient: () => dynamoDBDocumentClient,
  getItem: () => getItem,
  migrate: () => migrate,
  mockDynamoDB: () => mockDynamoDB,
  pagination: () => pagination,
  putItem: () => putItem,
  ql: () => ql,
  query: () => query,
  scan: () => scan,
  transactConditionCheck: () => transactConditionCheck,
  transactDelete: () => transactDelete,
  transactPut: () => transactPut,
  transactUpdate: () => transactUpdate,
  transactWrite: () => transactWrite,
  updateItem: () => updateItem
});
module.exports = __toCommonJS(src_exports);

// src/ql.ts
var ql = (literals, ...raw) => {
  return (gen) => {
    const names = {};
    const values = {};
    const string = [];
    const nameKeys = /* @__PURE__ */ new Map();
    const valueKeys = /* @__PURE__ */ new Map();
    literals.forEach((literal, i) => {
      string.push(literal);
      if (i in raw) {
        const value = raw[i];
        const key = valueKeys.get(value) || `:v${gen()}`;
        valueKeys.set(value, key);
        string.push(key);
        values[key] = value;
      }
    });
    const query2 = string.join("").replace(/[\r\n]/gm, "").replace(/#([a-z0-9]+)/ig, (_, name) => {
      const key = nameKeys.get(name) || `#n${gen()}`;
      nameKeys.set(name, key);
      names[key] = name;
      return key;
    });
    return { query: query2, names, values };
  };
};

// src/table.ts
var Table = class {
  constructor(name) {
    this.name = name;
  }
  toString() {
    return this.name;
  }
};

// src/operations/get-item.ts
var import_lib_dynamodb2 = require("@aws-sdk/lib-dynamodb");

// src/client.ts
var import_utils = require("@awsless/utils");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var dynamoDBClient = (0, import_utils.globalClient)(() => {
  return new import_client_dynamodb.DynamoDBClient({});
});
var dynamoDBDocumentClient = (0, import_utils.globalClient)(() => {
  return import_lib_dynamodb.DynamoDBDocumentClient.from(dynamoDBClient(), {
    marshallOptions: {
      removeUndefinedValues: true
    }
  });
});

// src/helper/send.ts
var send = (command, options) => {
  const client = options.client || dynamoDBDocumentClient();
  return client.send(command);
};

// src/helper/expression.ts
var addExpression = (command, expression) => {
  const names = { ...command.ExpressionAttributeNames || {}, ...expression.names };
  const values = { ...command.ExpressionAttributeValues || {}, ...expression.values };
  if (Object.keys(names).length) {
    command.ExpressionAttributeNames = names;
  }
  if (Object.keys(values).length) {
    command.ExpressionAttributeValues = values;
  }
};
var addReturnValues = (input, options) => {
  if (options.return) {
    input.ReturnValues = options.return;
  }
};
var addConditionExpression = (input, options, gen, table) => {
  if (options.condition) {
    const exp = options.condition(gen, table);
    input.ConditionExpression = exp.query;
    addExpression(input, exp);
  }
};
var addProjectionExpression = (input, options, gen, table) => {
  if (options.projection) {
    const exp = options.projection(gen, table);
    input.ProjectionExpression = exp.query;
    addExpression(input, exp);
  }
};
var generator = () => {
  let id = 0;
  return () => {
    return ++id;
  };
};

// src/operations/get-item.ts
var getItem = async (table, key, options = {}) => {
  const command = new import_lib_dynamodb2.GetCommand({
    TableName: table.name,
    Key: key,
    ConsistentRead: options.consistentRead
  });
  addProjectionExpression(command.input, options, generator(), table);
  const result = await send(command, options);
  return result.Item;
};

// src/operations/put-item.ts
var import_lib_dynamodb3 = require("@aws-sdk/lib-dynamodb");
var putItem = async (table, item, options = {}) => {
  const command = new import_lib_dynamodb3.PutCommand({
    TableName: table.toString(),
    Item: item
  });
  addReturnValues(command.input, options);
  addConditionExpression(command.input, options, generator(), table);
  const result = await send(command, options);
  return result.Attributes;
};

// src/operations/update-item.ts
var import_lib_dynamodb4 = require("@aws-sdk/lib-dynamodb");
var updateItem = async (table, key, options) => {
  const gen = generator();
  const update = options.update(gen, table);
  const command = new import_lib_dynamodb4.UpdateCommand({
    TableName: table.name,
    Key: key,
    UpdateExpression: update.query
  });
  addExpression(command.input, update);
  addReturnValues(command.input, options);
  addConditionExpression(command.input, options, gen, table);
  const result = await send(command, options);
  return result.Attributes;
};

// src/operations/delete-item.ts
var import_lib_dynamodb5 = require("@aws-sdk/lib-dynamodb");
var deleteItem = async (table, key, options = {}) => {
  const command = new import_lib_dynamodb5.DeleteCommand({
    TableName: table.name,
    Key: key
  });
  const gen = generator();
  addReturnValues(command.input, options);
  addConditionExpression(command.input, options, gen, table);
  const result = await send(command, options);
  return result.Attributes;
};

// src/operations/batch-get-item.ts
var import_lib_dynamodb6 = require("@aws-sdk/lib-dynamodb");
var batchGetItem = async (table, keys, options = { filterNonExistentItems: false }) => {
  let response = [];
  let unprocessedKeys = keys;
  const projection = options.projection && options.projection(generator(), table);
  while (unprocessedKeys.length) {
    const command = new import_lib_dynamodb6.BatchGetCommand({
      RequestItems: {
        [table.name]: {
          Keys: unprocessedKeys,
          ConsistentRead: options.consistentRead,
          ExpressionAttributeNames: projection?.names,
          ProjectionExpression: projection?.query
        }
      }
    });
    const result = await send(command, options);
    unprocessedKeys = result.UnprocessedKeys?.[table.name]?.Keys || [];
    response = [...response, ...result.Responses?.[table.name] || []];
  }
  if (options.filterNonExistentItems) {
    return response;
  }
  return keys.map((key) => {
    return response.find((item) => {
      for (const i in key) {
        if (key[i] !== item?.[i]) {
          return false;
        }
      }
      return true;
    });
  });
};

// src/helper/cursor.ts
var fromCursor = (cursor) => {
  return JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
};
var toCursor = (value) => {
  return Buffer.from(JSON.stringify(value), "utf-8").toString("base64");
};

// src/operations/query.ts
var import_lib_dynamodb7 = require("@aws-sdk/lib-dynamodb");
var query = async (table, options) => {
  const { forward = true } = options;
  const gen = generator();
  const keyCondition = options.keyCondition(gen, table);
  const command = new import_lib_dynamodb7.QueryCommand({
    TableName: table.name,
    IndexName: options.index,
    KeyConditionExpression: keyCondition.query,
    ConsistentRead: options.consistentRead,
    ScanIndexForward: forward,
    Limit: options.limit || 10,
    ExclusiveStartKey: options.cursor
  });
  addExpression(command.input, keyCondition);
  addProjectionExpression(command.input, options, gen, table);
  const result = await send(command, options);
  return {
    count: result.Count || 0,
    items: result.Items || [],
    cursor: result.LastEvaluatedKey
  };
};

// src/operations/pagination.ts
var pagination = async (table, options) => {
  const result = await query(table, {
    ...options,
    cursor: options.cursor ? fromCursor(options.cursor) : void 0
  });
  if (result.cursor) {
    const more = await query(table, {
      ...options,
      limit: 1,
      cursor: result.cursor
    });
    if (more.count === 0) {
      delete result.cursor;
    }
  }
  return {
    ...result,
    cursor: result.cursor && toCursor(result.cursor)
  };
};

// src/operations/scan.ts
var import_lib_dynamodb8 = require("@aws-sdk/lib-dynamodb");
var scan = async (table, options = {}) => {
  const command = new import_lib_dynamodb8.ScanCommand({
    TableName: table.toString(),
    IndexName: options.index,
    ConsistentRead: options.consistentRead,
    Limit: options.limit || 10,
    ExclusiveStartKey: options.cursor
  });
  addProjectionExpression(command.input, options, generator(), table);
  const result = await send(command, options);
  return {
    count: result.Count || 0,
    items: result.Items || [],
    cursor: result.LastEvaluatedKey
  };
};

// src/operations/transact-write.ts
var import_lib_dynamodb9 = require("@aws-sdk/lib-dynamodb");
var transactWrite = async (options) => {
  const command = new import_lib_dynamodb9.TransactWriteCommand({
    ClientRequestToken: options.idempotantKey,
    TransactItems: options.items
  });
  await send(command, options);
};
var transactConditionCheck = (table, key, options) => {
  const gen = generator();
  const condition = options.condition(gen, table);
  const command = {
    ConditionCheck: {
      TableName: table.toString(),
      Key: key,
      ConditionExpression: condition.query
    }
  };
  addExpression(command.ConditionCheck, condition);
  return command;
};
var transactPut = (table, item, options = {}) => {
  const command = {
    Put: {
      TableName: table.name,
      Item: item
    }
  };
  addConditionExpression(command.Put, options, generator(), table);
  return command;
};
var transactUpdate = (table, key, options) => {
  const gen = generator();
  const update = options.update(gen, table);
  const command = {
    Update: {
      TableName: table.toString(),
      Key: key,
      UpdateExpression: update.query
    }
  };
  addExpression(command.Update, update);
  addConditionExpression(command.Update, options, gen, table);
  return command;
};
var transactDelete = (table, key, options = {}) => {
  const command = {
    Delete: {
      TableName: table.toString(),
      Key: key
    }
  };
  addConditionExpression(command.Delete, options, generator(), table);
  return command;
};

// src/operations/migrate.ts
var migrate = async (from, to, options) => {
  let cursor = void 0;
  let itemsProcessed = 0;
  for (; ; ) {
    const result = await scan(from, {
      client: options.client,
      consistentRead: options.consistentRead,
      limit: options.batch || 1e3,
      cursor
    });
    await Promise.all(result.items.map(async (item) => {
      const newItem = await options.transform(item);
      await putItem(to, newItem, {
        client: options.client
      });
      itemsProcessed++;
    }));
    if (result.items.length === 0 || !result.cursor) {
      break;
    }
    cursor = result.cursor;
  }
  return {
    itemsProcessed
  };
};

// src/index.ts
var import_client_dynamodb4 = require("@aws-sdk/client-dynamodb");

// src/test/mock.ts
var import_client_dynamodb3 = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb11 = require("@aws-sdk/lib-dynamodb");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var import_dynamodb_server = require("@awsless/dynamodb-server");
var import_test = require("@awsless/test");

// src/test/seed.ts
var import_lib_dynamodb10 = require("@aws-sdk/lib-dynamodb");
var seed = (client, data) => {
  return Promise.all(Object.entries(data).map(([TableName, items]) => {
    return Promise.all(items.map(async (item) => {
      try {
        await client.send(new import_lib_dynamodb10.PutCommand({
          TableName,
          Item: item
        }));
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`DynamoDB Seeding Error: ${error.message}`);
        }
        throw error;
      }
    }));
  }));
};

// src/test/migrate.ts
var import_client_dynamodb2 = require("@aws-sdk/client-dynamodb");
var migrate2 = (client, tables) => {
  return Promise.all([tables].flat().map((definition) => {
    return client.send(new import_client_dynamodb2.CreateTableCommand({
      ...definition,
      BillingMode: "PAY_PER_REQUEST"
    }));
  }));
};

// src/test/mock.ts
var mockDynamoDB = (configOrServer) => {
  let server;
  if (configOrServer instanceof import_dynamodb_server.DynamoDBServer) {
    server = configOrServer;
  } else {
    server = new import_dynamodb_server.DynamoDBServer();
    let releasePort;
    beforeAll && beforeAll(async () => {
      const [port, release] = await (0, import_test.requestPort)();
      releasePort = release;
      await server.listen(port);
      await server.wait();
      if (configOrServer.tables) {
        await migrate2(server.getClient(), configOrServer.tables);
        if (configOrServer.seed) {
          await seed(server.getDocumentClient(), configOrServer.seed);
        }
      }
    }, configOrServer.timeout);
    afterAll && afterAll(async () => {
      await server.kill();
      await releasePort();
    }, configOrServer.timeout);
  }
  const client = server.getClient();
  const documentClient = server.getDocumentClient();
  const clientSend = (command) => {
    return client.__proto__.send.wrappedMethod.call(client, command);
  };
  const documentClientSend = (command) => {
    return documentClient.__proto__.send.wrappedMethod.call(documentClient, command);
  };
  (0, import_aws_sdk_client_mock.mockClient)(import_client_dynamodb3.DynamoDBClient).on(import_client_dynamodb3.CreateTableCommand).callsFake((input) => clientSend(new import_client_dynamodb3.CreateTableCommand(input))).on(import_client_dynamodb3.ListTablesCommand).callsFake((input) => clientSend(new import_client_dynamodb3.ListTablesCommand(input))).on(import_client_dynamodb3.GetItemCommand).callsFake((input) => clientSend(new import_client_dynamodb3.GetItemCommand(input))).on(import_client_dynamodb3.PutItemCommand).callsFake((input) => clientSend(new import_client_dynamodb3.PutItemCommand(input))).on(import_client_dynamodb3.DeleteItemCommand).callsFake((input) => clientSend(new import_client_dynamodb3.DeleteItemCommand(input))).on(import_client_dynamodb3.UpdateItemCommand).callsFake((input) => clientSend(new import_client_dynamodb3.UpdateItemCommand(input))).on(import_client_dynamodb3.QueryCommand).callsFake((input) => clientSend(new import_client_dynamodb3.QueryCommand(input))).on(import_client_dynamodb3.ScanCommand).callsFake((input) => clientSend(new import_client_dynamodb3.ScanCommand(input))).on(import_client_dynamodb3.BatchGetItemCommand).callsFake((input) => clientSend(new import_client_dynamodb3.BatchGetItemCommand(input))).on(import_client_dynamodb3.BatchWriteItemCommand).callsFake((input) => clientSend(new import_client_dynamodb3.BatchWriteItemCommand(input))).on(import_client_dynamodb3.TransactGetItemsCommand).callsFake((input) => clientSend(new import_client_dynamodb3.TransactGetItemsCommand(input))).on(import_client_dynamodb3.TransactWriteItemsCommand).callsFake((input) => clientSend(new import_client_dynamodb3.TransactWriteItemsCommand(input)));
  (0, import_aws_sdk_client_mock.mockClient)(import_lib_dynamodb11.DynamoDBDocumentClient).on(import_lib_dynamodb11.GetCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb11.GetCommand(input))).on(import_lib_dynamodb11.PutCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb11.PutCommand(input))).on(import_lib_dynamodb11.DeleteCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb11.DeleteCommand(input))).on(import_lib_dynamodb11.UpdateCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb11.UpdateCommand(input))).on(import_lib_dynamodb11.QueryCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb11.QueryCommand(input))).on(import_lib_dynamodb11.ScanCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb11.ScanCommand(input))).on(import_lib_dynamodb11.BatchGetCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb11.BatchGetCommand(input))).on(import_lib_dynamodb11.BatchWriteCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb11.BatchWriteCommand(input))).on(import_lib_dynamodb11.TransactGetCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb11.TransactGetCommand(input))).on(import_lib_dynamodb11.TransactWriteCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb11.TransactWriteCommand(input)));
  return server;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConditionalCheckFailedException,
  Table,
  TransactionCanceledException,
  batchGetItem,
  deleteItem,
  dynamoDBClient,
  dynamoDBDocumentClient,
  getItem,
  migrate,
  mockDynamoDB,
  pagination,
  putItem,
  ql,
  query,
  scan,
  transactConditionCheck,
  transactDelete,
  transactPut,
  transactUpdate,
  transactWrite,
  updateItem
});
