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
  ConditionalCheckFailedException: () => import_client_dynamodb12.ConditionalCheckFailedException,
  TransactionCanceledException: () => import_client_dynamodb12.TransactionCanceledException,
  array: () => array,
  batchGetItem: () => batchGetItem,
  bigfloat: () => bigfloat,
  bigint: () => bigint,
  bigintSet: () => bigintSet,
  binary: () => binary,
  binarySet: () => binarySet,
  boolean: () => boolean,
  define: () => define,
  deleteItem: () => deleteItem,
  dynamoDBClient: () => dynamoDBClient,
  dynamoDBDocumentClient: () => dynamoDBDocumentClient,
  getItem: () => getItem,
  migrate: () => migrate2,
  mockDynamoDB: () => mockDynamoDB,
  number: () => number,
  numberSet: () => numberSet,
  object: () => object,
  optional: () => optional,
  pagination: () => pagination,
  putItem: () => putItem,
  query: () => query,
  scan: () => scan,
  string: () => string,
  stringSet: () => stringSet,
  transactConditionCheck: () => transactConditionCheck,
  transactDelete: () => transactDelete,
  transactPut: () => transactPut,
  transactUpdate: () => transactUpdate,
  transactWrite: () => transactWrite,
  updateItem: () => updateItem
});
module.exports = __toCommonJS(src_exports);

// src/table.ts
var TableDefinition = class {
  constructor(name, opt) {
    this.name = name;
    this.hash = opt.hash;
    this.sort = opt.sort;
    this.schema = opt.schema;
    this.indexes = opt.indexes;
  }
  hash;
  sort;
  schema;
  indexes;
  marshall(item) {
    return this.schema._marshall(item);
  }
  unmarshall(item) {
    return this.schema._unmarshall(item);
  }
};
var define = (name, options) => new TableDefinition(name, options);

// src/structs/struct.ts
var Struct = class {
  // declare readonly OPTIONAL: Optional
  constructor(type, _marshall, _unmarshall, walk = void 0, optional2 = false) {
    this.type = type;
    this._marshall = _marshall;
    this._unmarshall = _unmarshall;
    this.walk = walk;
    this.optional = optional2;
  }
  marshall(value) {
    return {
      [this.type]: this._marshall(value)
    };
  }
  unmarshall(value) {
    return this._unmarshall(value[this.type]);
  }
};

// src/structs/optional.ts
var optional = (struct) => {
  return new Struct(
    struct.type,
    struct._marshall,
    struct._unmarshall,
    struct.walk,
    true
  );
};

// src/structs/string.ts
var string = () => new Struct(
  "S",
  (value) => value,
  (value) => value
);

// src/structs/boolean.ts
var boolean = () => new Struct(
  "BOOL",
  (value) => value,
  (value) => value
);

// src/structs/number.ts
var number = () => new Struct(
  "N",
  (value) => value.toString(),
  (value) => Number(value)
);

// src/structs/bigint.ts
var bigint = () => new Struct(
  "N",
  (value) => value.toString(),
  (value) => BigInt(value)
);

// ../../node_modules/.pnpm/bigfloat-esnext@3.0.1/node_modules/bigfloat-esnext/lib/esm/predicates.js
function is_big_float(big) {
  return typeof big === "object" && typeof big.coefficient === "bigint" && Number.isSafeInteger(big.exponent);
}
function is_negative(big) {
  return big.coefficient < BIGINT_ZERO;
}
function is_zero(big) {
  return big.coefficient === BIGINT_ZERO;
}

