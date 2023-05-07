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
    for (const [key3, type] of Object.entries(schema)) {
      const value = unmarshalled[key3];
      if (typeof value === "undefined") {
        continue;
      }
      marshalled[key3] = type.marshall(value);
    }
    return marshalled;
  },
  (marshalled) => {
    const unmarshalled = {};
    for (const [key3, type] of Object.entries(schema)) {
      const value = marshalled[key3];
      if (typeof value === "undefined") {
        continue;
      }
      unmarshalled[key3] = type.unmarshall(value);
    }
    return unmarshalled;
  },
  (path, ...rest) => {
    return rest.length ? schema[path].walk?.(...rest) : schema[path];
  }
);

// src/structs/record.ts
var record = (struct) => new Struct(
  "M",
  (unmarshalled) => {
    const marshalled = {};
    for (const [key3, value] of Object.entries(unmarshalled)) {
      marshalled[key3] = struct.marshall(value);
    }
    return marshalled;
  },
  (marshalled) => {
    const unmarshalled = {};
    for (const [key3, value] of Object.entries(marshalled)) {
      unmarshalled[key3] = struct.unmarshall(value);
    }
    return unmarshalled;
  },
  (_, ...rest) => {
    return rest.length ? struct.walk?.(...rest) : struct;
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

// src/structs/date.ts
var date = () => new Struct(
  "N",
  (value) => String(value.getTime()),
  (value) => new Date(Number(value))
);

// src/structs/unknown.ts
var unknown = () => new Struct(
  "S",
  (value) => JSON.stringify(value),
  (value) => JSON.parse(value)
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
import { BatchGetItemCommand, BatchWriteItemCommand, CreateTableCommand as CreateTableCommand2, DeleteItemCommand, DynamoDBClient as DynamoDBClient2, GetItemCommand, ListTablesCommand, PutItemCommand, QueryCommand, ScanCommand, TransactGetItemsCommand, TransactWriteItemsCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DeleteCommand, DynamoDBDocumentClient as DynamoDBDocumentClient2, GetCommand, PutCommand as PutCommand2, TransactGetCommand, TransactWriteCommand, UpdateCommand, QueryCommand as Query, ScanCommand as Scan, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBServer } from "@awsless/dynamodb-server";
import { requestPort } from "@heat/request-port";

// src/test/seed.ts
import { PutCommand } from "@aws-sdk/lib-dynamodb";
var seed = (client2, data) => {
  return Promise.all(Object.entries(data).map(([TableName, items]) => {
    return Promise.all(items.map(async (item) => {
      try {
        await client2.send(new PutCommand({
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
    return client2.send(new CreateTableCommand({
      ...table,
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
  mockClient(DynamoDBClient2).on(CreateTableCommand2).callsFake((input) => clientSend(new CreateTableCommand2(input))).on(ListTablesCommand).callsFake((input) => clientSend(new ListTablesCommand(input))).on(GetItemCommand).callsFake((input) => clientSend(new GetItemCommand(input))).on(PutItemCommand).callsFake((input) => clientSend(new PutItemCommand(input))).on(DeleteItemCommand).callsFake((input) => clientSend(new DeleteItemCommand(input))).on(UpdateItemCommand).callsFake((input) => clientSend(new UpdateItemCommand(input))).on(QueryCommand).callsFake((input) => clientSend(new QueryCommand(input))).on(ScanCommand).callsFake((input) => clientSend(new ScanCommand(input))).on(BatchGetItemCommand).callsFake((input) => clientSend(new BatchGetItemCommand(input))).on(BatchWriteItemCommand).callsFake((input) => clientSend(new BatchWriteItemCommand(input))).on(TransactGetItemsCommand).callsFake((input) => clientSend(new TransactGetItemsCommand(input))).on(TransactWriteItemsCommand).callsFake((input) => clientSend(new TransactWriteItemsCommand(input)));
  mockClient(DynamoDBDocumentClient2).on(GetCommand).callsFake((input) => documentClientSend(new GetCommand(input))).on(PutCommand2).callsFake((input) => documentClientSend(new PutCommand2(input))).on(DeleteCommand).callsFake((input) => documentClientSend(new DeleteCommand(input))).on(UpdateCommand).callsFake((input) => documentClientSend(new UpdateCommand(input))).on(Query).callsFake((input) => documentClientSend(new Query(input))).on(Scan).callsFake((input) => documentClientSend(new Scan(input))).on(BatchGetCommand).callsFake((input) => documentClientSend(new BatchGetCommand(input))).on(BatchWriteCommand).callsFake((input) => documentClientSend(new BatchWriteCommand(input))).on(TransactGetCommand).callsFake((input) => documentClientSend(new TransactGetCommand(input))).on(TransactWriteCommand).callsFake((input) => documentClientSend(new TransactWriteCommand(input)));
  return server;
};

// src/client.ts
import { globalClient } from "@awsless/utils";
import { DynamoDBDocumentClient as DynamoDBDocumentClient3 } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient as DynamoDBClient3 } from "@aws-sdk/client-dynamodb";
var dynamoDBClient = globalClient(() => {
  return new DynamoDBClient3({});
});
var dynamoDBDocumentClient = globalClient(() => {
  return DynamoDBDocumentClient3.from(dynamoDBClient(), {
    marshallOptions: {
      removeUndefinedValues: true
    }
  });
});
var client = (options) => {
  return options.client || dynamoDBClient();
};

// src/index.ts
import { DynamoDBDocumentClient as DynamoDBDocumentClient4 } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient as DynamoDBClient4 } from "@aws-sdk/client-dynamodb";

// src/exceptions/transaction-canceled.ts
import { TransactionCanceledException as Exception } from "@aws-sdk/client-dynamodb";
Exception.prototype.conditionFailedAt = (index) => {
  return (void 0).CancellationReasons?.[index]?.Code === "ConditionalCheckFailed";
};

// src/index.ts
import { ConditionalCheckFailedException, TransactionCanceledException } from "@aws-sdk/client-dynamodb";

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
  path(key3) {
    if (Array.isArray(key3)) {
      return key3.map((name, index) => {
        if (typeof name === "string") {
          return `${index === 0 ? "" : "."}${this.name(name)}`;
        }
        return `[${name}]`;
      }).join("");
    }
    return this.name(key3);
  }
  name(key3) {
    if (!this.cacheN.has(key3)) {
      this.cacheN.set(key3, ++this.countN);
    }
    return `#n${this.cacheN.get(key3)}`;
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
      for (const [key3, id] of this.cacheN) {
        names[`#n${id}`] = key3;
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
import { GetItemCommand as GetItemCommand2 } from "@aws-sdk/client-dynamodb";

// src/helper/debug.ts
var debug = (options = {}, command) => {
  if (options.debug) {
    console.log("DynamoDB:", JSON.stringify(command.input, null, 2));
  }
};

// src/operations/get-item.ts
var getItem = async (table, key3, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new GetItemCommand2({
    TableName: table.name,
    Key: table.marshall(key3),
    ConsistentRead: options.consistentRead,
    ProjectionExpression: projectionExpression(options, gen),
    ...gen.attributeNames()
  });
  debug(options, command);
  const result = await client(options).send(command);
  if (result.Item) {
    return table.unmarshall(result.Item);
  }
  return void 0;
};

// src/helper/chainable.ts
var key = Symbol();
var Chain = class {
  [key];
  constructor(query2) {
    this[key] = query2;
  }
};
var isValue = (item) => {
  return typeof item.v !== "undefined";
};
var isPath = (item) => {
  return typeof item.p !== "undefined";
};
var merge = (chain, ...items) => {
  return [
    ...chain[key],
    ...items
  ];
};
var build = (items, gen) => {
  return items.map((item) => {
    if (isValue(item)) {
      return gen.value(item.v, item.p);
    }
    if (isPath(item)) {
      return gen.path(item.p);
    }
    return item;
  });
};
var chainData = (chain) => {
  return chain[key];
};

// src/expressions/condition.ts
var Condition = class extends Chain {
  where(...path) {
    return new Where(merge(this), path);
  }
  extend(fn) {
    return fn(this);
  }
};
var Where = class extends Chain {
  constructor(query2, path) {
    super(query2);
    this.path = path;
  }
  get not() {
    return new Where(merge(this, "NOT"), this.path);
  }
  get exists() {
    return new Combine(merge(this, "attribute_exists(", { p: this.path }, ")"));
  }
  get size() {
    return new Size(merge(this), this.path);
  }
  compare(comparator, v) {
    return new Combine(merge(this, "(", { p: this.path }, comparator, { v, p: this.path }, ")"));
  }
  fn(fnName, v) {
    return new Combine(merge(this, `${fnName}(`, { p: this.path }, ",", v, ")"));
  }
  eq(value) {
    return this.compare("=", value);
  }
  nq(value) {
    return this.compare("<>", value);
  }
  gt(value) {
    return this.compare(">", value);
  }
  gte(value) {
    return this.compare(">=", value);
  }
  lt(value) {
    return this.compare("<", value);
  }
  lte(value) {
    return this.compare("<=", value);
  }
  between(min, max) {
    return new Combine(merge(
      this,
      "(",
      { p: this.path },
      "BETWEEN",
      { v: min, p: this.path },
      "AND",
      { v: max, p: this.path },
      ")"
    ));
  }
  in(values) {
    return new Combine(merge(
      this,
      "(",
      { p: this.path },
      "IN (",
      ...values.map((v) => ({ v, p: this.path })).map((v, i) => i === 0 ? v : [",", v]).flat(),
      "))"
    ));
  }
  attributeType(value) {
    return this.fn("attribute_type", { v: { S: value } });
  }
  beginsWith(value) {
    return this.fn("begins_with", { v: { S: value } });
  }
  contains(value) {
    return this.fn("contains", { v: value, p: [...this.path, 0] });
  }
};
var Size = class extends Chain {
  constructor(query2, path) {
    super(query2);
    this.path = path;
  }
  compare(comparator, num) {
    return new Combine(merge(this, "(", "size(", { p: this.path }, ")", comparator, { v: { N: String(num) } }, ")"));
  }
  eq(value) {
    return this.compare("=", value);
  }
  nq(value) {
    return this.compare("<>", value);
  }
  gt(value) {
    return this.compare(">", value);
  }
  gte(value) {
    return this.compare(">=", value);
  }
  lt(value) {
    return this.compare("<", value);
  }
  lte(value) {
    return this.compare("<=", value);
  }
  between(min, max) {
    return new Combine(merge(
      this,
      "(",
      "size(",
      { p: this.path },
      ")",
      "BETWEEN",
      { v: { N: String(min) } },
      "AND",
      { v: { N: String(max) } },
      ")"
    ));
  }
};
var Combine = class extends Chain {
  get and() {
    return new Condition(merge(this, "AND"));
  }
  get or() {
    return new Condition(merge(this, "OR"));
  }
};
var conditionExpression = (options, gen) => {
  if (options.condition) {
    const condition = options.condition(new Condition([]));
    const query2 = build(chainData(condition), gen).join(" ");
    return query2;
  }
  return;
};

// src/operations/put-item.ts
import { PutItemCommand as PutItemCommand2 } from "@aws-sdk/client-dynamodb";
var putItem = async (table, item, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new PutItemCommand2({
    TableName: table.name,
    Item: table.marshall(item),
    ConditionExpression: conditionExpression(options, gen),
    ReturnValues: options.return,
    ...gen.attributes()
  });
  debug(options, command);
  const result = await client(options).send(command);
  if (result.Attributes) {
    return table.unmarshall(result.Attributes);
  }
  return void 0;
};

// src/operations/update-item.ts
import { UpdateItemCommand as UpdateItemCommand2 } from "@aws-sdk/client-dynamodb";

// src/expressions/update.ts
var key2 = Symbol();
var Chain2 = class {
  [key2];
  constructor(data) {
    this[key2] = data;
  }
};
var m = (chain, op, ...items) => {
  const d = chain[key2];
  const n = {
    set: [...d.set],
    add: [...d.add],
    rem: [...d.rem],
    del: [...d.del]
  };
  if (op && items.length) {
    n[op].push(items);
  }
  return n;
};
var UpdateExpression = class extends Chain2 {
  /** Update a given property */
  update(...path) {
    return new Update(m(this), path);
  }
  extend(fn) {
    return fn(this);
  }
};
var Update = class extends Chain2 {
  constructor(query2, path) {
    super(query2);
    this.path = path;
  }
  u(op, ...items) {
    return new UpdateExpression(m(this, op, ...items));
  }
  i(op, value = 1, initialValue = 0) {
    return this.u(
      "set",
      { p: this.path },
      "=",
      "if_not_exists(",
      { p: this.path },
      ",",
      { v: { N: String(initialValue) } },
      ")",
      op,
      { v: { N: String(value) } }
    );
  }
  /** Set a value */
  set(value) {
    return this.u("set", { p: this.path }, "=", { v: value, p: this.path });
  }
  /** Set a value if the attribute doesn't already exists */
  setIfNotExists(value) {
    return this.u(
      "set",
      { p: this.path },
      "=",
      "if_not_exists(",
      { p: this.path },
      ",",
      { v: value, p: this.path },
      ")"
    );
  }
  /** Delete a property */
  del() {
    return this.u("rem", { p: this.path });
  }
  /** Increment a numeric value */
  incr(value = 1, initialValue = 0) {
    return this.i("+", value, initialValue);
  }
  /** Decrement a numeric value */
  decr(value = 1, initialValue = 0) {
    return this.i("-", value, initialValue);
  }
  /** Append values to a Set */
  append(values) {
    return this.u("add", { p: this.path }, { v: values, p: this.path });
  }
  /** Remove values from a Set */
  remove(values) {
    return this.u("del", { p: this.path }, { v: values, p: this.path });
  }
};
var updateExpression = (options, gen) => {
  const update = options.update(new UpdateExpression({
    set: [],
    add: [],
    rem: [],
    del: []
  }));
  const buildList = (name, list) => {
    if (list.length) {
      return [
        name,
        list.map((items) => build(items, gen).join(" ")).join(", ")
      ];
    }
    return [];
  };
  const data = update[key2];
  const query2 = [
    ...buildList("SET", data.set),
    ...buildList("ADD", data.add),
    ...buildList("REMOVE", data.rem),
    ...buildList("DELETE", data.del)
  ].join(" ");
  return query2;
};

// src/operations/update-item.ts
var updateItem = async (table, key3, options) => {
  const gen = new IDGenerator(table);
  const command = new UpdateItemCommand2({
    TableName: table.name,
    Key: table.marshall(key3),
    UpdateExpression: updateExpression(options, gen),
    ConditionExpression: conditionExpression(options, gen),
    ReturnValues: options.return,
    ...gen.attributes()
  });
  debug(options, command);
  const result = await client(options).send(command);
  if (result.Attributes) {
    return table.unmarshall(result.Attributes);
  }
  return void 0;
};

// src/operations/delete-item.ts
import { DeleteItemCommand as DeleteItemCommand2 } from "@aws-sdk/client-dynamodb";
var deleteItem = async (table, key3, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new DeleteItemCommand2({
    TableName: table.name,
    Key: table.marshall(key3),
    ConditionExpression: conditionExpression(options, gen),
    ReturnValues: options.return,
    ...gen.attributes()
  });
  debug(options, command);
  const result = await client(options).send(command);
  if (result.Attributes) {
    return table.unmarshall(result.Attributes);
  }
  return void 0;
};

// src/operations/query.ts
import { QueryCommand as QueryCommand2 } from "@aws-sdk/client-dynamodb";

// src/expressions/key-condition.ts
var KeyCondition = class extends Chain {
  where(path) {
    return new Where2(merge(this), path);
  }
  extend(fn) {
    return fn(this);
  }
};
var Where2 = class extends Chain {
  constructor(query2, path) {
    super(query2);
    this.path = path;
  }
  compare(comparator, v) {
    return new Combine2(merge(this, "(", { p: [this.path] }, comparator, { v, p: [this.path] }, ")"));
  }
  eq(value) {
    return this.compare("=", value);
  }
  gt(value) {
    return this.compare(">", value);
  }
  gte(value) {
    return this.compare(">=", value);
  }
  lt(value) {
    return this.compare("<", value);
  }
  lte(value) {
    return this.compare("<=", value);
  }
  between(min, max) {
    return new Combine2(merge(
      this,
      "(",
      { p: [this.path] },
      "BETWEEN",
      { v: min, p: [this.path] },
      "AND",
      { v: max, p: [this.path] },
      ")"
    ));
  }
  beginsWith(value) {
    return new Combine2(merge(this, "begins_with(", { p: [this.path] }, ",", { v: value, p: [this.path] }, ")"));
  }
};
var Combine2 = class extends Chain {
  get and() {
    return new KeyCondition(merge(this, "AND"));
  }
  get or() {
    return new KeyCondition(merge(this, "OR"));
  }
};
var keyConditionExpression = (options, gen) => {
  const condition = options.keyCondition(new KeyCondition([]));
  const query2 = build(chainData(condition), gen).join(" ");
  return query2;
};

// src/operations/query.ts
var query = async (table, options) => {
  const { forward = true } = options;
  const gen = new IDGenerator(table);
  const command = new QueryCommand2({
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
  debug(options, command);
  const result = await client(options).send(command);
  return {
    count: result.Count || 0,
    items: result.Items?.map((item) => table.unmarshall(item)) || [],
    cursor: result.LastEvaluatedKey && table.unmarshall(result.LastEvaluatedKey)
  };
};

// src/operations/get-indexed-item.ts
var getIndexedItem = async (table, key3, options) => {
  const keys = table.indexes[options.index];
  const result = await query(table, {
    ...options,
    limit: 1,
    keyCondition(exp) {
      const query2 = exp.where(keys.hash).eq(key3[keys.hash]);
      if (!keys.sort) {
        return query2;
      }
      return query2.and.where(keys.sort).eq(key3[keys.sort]);
    }
  });
  return result.items[0];
};

// src/operations/batch-get-item.ts
import { BatchGetItemCommand as BatchGetItemCommand2 } from "@aws-sdk/client-dynamodb";
var batchGetItem = async (table, keys, options = { filterNonExistentItems: false }) => {
  let response = [];
  let unprocessedKeys = keys.map((key3) => table.marshall(key3));
  const gen = new IDGenerator(table);
  const projection = projectionExpression(options, gen);
  const attributes = gen.attributeNames();
  while (unprocessedKeys.length) {
    const command = new BatchGetItemCommand2({
      RequestItems: {
        [table.name]: {
          Keys: unprocessedKeys,
          ConsistentRead: options.consistentRead,
          ProjectionExpression: projection,
          ...attributes
        }
      }
    });
    debug(options, command);
    const result = await client(options).send(command);
    unprocessedKeys = result.UnprocessedKeys?.[table.name]?.Keys || [];
    response = [
      ...response,
      ...(result.Responses?.[table.name] || []).map(
        (item) => table.unmarshall(item)
      )
    ];
  }
  const list = keys.map((key3) => {
    return response.find((item) => {
      for (const i in key3) {
        const k = i;
        if (key3[k] !== item?.[k]) {
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

// src/operations/batch-put-item.ts
import { BatchWriteItemCommand as BatchWriteItemCommand2 } from "@aws-sdk/client-dynamodb";
import chunk from "chunk";
var batchPutItem = async (table, items, options = {}) => {
  await Promise.all(chunk(items, 25).map(async (items2) => {
    let unprocessedItems = {
      [table.name]: items2.map((item) => ({
        PutRequest: {
          Item: table.marshall(item)
        }
      }))
    };
    while (unprocessedItems?.[table.name]?.length) {
      const command = new BatchWriteItemCommand2({
        RequestItems: unprocessedItems
      });
      debug(options, command);
      const result = await client(options).send(command);
      unprocessedItems = result.UnprocessedItems;
    }
  }));
};

// src/operations/batch-delete-item.ts
import { BatchWriteItemCommand as BatchWriteItemCommand3 } from "@aws-sdk/client-dynamodb";
import chunk2 from "chunk";
var batchDeleteItem = async (table, keys, options = {}) => {
  await Promise.all(chunk2(keys, 25).map(async (items) => {
    let unprocessedItems = {
      [table.name]: items.map((item) => ({
        DeleteRequest: {
          Key: table.marshall(item)
        }
      }))
    };
    while (unprocessedItems?.[table.name]?.length) {
      const command = new BatchWriteItemCommand3({
        RequestItems: unprocessedItems
      });
      debug(options, command);
      const result = await client(options).send(command);
      unprocessedItems = result.UnprocessedItems;
    }
  }));
};

// src/operations/scan.ts
import { ScanCommand as ScanCommand2 } from "@aws-sdk/client-dynamodb";
var scan = async (table, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new ScanCommand2({
    TableName: table.name,
    IndexName: options.index,
    ConsistentRead: options.consistentRead,
    Limit: options.limit || 10,
    ExclusiveStartKey: options.cursor && table.marshall(options.cursor),
    ProjectionExpression: projectionExpression(options, gen),
    ...gen.attributeNames()
  });
  debug(options, command);
  const result = await client(options).send(command);
  return {
    count: result.Count || 0,
    items: result.Items?.map((item) => table.unmarshall(item)) || [],
    cursor: result.LastEvaluatedKey && table.unmarshall(result.LastEvaluatedKey)
  };
};

// src/operations/query-all.ts
var queryAll = function* (table, options) {
  let cursor = options.cursor;
  let done = false;
  const loop = async () => {
    const result = await query(table, {
      client: options.client,
      index: options.index,
      keyCondition: options.keyCondition,
      projection: options.projection,
      consistentRead: options.consistentRead,
      forward: options.forward,
      limit: options.batch,
      cursor
    });
    cursor = result.cursor;
    if (result.items.length === 0 || !result.cursor) {
      done = true;
    }
    return result.items;
  };
  while (!done) {
    yield loop();
  }
};

// src/operations/scan-all.ts
var scanAll = function* (table, options) {
  let cursor = options.cursor;
  let done = false;
  const loop = async () => {
    const result = await scan(table, {
      client: options.client,
      projection: options.projection,
      consistentRead: options.consistentRead,
      limit: options.batch,
      cursor
    });
    cursor = result.cursor;
    if (result.items.length === 0 || !result.cursor) {
      done = true;
    }
    return result.items;
  };
  while (!done) {
    yield loop();
  }
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

// src/operations/paginate-query.ts
var paginateQuery = async (table, options) => {
  const result = await query(table, {
    ...options,
    cursor: options.cursor ? table.unmarshall(fromCursor(options.cursor)) : void 0
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
    cursor: result.cursor && toCursor(table.marshall(result.cursor))
  };
};

// src/operations/paginate-scan.ts
var paginateScan = async (table, options = {}) => {
  const result = await scan(table, {
    ...options,
    cursor: options.cursor ? table.unmarshall(fromCursor(options.cursor)) : void 0
  });
  if (result.cursor) {
    const more = await scan(table, {
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
    cursor: result.cursor && toCursor(table.marshall(result.cursor))
  };
};

// src/operations/transact-write.ts
import { TransactWriteItemsCommand as TransactWriteItemsCommand2 } from "@aws-sdk/client-dynamodb";
var transactWrite = async (options) => {
  const command = new TransactWriteItemsCommand2({
    ClientRequestToken: options.idempotantKey,
    TransactItems: options.items
  });
  debug(options, command);
  await client(options).send(command);
};
var transactConditionCheck = (table, key3, options) => {
  const gen = new IDGenerator(table);
  return {
    ConditionCheck: {
      TableName: table.name,
      Key: table.marshall(key3),
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
var transactUpdate = (table, key3, options) => {
  const gen = new IDGenerator(table);
  return {
    Update: {
      TableName: table.name,
      Key: table.marshall(key3),
      UpdateExpression: updateExpression(options, gen),
      ConditionExpression: conditionExpression(options, gen),
      ...gen.attributes()
    }
  };
};
var transactDelete = (table, key3, options = {}) => {
  const gen = new IDGenerator(table);
  return {
    Delete: {
      TableName: table.name,
      Key: table.marshall(key3),
      ConditionExpression: conditionExpression(options, gen),
      ...gen.attributes()
    }
  };
};
export {
  ConditionalCheckFailedException,
  DynamoDBClient4 as DynamoDBClient,
  DynamoDBDocumentClient4 as DynamoDBDocumentClient,
  TableDefinition,
  TransactionCanceledException,
  array,
  batchDeleteItem,
  batchGetItem,
  batchPutItem,
  bigfloat,
  bigint,
  bigintSet,
  binary,
  binarySet,
  boolean,
  date,
  define,
  deleteItem,
  dynamoDBClient,
  dynamoDBDocumentClient,
  getIndexedItem,
  getItem,
  mockDynamoDB,
  number,
  numberSet,
  object,
  optional,
  paginateQuery,
  paginateScan,
  putItem,
  query,
  queryAll,
  record,
  scan,
  scanAll,
  string,
  stringSet,
  transactConditionCheck,
  transactDelete,
  transactPut,
  transactUpdate,
  transactWrite,
  unknown,
  updateItem
};
