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
import { GetCommand } from "@aws-sdk/lib-dynamodb";

// src/client.ts
import { globalClient } from "@awsless/utils";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
var dynamoDBClient = globalClient(() => {
  return new DynamoDBClient({});
});
var dynamoDBDocumentClient = globalClient(() => {
  return DynamoDBDocumentClient.from(dynamoDBClient(), {
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
  const command = new GetCommand({
    TableName: table.name,
    Key: key,
    ConsistentRead: options.consistentRead
  });
  addProjectionExpression(command.input, options, generator(), table);
  const result = await send(command, options);
  return result.Item;
};

// src/operations/put-item.ts
import { PutCommand } from "@aws-sdk/lib-dynamodb";
var putItem = async (table, item, options = {}) => {
  const command = new PutCommand({
    TableName: table.toString(),
    Item: item
  });
  addReturnValues(command.input, options);
  addConditionExpression(command.input, options, generator(), table);
  const result = await send(command, options);
  return result.Attributes;
};

// src/operations/update-item.ts
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
var updateItem = async (table, key, options) => {
  const gen = generator();
  const update = options.update(gen, table);
  const command = new UpdateCommand({
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
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
var deleteItem = async (table, key, options = {}) => {
  const command = new DeleteCommand({
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
import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";
var batchGetItem = async (table, keys, options = { filterNonExistentItems: false }) => {
  let response = [];
  let unprocessedKeys = keys;
  const projection = options.projection && options.projection(generator(), table);
  while (unprocessedKeys.length) {
    const command = new BatchGetCommand({
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
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
var query = async (table, options) => {
  const { forward = true } = options;
  const gen = generator();
  const keyCondition = options.keyCondition(gen, table);
  const command = new QueryCommand({
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
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
var scan = async (table, options = {}) => {
  const command = new ScanCommand({
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
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
var transactWrite = async (options) => {
  const command = new TransactWriteCommand({
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
import { ConditionalCheckFailedException, TransactionCanceledException } from "@aws-sdk/client-dynamodb";

// src/test/mock.ts
import { BatchGetItemCommand, BatchWriteItemCommand, CreateTableCommand as CreateTableCommand2, DeleteItemCommand, DynamoDBClient as DynamoDBClient3, GetItemCommand, ListTablesCommand, PutItemCommand, QueryCommand as QueryCommand2, ScanCommand as ScanCommand2, TransactGetItemsCommand, TransactWriteItemsCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DeleteCommand as DeleteCommand2, DynamoDBDocumentClient as DynamoDBDocumentClient3, GetCommand as GetCommand2, PutCommand as PutCommand3, TransactGetCommand, TransactWriteCommand as TransactWriteCommand2, UpdateCommand as UpdateCommand2, QueryCommand as Query, ScanCommand as Scan, BatchGetCommand as BatchGetCommand2 } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBServer } from "@awsless/dynamodb-server";
import { requestPort } from "@awsless/test";

// src/test/seed.ts
import { PutCommand as PutCommand2 } from "@aws-sdk/lib-dynamodb";
var seed = (client, data) => {
  return Promise.all(Object.entries(data).map(([TableName, items]) => {
    return Promise.all(items.map(async (item) => {
      try {
        await client.send(new PutCommand2({
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
import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
var migrate2 = (client, tables) => {
  return Promise.all([tables].flat().map((definition) => {
    return client.send(new CreateTableCommand({
      ...definition,
      BillingMode: "PAY_PER_REQUEST"
    }));
  }));
};

// src/test/mock.ts
var mockDynamoDB = (configOrServer) => {
  let server;
  if (configOrServer instanceof DynamoDBServer) {
    server = configOrServer;
  } else {
    server = new DynamoDBServer();
    let releasePort;
    beforeAll && beforeAll(async () => {
      const [port, release] = await requestPort();
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
  mockClient(DynamoDBClient3).on(CreateTableCommand2).callsFake((input) => clientSend(new CreateTableCommand2(input))).on(ListTablesCommand).callsFake((input) => clientSend(new ListTablesCommand(input))).on(GetItemCommand).callsFake((input) => clientSend(new GetItemCommand(input))).on(PutItemCommand).callsFake((input) => clientSend(new PutItemCommand(input))).on(DeleteItemCommand).callsFake((input) => clientSend(new DeleteItemCommand(input))).on(UpdateItemCommand).callsFake((input) => clientSend(new UpdateItemCommand(input))).on(QueryCommand2).callsFake((input) => clientSend(new QueryCommand2(input))).on(ScanCommand2).callsFake((input) => clientSend(new ScanCommand2(input))).on(BatchGetItemCommand).callsFake((input) => clientSend(new BatchGetItemCommand(input))).on(BatchWriteItemCommand).callsFake((input) => clientSend(new BatchWriteItemCommand(input))).on(TransactGetItemsCommand).callsFake((input) => clientSend(new TransactGetItemsCommand(input))).on(TransactWriteItemsCommand).callsFake((input) => clientSend(new TransactWriteItemsCommand(input)));
  mockClient(DynamoDBDocumentClient3).on(GetCommand2).callsFake((input) => documentClientSend(new GetCommand2(input))).on(PutCommand3).callsFake((input) => documentClientSend(new PutCommand3(input))).on(DeleteCommand2).callsFake((input) => documentClientSend(new DeleteCommand2(input))).on(UpdateCommand2).callsFake((input) => documentClientSend(new UpdateCommand2(input))).on(Query).callsFake((input) => documentClientSend(new Query(input))).on(Scan).callsFake((input) => documentClientSend(new Scan(input))).on(BatchGetCommand2).callsFake((input) => documentClientSend(new BatchGetCommand2(input))).on(BatchWriteCommand).callsFake((input) => documentClientSend(new BatchWriteCommand(input))).on(TransactGetCommand).callsFake((input) => documentClientSend(new TransactGetCommand(input))).on(TransactWriteCommand2).callsFake((input) => documentClientSend(new TransactWriteCommand2(input)));
  return server;
};
export {
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
};