// ../../node_modules/.pnpm/bigfloat-esnext@3.0.1/node_modules/bigfloat-esnext/lib/esm/constructors.js
function make_big_float(coefficient, exponent) {
  if (coefficient === BIGINT_ZERO) {
    return ZERO;
  }
  const new_big_float = /* @__PURE__ */ Object.create(null);
  new_big_float.coefficient = coefficient;
  new_big_float.exponent = exponent;
  return Object.freeze(new_big_float);
}
function normalize(a) {
  let { coefficient, exponent } = a;
  if (exponent !== 0) {
    if (exponent > 0) {
      coefficient = coefficient * BIGINT_TEN ** BigInt(exponent);
      exponent = 0;
    } else {
      let quotient;
      let remainder;
      while (exponent <= -7) {
        quotient = coefficient / BIGINT_TEN_MILLION;
        remainder = coefficient % BIGINT_TEN_MILLION;
        if (remainder !== BIGINT_ZERO) {
          break;
        }
        coefficient = quotient;
        exponent += 7;
      }
      while (exponent < 0) {
        quotient = coefficient / BIGINT_TEN;
        remainder = coefficient % BIGINT_TEN;
        if (remainder !== BIGINT_ZERO) {
          break;
        }
        coefficient = quotient;
        exponent += 1;
      }
    }
  }
  return make_big_float(coefficient, exponent);
}
function integer(a) {
  const { coefficient, exponent } = a;
  if (exponent === 0) {
    return a;
  }
  if (exponent > 0) {
    return make_big_float(coefficient * BIGINT_TEN ** BigInt(exponent), 0);
  }
  return make_big_float(coefficient / BIGINT_TEN ** BigInt(-exponent), 0);
}
function make(a, b) {
  const number_pattern = /^(-?\d+)(?:\.(\d*))?(?:e(-?\d+))?$/;
  if (typeof a === "bigint") {
    return make_big_float(a, Number(b) || 0);
  } else if (typeof a === "string" || typeof a === "number") {
    a = String(a);
    if (Number.isSafeInteger(Number(b))) {
      return make(BigInt(parseInt(a, Number(b))), 0);
    }
    const parts = a.match(number_pattern);
    if (parts) {
      const frac = parts[2] || "";
      return make(BigInt(parts[1] + frac), (Number(parts[3]) || 0) - frac.length);
    }
  } else if (is_big_float(a)) {
    return a;
  }
  return ZERO;
}
function string2(a, radix) {
  if (is_zero(a)) {
    return "0";
  }
  if (radix && is_big_float(radix)) {
    radix = normalize(radix);
    return radix && radix.exponent === 0 ? integer(a).coefficient.toString(Number(radix.coefficient)) : void 0;
  }
  a = normalize(a);
  let s = (is_negative(a) ? -a.coefficient : a.coefficient).toString();
  if (a.exponent < 0) {
    let point = s.length + a.exponent;
    if (point <= 0) {
      s = "0".repeat(1 - point) + s;
      point = 1;
    }
    s = s.slice(0, point) + "." + s.slice(point);
  } else if (a.exponent > 0) {
    s += "0".repeat(a.exponent);
  }
  if (is_negative(a)) {
    s = "-" + s;
  }
  return s;
}

// ../../node_modules/.pnpm/bigfloat-esnext@3.0.1/node_modules/bigfloat-esnext/lib/esm/constants.js
var BIGINT_ZERO = BigInt("0");
var BIGINT_ONE = BigInt("1");
var BIGINT_TEN = BigInt("10");
var BIGINT_TEN_MILLION = BigInt("10000000");
var ZERO = /* @__PURE__ */ Object.create(null);
ZERO.coefficient = BIGINT_ZERO;
ZERO.exponent = 0;
Object.freeze(ZERO);
var PRECISION = -4;
function set_precision(n) {
  n = Number(n);
  if (!Number.isInteger(n) || Number(n) >= 0) {
    throw Error("Only negative integers are allowed for precision.");
  }
  PRECISION = n;
}
var EPSILON = make("0.0000000000000000000000000000000000000000000000001");
var ONE = make("1");
var TWO = make("2");

// ../../node_modules/.pnpm/bigfloat-esnext@3.0.1/node_modules/bigfloat-esnext/lib/esm/arithmetic.js
function conform_op(op) {
  return function(a, b) {
    const differential = a.exponent - b.exponent;
    return differential === 0 ? make_big_float(op(a.coefficient, b.coefficient), a.exponent) : differential > 0 ? make_big_float(op(a.coefficient * BIGINT_TEN ** BigInt(differential), b.coefficient), b.exponent) : make_big_float(op(a.coefficient, b.coefficient * BIGINT_TEN ** BigInt(-differential)), a.exponent);
  };
}
var add = conform_op((a, b) => a + b);
var sub = conform_op((a, b) => a - b);

// ../big-float/dist/index.js
set_precision(-12);
var BigFloat2 = class {
  exponent;
  coefficient;
  constructor(number3) {
    const { exponent, coefficient } = make(number3);
    this.exponent = exponent;
    this.coefficient = coefficient;
  }
  toJSON() {
    return this.toString();
  }
  toString(radix) {
    if (typeof radix !== "undefined") {
      radix = make(radix);
    }
    return string2(this, radix);
  }
};

// src/structs/bigfloat.ts
var bigfloat = () => new Struct(
  "N",
  (value) => new BigFloat2(value).toString(),
  (value) => new BigFloat2(value)
);

// src/structs/binary.ts
var binary = () => new Struct(
  "B",
  (value) => value,
  (value) => value
);

// src/structs/object.ts
var object = (schema) => new Struct(
  "M",
  (unmarshalled) => {
    const marshalled = {};
    for (const [key, type] of Object.entries(schema)) {
      const value = unmarshalled[key];
      if (typeof value === "undefined") {
        continue;
      }
      marshalled[key] = type.marshall(value);
    }
    return marshalled;
  },
  (marshalled) => {
    const unmarshalled = {};
    for (const [key, type] of Object.entries(schema)) {
      const value = marshalled[key];
      if (typeof value === "undefined") {
        continue;
      }
      unmarshalled[key] = type.unmarshall(value);
    }
    return unmarshalled;
  },
  (path, ...rest) => {
    return rest.length ? schema[path].walk?.(...rest) : schema[path];
  }
);

// src/structs/array.ts
var array = (struct) => new Struct(
  "L",
  (unmarshalled) => unmarshalled.map((item) => struct.marshall(item)),
  (marshalled) => marshalled.map((item) => struct.unmarshall(item)),
  (_, ...rest) => {
    return rest.length ? struct.walk?.(...rest) : struct;
  }
);

// src/structs/set/string.ts
var stringSet = () => new Struct(
  "SS",
  (value) => Array.from(value),
  (value) => new Set(value),
  () => string()
);

// src/structs/set/number.ts
var numberSet = () => new Struct(
  "NS",
  (value) => Array.from(value).map((item) => item.toString()),
  (value) => new Set(value.map((item) => Number(item))),
  () => number()
);

// src/structs/set/bigint.ts
var bigintSet = () => new Struct(
  "NS",
  (value) => Array.from(value).map((item) => item.toString()),
  (value) => new Set(value.map((item) => BigInt(item))),
  () => bigint()
);

// src/structs/set/binary.ts
var binarySet = () => new Struct(
  "BS",
  (value) => Array.from(value),
  (value) => new Set(value),
  () => binary()
);

// src/test/mock.ts
var import_client_dynamodb2 = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb2 = require("@aws-sdk/lib-dynamodb");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var import_dynamodb_server = require("@awsless/dynamodb-server");
var import_request_port = require("@heat/request-port");

// src/test/seed.ts
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var seed = (client2, data) => {
  return Promise.all(Object.entries(data).map(([TableName, items]) => {
    return Promise.all(items.map(async (item) => {
      try {
        await client2.send(new import_lib_dynamodb.PutCommand({
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
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");

// src/test/serialize.ts
var filter = (list) => {
  return list.filter((item) => !!item);
};
var unique = (list) => {
  const unique2 = {};
  list.forEach((item) => {
    unique2[item.AttributeName] = item;
  });
  return Object.values(unique2);
};
var serializeTable = (table) => {
  const indexes = Object.entries(table.indexes || {});
  const result = {
    TableName: table.name,
    KeySchema: filter([
      {
        KeyType: "HASH",
        AttributeName: table.hash
      },
      table.sort ? {
        KeyType: "SORT",
        AttributeName: table.sort
      } : void 0
    ]),
    AttributeDefinitions: unique(filter([
      {
        AttributeName: table.hash,
        AttributeType: table.schema.walk?.(table.hash).type
      },
      table.sort ? {
        AttributeName: table.sort,
        AttributeType: table.schema.walk?.(table.sort).type
      } : void 0,
      ...indexes.map(([_, item]) => [
        {
          AttributeName: item.hash,
          AttributeType: table.schema.walk?.(item.hash).type
        },
        item.sort ? {
          AttributeName: item.sort,
          AttributeType: table.schema.walk?.(item.sort).type
        } : void 0
      ]).flat()
    ]))
  };
  if (indexes.length) {
    result.GlobalSecondaryIndexes = indexes.map(([name, item]) => ({
      Projection: { ProjectionType: "ALL" },
      IndexName: name,
      KeySchema: filter([
        {
          KeyType: "HASH",
          AttributeName: item.hash
        },
        item.sort ? {
          KeyType: "SORT",
          AttributeName: item.sort
        } : void 0
      ])
    }));
  }
  return result;
};

// src/test/migrate.ts
var migrate = (client2, tables) => {
  return Promise.all([tables].flat().map((table) => {
    if (table instanceof TableDefinition) {
      table = serializeTable(table);
    }
    return client2.send(new import_client_dynamodb.CreateTableCommand({
      ...table,
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
      const [port, release] = await (0, import_request_port.requestPort)();
      releasePort = release;
      await server.listen(port);
      await server.wait();
      if (configOrServer.tables) {
        await migrate(server.getClient(), configOrServer.tables);
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
  const client2 = server.getClient();
  const documentClient = server.getDocumentClient();
  const clientSend = (command) => {
    if (client2.__proto__.send.wrappedMethod) {
      return client2.__proto__.send.wrappedMethod.call(client2, command);
    }
    return client2.send(command);
  };
  const documentClientSend = (command) => {
    if (documentClient.__proto__.send.wrappedMethod) {
      return documentClient.__proto__.send.wrappedMethod.call(documentClient, command);
    }
    return documentClient.send(command);
  };
  (0, import_aws_sdk_client_mock.mockClient)(import_client_dynamodb2.DynamoDBClient).on(import_client_dynamodb2.CreateTableCommand).callsFake((input) => clientSend(new import_client_dynamodb2.CreateTableCommand(input))).on(import_client_dynamodb2.ListTablesCommand).callsFake((input) => clientSend(new import_client_dynamodb2.ListTablesCommand(input))).on(import_client_dynamodb2.GetItemCommand).callsFake((input) => clientSend(new import_client_dynamodb2.GetItemCommand(input))).on(import_client_dynamodb2.PutItemCommand).callsFake((input) => clientSend(new import_client_dynamodb2.PutItemCommand(input))).on(import_client_dynamodb2.DeleteItemCommand).callsFake((input) => clientSend(new import_client_dynamodb2.DeleteItemCommand(input))).on(import_client_dynamodb2.UpdateItemCommand).callsFake((input) => clientSend(new import_client_dynamodb2.UpdateItemCommand(input))).on(import_client_dynamodb2.QueryCommand).callsFake((input) => clientSend(new import_client_dynamodb2.QueryCommand(input))).on(import_client_dynamodb2.ScanCommand).callsFake((input) => clientSend(new import_client_dynamodb2.ScanCommand(input))).on(import_client_dynamodb2.BatchGetItemCommand).callsFake((input) => clientSend(new import_client_dynamodb2.BatchGetItemCommand(input))).on(import_client_dynamodb2.BatchWriteItemCommand).callsFake((input) => clientSend(new import_client_dynamodb2.BatchWriteItemCommand(input))).on(import_client_dynamodb2.TransactGetItemsCommand).callsFake((input) => clientSend(new import_client_dynamodb2.TransactGetItemsCommand(input))).on(import_client_dynamodb2.TransactWriteItemsCommand).callsFake((input) => clientSend(new import_client_dynamodb2.TransactWriteItemsCommand(input)));
  (0, import_aws_sdk_client_mock.mockClient)(import_lib_dynamodb2.DynamoDBDocumentClient).on(import_lib_dynamodb2.GetCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.GetCommand(input))).on(import_lib_dynamodb2.PutCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.PutCommand(input))).on(import_lib_dynamodb2.DeleteCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.DeleteCommand(input))).on(import_lib_dynamodb2.UpdateCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.UpdateCommand(input))).on(import_lib_dynamodb2.QueryCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.QueryCommand(input))).on(import_lib_dynamodb2.ScanCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.ScanCommand(input))).on(import_lib_dynamodb2.BatchGetCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.BatchGetCommand(input))).on(import_lib_dynamodb2.BatchWriteCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.BatchWriteCommand(input))).on(import_lib_dynamodb2.TransactGetCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.TransactGetCommand(input))).on(import_lib_dynamodb2.TransactWriteCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.TransactWriteCommand(input)));
  return server;
};

// src/client.ts
var import_utils = require("@awsless/utils");
var import_lib_dynamodb3 = require("@aws-sdk/lib-dynamodb");
var import_client_dynamodb3 = require("@aws-sdk/client-dynamodb");
var dynamoDBClient = (0, import_utils.globalClient)(() => {
  return new import_client_dynamodb3.DynamoDBClient({});
});
var dynamoDBDocumentClient = (0, import_utils.globalClient)(() => {
  return import_lib_dynamodb3.DynamoDBDocumentClient.from(dynamoDBClient(), {
    marshallOptions: {
      removeUndefinedValues: true
    }
  });
});
var client = (options) => {
  return options.client || dynamoDBClient();
};

// src/expressions/projection.ts
var projectionExpression = (options, gen) => {
  if (options.projection) {
    return options.projection.map((path) => gen.path(path)).join(", ");
  }
  return;
};

// src/helper/id-generator.ts
var IDGenerator = class {
  constructor(table) {
    this.table = table;
  }
  cacheN = /* @__PURE__ */ new Map();
  countN = 0;
  cacheV = /* @__PURE__ */ new Map();
  countV = 0;
  path(key) {
    if (Array.isArray(key)) {
      return key.map((name, index) => {
        if (typeof name === "string") {
          return `${index === 0 ? "" : "."}${this.name(name)}`;
        }
        return `[${name}]`;
      }).join("");
    }
    return this.name(key);
  }
  name(key) {
    if (!this.cacheN.has(key)) {
      this.cacheN.set(key, ++this.countN);
    }
    return `#n${this.cacheN.get(key)}`;
  }
  value(value, path) {
    if (!this.cacheV.has(value)) {
      this.cacheV.set(value, { path, id: ++this.countV });
    }
    return `:v${this.cacheV.get(value).id}`;
  }
  attributeNames() {
    const attrs = {};
    if (this.cacheN.size > 0) {
      const names = {};
      for (const [key, id] of this.cacheN) {
        names[`#n${id}`] = key;
      }
      attrs.ExpressionAttributeNames = names;
    }
    return attrs;
  }
  attributeValues() {
    const attrs = {};
    if (this.cacheV.size > 0) {
      const values = {};
      for (const [value, { path, id }] of this.cacheV) {
        values[`:v${id}`] = path ? this.table.schema.walk?.(...path)?.marshall(value) : value;
      }
      attrs.ExpressionAttributeValues = values;
    }
    return attrs;
  }
  attributes() {
    return {
      ...this.attributeNames(),
      ...this.attributeValues()
    };
  }
};

// src/operations/get-item.ts
var import_client_dynamodb4 = require("@aws-sdk/client-dynamodb");
var getItem = async (table, key, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new import_client_dynamodb4.GetItemCommand({
    TableName: table.name,
    Key: table.marshall(key),
    ConsistentRead: options.consistentRead,
    ProjectionExpression: projectionExpression(options, gen),
    ...gen.attributeNames()
  });
  const result = await client(options).send(command);
  if (result.Item) {
    return table.unmarshall(result.Item);
  }
  return void 0;
};

// src/expressions/conditions.ts
var conditionExpression = (options, gen) => {
  if (options.condition) {
    const query2 = [];
    const q = (v, response) => {
      query2.push(v);
      return response;
    };
    const condition = () => ({
      where: (...path) => where(path)
    });
    const where = (path) => {
      const n = gen.path(path);
      const v = (value) => gen.value(value, path);
      const c = combiner();
      return {
        get not() {
          return q(`NOT`, where(path));
        },
        eq: (value) => q(`(${n} = ${v(value)})`, c),
        nq: (value) => q(`(${n} <> ${v(value)})`, c),
        gt: (value) => q(`(${n} > ${v(value)})`, c),
        gte: (value) => q(`(${n} >= ${v(value)})`, c),
        lt: (value) => q(`(${n} < ${v(value)})`, c),
        lte: (value) => q(`(${n} <= ${v(value)})`, c),
        between: (min, max) => q(`(${n} BETWEEN ${v(min)} AND ${v(max)})`, c),
        in: (values) => q(`(${n} IN (${values.map((value) => v(value)).join(", ")})`, c),
        get exists() {
          return q(`attribute_exists(${n})`, c);
        },
        // get attributeNotExists() { return q(`attribute_not_exists(${n})`, c) },
        attributeType: (value) => q(`attribute_type(${n}, ${gen.value({ S: value })})`, c),
        beginsWith: (value) => q(`begins_with(${n}, ${v(value)})`, c),
        contains: (value) => q(`contains(${n}, ${gen.value(value, [...path, 0])})`, c),
        get size() {
          return size(n, c);
        }
      };
    };
    const size = (n, c) => {
      const v = (value) => gen.value({ N: String(value) });
      return {
        eq: (value) => q(`(size(${n}) = ${v(value)})`, c),
        nq: (value) => q(`(size(${n}) <> ${v(value)})`, c),
        gt: (value) => q(`(size(${n}) > ${v(value)})`, c),
        gte: (value) => q(`(size(${n}) >= ${v(value)})`, c),
        lt: (value) => q(`(size(${n}) < ${v(value)})`, c),
        lte: (value) => q(`(size(${n}) <= ${v(value)})`, c),
        between: (min, max) => q(`(size(${n}) BETWEEN ${v(min)} AND ${v(max)})`, c)
      };
    };
    const combiner = () => ({
      get and() {
        return q(`AND`, condition());
      },
      get or() {
        return q(`OR`, condition());
      }
    });
    options.condition(condition());
    return query2.join(" ");
  }
  return;
};

// src/operations/put-item.ts
var import_client_dynamodb5 = require("@aws-sdk/client-dynamodb");
var putItem = async (table, item, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new import_client_dynamodb5.PutItemCommand({
    TableName: table.name,
    Item: table.marshall(item),
    ConditionExpression: conditionExpression(options, gen),
    ReturnValues: options.return,
    ...gen.attributes()
  });
  const result = await client(options).send(command);
  if (result.Attributes) {
    return table.unmarshall(result.Attributes);
  }
  return void 0;
};

// src/operations/update-item.ts
var import_client_dynamodb6 = require("@aws-sdk/client-dynamodb");

// src/expressions/update.ts
var updateExpression = (options, gen) => {
  const sets = [];
  const adds = [];
  const rems = [];
  const dels = [];
  const raws = [];
  const q = (list, v, response) => {
    list.push(v);
    return response;
  };
  const start = () => ({
    update: (...path) => update(path),
    raw: (fn) => {
      raws.push(fn(
        (...path) => gen.path(path),
        (value) => gen.value(value)
      ));
    }
  });
  const update = (path) => {
    const n = gen.path(path);
    const v = (value) => gen.value(value, path);
    const s = start();
    return {
      set: (value) => q(sets, `${n} = ${v(value)}`, s),
      del: () => q(rems, n, s),
      incr: (value = 1, initialValue = 0) => q(sets, `${n} = ${v(value)} + if_not_exists(${n}, ${v(initialValue)})`, s),
      decr: (value = 1, initialValue = 0) => q(sets, `${n} = ${v(value)} - if_not_exists(${n}, ${v(initialValue)})`, s),
      append: (values) => q(adds, `${n} ${v(values)}`, s),
      remove: (values) => q(dels, `${n} ${v(values)}`, s)
    };
  };
  options.update(start());
  if (raws.length) {
    return raws.join(" ");
  }
  const query2 = [];
  if (sets.length)
    query2.push(`SET ${sets.join(", ")}`);
  if (rems.length)
    query2.push(`REMOVE ${rems.join(", ")}`);
  if (adds.length)
    query2.push(`ADD ${adds.join(", ")}`);
  if (dels.length)
    query2.push(`DELETE ${dels.join(", ")}`);
  return query2.join(" ");
};

// src/operations/update-item.ts
var updateItem = async (table, key, options) => {
  const gen = new IDGenerator(table);
  const command = new import_client_dynamodb6.UpdateItemCommand({
    TableName: table.name,
    Key: table.marshall(key),
    UpdateExpression: updateExpression(options, gen),
    ConditionExpression: conditionExpression(options, gen),
    ReturnValues: options.return,
    ...gen.attributes()
  });
  const result = await client(options).send(command);
  if (result.Attributes) {
    return table.unmarshall(result.Attributes);
  }
  return void 0;
};

// src/operations/delete-item.ts
var import_client_dynamodb7 = require("@aws-sdk/client-dynamodb");
var deleteItem = async (table, key, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new import_client_dynamodb7.DeleteItemCommand({
    TableName: table.name,
    Key: table.marshall(key),
    ConditionExpression: conditionExpression(options, gen),
    ReturnValues: options.return,
    ...gen.attributes()
  });
  const result = await client(options).send(command);
  if (result.Attributes) {
    return table.unmarshall(result.Attributes);
  }
  return void 0;
};

// src/operations/batch-get-item.ts
var import_client_dynamodb8 = require("@aws-sdk/client-dynamodb");
var batchGetItem = async (table, keys, options = { filterNonExistentItems: false }) => {
  let response = [];
  let unprocessedKeys = keys.map((key) => table.marshall(key));
  const gen = new IDGenerator(table);
  const projection = projectionExpression(options, gen);
  const attributes = gen.attributeNames();
  while (unprocessedKeys.length) {
    const command = new import_client_dynamodb8.BatchGetItemCommand({
      RequestItems: {
        [table.name]: {
          Keys: unprocessedKeys,
          ConsistentRead: options.consistentRead,
          ProjectionExpression: projection,
          ...attributes
        }
      }
    });
    const result = await client(options).send(command);
    unprocessedKeys = result.UnprocessedKeys?.[table.name]?.Keys || [];
    response = [
      ...response,
      ...(result.Responses?.[table.name] || []).map(
        (item) => table.unmarshall(item)
      )
    ];
  }
  const list = keys.map((key) => {
    return response.find((item) => {
      for (const i in key) {
        const k = i;
        if (key[k] !== item?.[k]) {
          return false;
        }
      }
      return true;
    });
  });
  if (options.filterNonExistentItems) {
    return list.filter((item) => !!item);
  }
  return list;
};

// src/helper/cursor.ts
var fromCursor = (cursor) => {
  return JSON.parse(
    Buffer.from(cursor, "base64").toString("utf-8")
  );
};
var toCursor = (value) => {
  return Buffer.from(
    JSON.stringify(value),
    "utf-8"
  ).toString("base64");
};

// src/operations/query.ts
var import_client_dynamodb9 = require("@aws-sdk/client-dynamodb");

// src/expressions/key-condition.ts
var keyConditionExpression = (options, gen) => {
  const query2 = [];
  const q = (v, response) => {
    query2.push(v);
    return response;
  };
  const condition = () => ({
    where: (path) => where(path)
  });
  const where = (path) => {
    const n = gen.path(path);
    const v = (value) => gen.value(value, [path]);
    const c = combiner();
    return {
      eq: (value) => q(`(${n} = ${v(value)})`, c),
      gt: (value) => q(`(${n} > ${v(value)})`, c),
      gte: (value) => q(`(${n} >= ${v(value)})`, c),
      lt: (value) => q(`(${n} < ${v(value)})`, c),
      lte: (value) => q(`(${n} <= ${v(value)})`, c),
      between: (min, max) => q(`(${n} BETWEEN ${v(min)} AND ${v(max)})`, c),
      beginsWith: (value) => q(`begins_with(${n}, ${v(value)})`, c)
    };
  };
  const combiner = () => ({
    get and() {
      return q(`AND`, condition());
    },
    get or() {
      return q(`OR`, condition());
    }
  });
  options.keyCondition(condition());
  return query2.join(" ");
};

// src/operations/query.ts
var query = async (table, options) => {
  const { forward = true } = options;
  const gen = new IDGenerator(table);
  const command = new import_client_dynamodb9.QueryCommand({
    TableName: table.name,
    IndexName: options.index,
    KeyConditionExpression: keyConditionExpression(options, gen),
    ConsistentRead: options.consistentRead,
    ScanIndexForward: forward,
    Limit: options.limit || 10,
    ExclusiveStartKey: options.cursor && table.marshall(options.cursor),
    ProjectionExpression: projectionExpression(options, gen),
    ...gen.attributes()
  });
  const result = await client(options).send(command);
  return {
    count: result.Count || 0,
    items: result.Items?.map((item) => table.unmarshall(item)) || [],
    cursor: result.LastEvaluatedKey && table.unmarshall(result.LastEvaluatedKey)
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
var import_client_dynamodb10 = require("@aws-sdk/client-dynamodb");
var scan = async (table, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new import_client_dynamodb10.ScanCommand({
    TableName: table.name,
    IndexName: options.index,
    ConsistentRead: options.consistentRead,
    Limit: options.limit || 10,
    ExclusiveStartKey: options.cursor && table.marshall(options.cursor),
    ProjectionExpression: projectionExpression(options, gen),
    ...gen.attributeNames()
  });
  const result = await client(options).send(command);
  return {
    count: result.Count || 0,
    items: result.Items?.map((item) => table.unmarshall(item)) || [],
    cursor: result.LastEvaluatedKey && table.unmarshall(result.LastEvaluatedKey)
  };
};

// src/operations/transact-write.ts
var import_client_dynamodb11 = require("@aws-sdk/client-dynamodb");
var transactWrite = async (options) => {
  const command = new import_client_dynamodb11.TransactWriteItemsCommand({
    ClientRequestToken: options.idempotantKey,
    TransactItems: options.items
  });
  await client(options).send(command);
};
var transactConditionCheck = (table, key, options) => {
  const gen = new IDGenerator(table);
  return {
    ConditionCheck: {
      TableName: table.name,
      Key: table.marshall(key),
      ConditionExpression: conditionExpression(options, gen),
      ...gen.attributes()
    }
  };
};
var transactPut = (table, item, options = {}) => {
  const gen = new IDGenerator(table);
  return {
    Put: {
      TableName: table.name,
      Item: table.marshall(item),
      ConditionExpression: conditionExpression(options, gen),
      ...gen.attributes()
    }
  };
};
var transactUpdate = (table, key, options) => {
  const gen = new IDGenerator(table);
  return {
    Update: {
      TableName: table.name,
      Key: table.marshall(key),
      UpdateExpression: updateExpression(options, gen),
      ConditionExpression: conditionExpression(options, gen),
      ...gen.attributes()
    }
  };
};
var transactDelete = (table, key, options = {}) => {
  const gen = new IDGenerator(table);
  return {
    Delete: {
      TableName: table.name,
      Key: table.marshall(key),
      ConditionExpression: conditionExpression(options, gen),
      ...gen.attributes()
    }
  };
};

// src/operations/migrate.ts
var migrate2 = async (from, to, options) => {
  let cursor;
  let itemsProcessed = 0;
  const loop = async () => {
    const result = await scan(from, {
      client: options.client,
      consistentRead: options.consistentRead,
      limit: options.batch || 1e3,
      // @ts-ignore
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
      return false;
    }
    cursor = result.cursor;
    return true;
  };
  for (; ; ) {
    if (!await loop()) {
      break;
    }
  }
  return {
    itemsProcessed
  };
};

// src/index.ts
var import_client_dynamodb12 = require("@aws-sdk/client-dynamodb");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConditionalCheckFailedException,
  TransactionCanceledException,
  array,
  batchGetItem,
  bigfloat,
  bigint,
  bigintSet,
  binary,
  binarySet,
  boolean,
  define,
  deleteItem,
  dynamoDBClient,
  dynamoDBDocumentClient,
  getItem,
  migrate,
  mockDynamoDB,
  number,
  numberSet,
  object,
  optional,
  pagination,
  putItem,
  query,
  scan,
  string,
  stringSet,
  transactConditionCheck,
  transactDelete,
  transactPut,
  transactUpdate,
  transactWrite,
  updateItem
});
