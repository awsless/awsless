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
    for (let key3 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key3) && key3 !== except)
        __defProp(to, key3, { get: () => from[key3], enumerable: !(desc = __getOwnPropDesc(from, key3)) || desc.enumerable });
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
  BatchGetItemCommand: () => import_client_dynamodb20.BatchGetItemCommand,
  BatchWriteItemCommand: () => import_client_dynamodb20.BatchWriteItemCommand,
  ConditionalCheckFailedException: () => import_client_dynamodb21.ConditionalCheckFailedException,
  DeleteItemCommand: () => import_client_dynamodb17.DeleteItemCommand,
  DynamoDBClient: () => import_client_dynamodb16.DynamoDBClient,
  DynamoDBDocumentClient: () => import_lib_dynamodb3.DynamoDBDocumentClient,
  DynamoDBServer: () => import_dynamodb_server2.DynamoDBServer,
  GetItemCommand: () => import_client_dynamodb17.GetItemCommand,
  PutItemCommand: () => import_client_dynamodb17.PutItemCommand,
  QueryCommand: () => import_client_dynamodb18.QueryCommand,
  ScanCommand: () => import_client_dynamodb18.ScanCommand,
  Table: () => Table,
  TransactGetItemsCommand: () => import_client_dynamodb19.TransactGetItemsCommand,
  TransactWriteItemsCommand: () => import_client_dynamodb19.TransactWriteItemsCommand,
  TransactionCanceledException: () => import_client_dynamodb21.TransactionCanceledException,
  UpdateItemCommand: () => import_client_dynamodb17.UpdateItemCommand,
  any: () => any,
  array: () => array,
  batchDeleteItem: () => batchDeleteItem,
  batchGetItem: () => batchGetItem,
  batchPutItem: () => batchPutItem,
  bigfloat: () => bigfloat,
  bigint: () => bigint,
  bigintSet: () => bigintSet,
  binary: () => binary,
  binarySet: () => binarySet,
  boolean: () => boolean,
  date: () => date,
  define: () => define,
  deleteItem: () => deleteItem,
  dynamoDBClient: () => dynamoDBClient,
  dynamoDBDocumentClient: () => dynamoDBDocumentClient,
  getIndexedItem: () => getIndexedItem,
  getItem: () => getItem,
  json: () => json,
  migrate: () => migrate,
  mockDynamoDB: () => mockDynamoDB,
  number: () => number,
  numberEnum: () => numberEnum,
  numberSet: () => numberSet,
  object: () => object,
  optional: () => optional,
  paginateQuery: () => paginateQuery,
  paginateScan: () => paginateScan,
  putItem: () => putItem,
  query: () => query,
  queryAll: () => queryAll,
  record: () => record,
  scan: () => scan,
  scanAll: () => scanAll,
  seed: () => seed,
  seedTable: () => seedTable,
  streamTable: () => streamTable,
  string: () => string,
  stringEnum: () => stringEnum,
  stringSet: () => stringSet,
  transactConditionCheck: () => transactConditionCheck,
  transactDelete: () => transactDelete,
  transactPut: () => transactPut,
  transactUpdate: () => transactUpdate,
  transactWrite: () => transactWrite,
  ttl: () => ttl,
  unknown: () => unknown,
  updateItem: () => updateItem,
  uuid: () => uuid
});
module.exports = __toCommonJS(src_exports);

// src/table.ts
var Table = class {
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
    return this.schema.marshall(item).M;
  }
  unmarshall(item) {
    return this.schema.unmarshall({ M: item });
  }
};
var define = (name, options) => new Table(name, options);

// src/operations/transact-write.ts
var import_client_dynamodb2 = require("@aws-sdk/client-dynamodb");

// src/client.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var import_utils = require("@awsless/utils");
var import_node_http_handler = require("@smithy/node-http-handler");
var dynamoDBClient = /* @__PURE__ */ (0, import_utils.globalClient)(() => {
  return new import_client_dynamodb.DynamoDBClient({
    maxAttempts: 2,
    requestHandler: new import_node_http_handler.NodeHttpHandler({
      connectionTimeout: 3 * 1e3,
      requestTimeout: 3 * 1e3
    })
  });
});
var dynamoDBDocumentClient = /* @__PURE__ */ (0, import_utils.globalClient)(() => {
  return import_lib_dynamodb.DynamoDBDocumentClient.from(dynamoDBClient(), {
    marshallOptions: {
      removeUndefinedValues: true
    }
  });
});
var client = (options) => {
  return options.client || dynamoDBClient();
};

// src/helper/query.ts
var key = Symbol();
var cursor = Symbol();
var isValue = (item) => {
  return typeof item.v !== "undefined";
};
var isPath = (item) => {
  return typeof item.p !== "undefined";
};
var flatten = (builder) => {
  let current = builder;
  while (true) {
    const data = current[key];
    if (data.parent) {
      const parent = data.parent[key];
      const found = parent.items.findIndex((item) => item === cursor);
      const index = found >= 0 ? found : parent.items.length;
      parent.items = [...parent.items.slice(0, index), ...data.items, ...parent.items.slice(index + 1)];
      current = data.parent;
    } else {
      break;
    }
  }
  return current;
};
var build = (builder, gen) => {
  return builder[key].items.filter((item) => item !== cursor).map((item) => {
    if (item instanceof QueryBulder) {
      return build(flatten(item), gen);
    }
    if (isValue(item)) {
      return gen.value(item.v, item.p);
    }
    if (isPath(item)) {
      return gen.path(item.p);
    }
    return item;
  }).join(" ");
};
var QueryBulder = class {
  [key];
  constructor(parent = void 0, items = []) {
    this[key] = {
      parent,
      items
    };
  }
};

// src/expressions/condition.ts
var Condition = class _Condition extends QueryBulder {
  where(...path) {
    return new Where(this, [], path);
  }
  group(fn) {
    const combiner = fn(new _Condition());
    return new Combine(this, ["(", combiner, ")"]);
  }
  extend(fn) {
    return fn(new _Condition());
  }
  // where<P extends InferPath<T>>(...path:P) {
  // 	return new Where<T, P>(this, path))
  // }
  // group<R extends Combine<T>>(fn:(exp:Condition<T>) => R): R {
  // 	return fn(new Condition<T>(this, ['(', cursor, ')'])))
  // }
  // extend<R extends Combine<T> | Condition<T>>(fn:(exp:Condition<T>) => R): R {
  // 	return fn(new Condition<T>(this, [])))
  // }
};
var Where = class _Where extends QueryBulder {
  constructor(query2, items, path) {
    super(query2, items);
    this.path = path;
  }
  // constructor(items:QueryItem<T>[], private path:P) {
  // 	super(items)
  // }
  get not() {
    return new _Where(this, ["NOT"], this.path);
  }
  get exists() {
    return new Combine(this, ["attribute_exists(", { p: this.path }, ")"]);
  }
  get size() {
    return new Size(this, this.path);
  }
  compare(comparator, v) {
    return new Combine(this, ["(", { p: this.path }, comparator, { v, p: this.path }, ")"]);
  }
  fn(fnName, v) {
    return new Combine(this, [`${fnName}(`, { p: this.path }, ",", v, ")"]);
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
    return new Combine(this, [
      "(",
      { p: this.path },
      "BETWEEN",
      { v: min, p: this.path },
      "AND",
      { v: max, p: this.path },
      ")"
    ]);
  }
  in(values) {
    return new Combine(this, [
      "(",
      { p: this.path },
      "IN (",
      ...values.map((v) => ({ v, p: this.path })).map((v, i) => i === 0 ? v : [",", v]).flat(),
      "))"
    ]);
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
var Size = class extends QueryBulder {
  constructor(query2, path) {
    super(query2);
    this.path = path;
  }
  compare(comparator, num) {
    return new Combine(this, ["(", "size(", { p: this.path }, ")", comparator, { v: { N: String(num) } }, ")"]);
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
    return new Combine(this, [
      "(",
      "size(",
      { p: this.path },
      ")",
      "BETWEEN",
      { v: { N: String(min) } },
      "AND",
      { v: { N: String(max) } },
      ")"
    ]);
  }
};
var Combine = class extends QueryBulder {
  get and() {
    return new Condition(this, ["AND"]);
  }
  get or() {
    return new Condition(this, ["OR"]);
  }
};
var conditionExpression = (options, gen) => {
  if (options.condition) {
    return build(flatten(options.condition(new Condition())), gen);
  }
  return;
};

// src/expressions/update.ts
var key2 = Symbol();
var Chain = class {
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
var UpdateExpression = class extends Chain {
  /** Update a given property */
  update(...path) {
    return new Update(m(this), path);
  }
  extend(fn) {
    return fn(this);
  }
};
var Update = class extends Chain {
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
    if (typeof value === "undefined") {
      return this.del();
    }
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
  /** Set a attribute to a different but already existing attribute */
  setAttr(...path) {
    return this.u("set", { p: this.path }, "=", { p: path });
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
var build2 = (items, gen) => {
  return items.map((item) => {
    if (isValue(item)) {
      return gen.value(item.v, item.p);
    }
    if (isPath(item)) {
      return gen.path(item.p);
    }
    return item;
  }).join(" ");
};
var updateExpression = (options, gen) => {
  const update = options.update(
    new UpdateExpression({
      set: [],
      add: [],
      rem: [],
      del: []
    })
  );
  const buildList = (name, list) => {
    if (list.length) {
      return [name, list.map((items) => build2(items, gen)).join(", ")];
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

// src/helper/debug.ts
var debug = (options = {}, command) => {
  if (options.debug) {
    console.log("DynamoDB:", JSON.stringify(command.input, null, 2));
  }
};

// src/helper/id-generator.ts
var IDGenerator = class {
  constructor(table) {
    this.table = table;
  }
  cacheN = /* @__PURE__ */ new Map();
  countN = 0;
  cacheV = [];
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
    const id = ++this.countV;
    this.cacheV.push({ path, value, id });
    return `:v${id}`;
  }
  attributeNames() {
    const attrs = {};
    if (this.cacheN.size > 0) {
      const names = {};
      for (const [name, id] of this.cacheN) {
        names[`#n${id}`] = name;
      }
      attrs.ExpressionAttributeNames = names;
    }
    return attrs;
  }
  attributeValues() {
    const attrs = {};
    if (this.cacheV.length > 0) {
      const values = {};
      for (const { path, id, value } of this.cacheV) {
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

// src/operations/transact-write.ts
var transactWrite = async (options) => {
  const command = new import_client_dynamodb2.TransactWriteItemsCommand({
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

// src/schema/schema.ts
var Schema = class {
  constructor(type, marshall3, unmarshall3, walk = void 0) {
    this.type = type;
    this.marshall = marshall3;
    this.unmarshall = unmarshall3;
    this.walk = walk;
  }
  filterIn(value) {
    return typeof value === "undefined";
  }
  filterOut(value) {
    return typeof value === "undefined";
  }
};

// src/schema/optional.ts
var optional = (schema) => {
  return new Schema(
    schema.type,
    (value) => {
      value;
      if (typeof value === "undefined") {
        return void 0;
      }
      return schema.marshall(value);
    },
    (value) => {
      if (typeof value === "undefined") {
        return void 0;
      }
      return schema.unmarshall(value);
    },
    schema.walk
  );
};

// src/schema/any.ts
var import_util_dynamodb = require("@aws-sdk/util-dynamodb");
var any = (opts) => new Schema(
  void 0,
  (value) => (0, import_util_dynamodb.marshall)({ value }, opts).value,
  (value) => (0, import_util_dynamodb.unmarshall)({ value }, opts).value
);

// src/schema/uuid.ts
var uuid = () => new Schema(
  "S",
  (value) => ({ S: value }),
  (value) => value?.S
);

// src/schema/string.ts
function string() {
  return new Schema(
    "S",
    (value) => ({ S: value }),
    (value) => value.S
  );
}

// src/schema/boolean.ts
var boolean = () => new Schema(
  "BOOL",
  (value) => ({ BOOL: value }),
  (value) => value.BOOL
);

// src/schema/number.ts
function number() {
  return new Schema(
    "N",
    (value) => ({ N: value.toString() }),
    (value) => Number(value.N)
  );
}

// src/schema/bigint.ts
function bigint() {
  return new Schema(
    "N",
    (value) => ({ N: value.toString() }),
    (value) => BigInt(value.N)
  );
}

// src/schema/bigfloat.ts
var import_big_float = require("@awsless/big-float");
var bigfloat = () => new Schema(
  "N",
  (value) => ({ N: new import_big_float.BigFloat(value).toString() }),
  (value) => new import_big_float.BigFloat(value.N)
);

// src/schema/binary.ts
var binary = () => new Schema(
  "B",
  (value) => ({ B: value }),
  (value) => value.B
);

// src/schema/object.ts
var object = (props) => new Schema(
  "M",
  (unmarshalled) => {
    const marshalled = {};
    for (const [key3, schema] of Object.entries(props)) {
      const value = unmarshalled[key3];
      if (schema.filterIn(value)) {
        continue;
      }
      marshalled[key3] = schema.marshall(value);
    }
    return { M: marshalled };
  },
  (marshalled) => {
    const unmarshalled = {};
    for (const [key3, schema] of Object.entries(props)) {
      const value = marshalled.M[key3];
      if (schema.filterOut(value)) {
        continue;
      }
      unmarshalled[key3] = schema.unmarshall(value);
    }
    return unmarshalled;
  },
  (path, ...rest) => {
    const type = props[path];
    return rest.length ? type.walk?.(...rest) : type;
  }
);

// src/schema/record.ts
var record = (schema) => new Schema(
  "M",
  (unmarshalled) => {
    const marshalled = {};
    for (const [key3, value] of Object.entries(unmarshalled)) {
      marshalled[key3] = schema.marshall(value);
    }
    return { M: marshalled };
  },
  (marshalled) => {
    const unmarshalled = {};
    for (const [key3, value] of Object.entries(marshalled.M)) {
      unmarshalled[key3] = schema.unmarshall(value);
    }
    return unmarshalled;
  },
  (_, ...rest) => {
    return rest.length ? schema.walk?.(...rest) : schema;
  }
);

// src/schema/array.ts
var array = (schema) => new Schema(
  "L",
  (unmarshalled) => ({ L: unmarshalled.map((item) => schema.marshall(item)) }),
  (marshalled) => marshalled.L.map((item) => schema.unmarshall(item)),
  (_, ...rest) => {
    return rest.length ? schema.walk?.(...rest) : schema;
  }
);

// src/schema/date.ts
var date = () => new Schema(
  "N",
  (value) => ({ N: String(value.getTime()) }),
  (value) => new Date(Number(value.N))
);

// src/schema/json.ts
var import_json = require("@awsless/json");
var json = () => new Schema(
  "S",
  (value) => ({ S: (0, import_json.stringify)(value) }),
  (value) => (0, import_json.parse)(value.S)
);

// src/schema/ttl.ts
var ttl = () => new Schema(
  "N",
  (value) => ({ N: String(Math.floor(value.getTime() / 1e3)) }),
  (value) => new Date(Number(value?.N) * 1e3)
);

// src/schema/unknown.ts
var import_util_dynamodb2 = require("@aws-sdk/util-dynamodb");
var unknown = (opts) => new Schema(
  void 0,
  (value) => (0, import_util_dynamodb2.marshall)(
    { value },
    {
      removeUndefinedValues: true,
      ...opts?.marshall ?? {}
    }
  ).value,
  (value) => {
    if (typeof value === "undefined") {
      return;
    }
    return (0, import_util_dynamodb2.unmarshall)({ value }, opts?.unmarshall).value;
  }
);

// src/schema/enum/string.ts
var stringEnum = (_) => new Schema(
  "S",
  (value) => ({ S: value }),
  (value) => value.S
);

// src/schema/enum/number.ts
var numberEnum = (_) => new Schema(
  "N",
  (value) => ({ N: value.toString() }),
  (value) => Number(value.N)
);

// src/schema/set/schema.ts
var SetSchema = class extends Schema {
  constructor(type, marshall3, unmarshall3, walk = void 0) {
    super(type, marshall3, unmarshall3, walk);
  }
  filterIn(value) {
    return typeof value === "undefined" || value.size === 0;
  }
  filterOut() {
    return false;
  }
  // marshall(value: Input): Record<Type, Marshalled> {
  // 	return {
  // 		[this.type]: this._marshall(value),
  // 	} as Record<Type, Marshalled>
  // }
  // unmarshall(value: Record<Type, Marshalled> | undefined): Output {
  // 	if (typeof value === 'undefined') {
  // 		return new Set() as Output
  // 	}
  // 	return this._unmarshall(value[this.type])
  // }
};

// src/schema/set/string.ts
function stringSet() {
  return new SetSchema(
    "SS",
    (value) => value.size > 0 ? { SS: Array.from(value) } : void 0,
    (value) => new Set(value?.SS),
    () => string()
  );
}

// src/schema/set/number.ts
function numberSet() {
  return new SetSchema(
    "NS",
    (value) => value.size > 0 ? { NS: Array.from(value).map((item) => item.toString()) } : void 0,
    (value) => new Set(value?.NS.map((item) => Number(item))),
    () => number()
  );
}

// src/schema/set/bigint.ts
function bigintSet() {
  return new SetSchema(
    "NS",
    (value) => value.size > 0 ? { NS: Array.from(value).map((item) => item.toString()) } : void 0,
    (value) => new Set(value?.NS.map((item) => BigInt(item))),
    () => bigint()
  );
}

// src/schema/set/binary.ts
var binarySet = () => new SetSchema(
  "BS",
  (value) => value.size > 0 ? { BS: Array.from(value) } : void 0,
  (value) => new Set(value?.BS),
  () => binary()
);

// src/test/mock.ts
var import_client_dynamodb7 = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb2 = require("@aws-sdk/lib-dynamodb");
var import_dynamodb_server = require("@awsless/dynamodb-server");
var import_request_port = require("@heat/request-port");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");

// src/test/migrate.ts
var import_client_dynamodb3 = require("@aws-sdk/client-dynamodb");

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
    AttributeDefinitions: unique(
      filter([
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
      ])
    )
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
  return Promise.all(
    [tables].flat().map((table) => {
      if (table instanceof Table) {
        table = serializeTable(table);
      }
      return client2.send(
        new import_client_dynamodb3.CreateTableCommand({
          ...table,
          BillingMode: "PAY_PER_REQUEST"
          // Fix for using the older & faster local dynamodb v3
          // ProvisionedThroughput: {
          // 	ReadCapacityUnits: 1,
          // 	WriteCapacityUnits: 1,
          // },
          // GlobalSecondaryIndexes: table.GlobalSecondaryIndexes?.map(index => {
          // 	return {
          // 		...index,
          // 		ProvisionedThroughput: {
          // 			ReadCapacityUnits: 1,
          // 			WriteCapacityUnits: 1,
          // 		},
          // 	}
          // }),
        })
      );
    })
  );
};

// src/operations/batch-put-item.ts
var import_client_dynamodb4 = require("@aws-sdk/client-dynamodb");
var import_chunk = __toESM(require("chunk"), 1);
var batchPutItem = async (table, items, options = {}) => {
  await Promise.all(
    (0, import_chunk.default)(items, 25).map(async (items2) => {
      let unprocessedItems = {
        [table.name]: items2.map((item) => ({
          PutRequest: {
            Item: table.marshall(item)
          }
        }))
      };
      while (unprocessedItems?.[table.name]?.length) {
        const command = new import_client_dynamodb4.BatchWriteItemCommand({
          RequestItems: unprocessedItems
        });
        debug(options, command);
        const result = await client(options).send(command);
        unprocessedItems = result.UnprocessedItems;
      }
    })
  );
};

// src/test/seed.ts
var seedTable = (table, items) => {
  return { table, items };
};
var seed = async (defs) => {
  await Promise.all(
    defs.map(({ table, items }) => {
      return batchPutItem(table, items);
    })
  );
};

// src/test/stream.ts
var import_client_dynamodb6 = require("@aws-sdk/client-dynamodb");

// src/operations/get-item.ts
var import_client_dynamodb5 = require("@aws-sdk/client-dynamodb");

// src/expressions/projection.ts
var projectionExpression = (options, gen) => {
  if (options.projection) {
    return options.projection.map((path) => gen.path(path)).join(", ");
  }
  return;
};

// src/operations/get-item.ts
var getItem = async (table, key3, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new import_client_dynamodb5.GetItemCommand({
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

// src/test/stream.ts
var streamTable = (table, fn) => {
  return { table, fn };
};
var getPrimaryKey = (table, item) => {
  const key3 = {
    [table.hash]: item[table.hash]
  };
  if (table.sort) {
    key3[table.sort] = item[table.sort];
  }
  return key3;
};
var getEventName = (OldImage, NewImage) => {
  if (NewImage) {
    if (OldImage) {
      return "MODIFY";
    }
    return "INSERT";
  }
  return "REMOVE";
};
var emit = (stream, items) => {
  return stream.fn({
    Records: items.map(({ Keys, OldImage, NewImage }) => ({
      eventName: getEventName(OldImage, NewImage),
      dynamodb: {
        Keys,
        OldImage,
        NewImage
      }
    }))
  });
};
var pipeStream = (streams, command, send) => {
  if (command instanceof import_client_dynamodb6.PutItemCommand) {
    return pipeToTable({
      streams,
      command,
      send,
      getKey: (command2, table) => {
        const key3 = getPrimaryKey(table, command2.input.Item);
        return table.unmarshall(key3);
      }
    });
  }
  if (command instanceof import_client_dynamodb6.UpdateItemCommand || command instanceof import_client_dynamodb6.DeleteItemCommand) {
    return pipeToTable({
      streams,
      command,
      send,
      getKey: (command2, table) => {
        return table.unmarshall(command2.input.Key);
      }
    });
  }
  if (command instanceof import_client_dynamodb6.BatchWriteItemCommand) {
    return pipeToTables({
      command,
      send,
      getEntries: (command2) => {
        return Object.entries(command2.input.RequestItems).map(([tableName, items]) => {
          const stream = streams.find((stream2) => stream2.table.name === tableName);
          if (!stream) return;
          return {
            ...stream,
            items: items.map((item) => {
              if (item.PutRequest) {
                const key3 = getPrimaryKey(stream.table, item.PutRequest.Item);
                return { key: stream.table.unmarshall(key3) };
              } else if (item.DeleteRequest) {
                return { key: stream.table.unmarshall(item.DeleteRequest.Key) };
              }
              return;
            })
          };
        });
      }
    });
  }
  if (command instanceof import_client_dynamodb6.TransactWriteItemsCommand) {
    return pipeToTables({
      command,
      send,
      getEntries: (command2) => {
        return command2.input.TransactItems.map((item) => {
          if (item.ConditionCheck) return;
          const keyed = item.Delete || item.Update;
          const tableName = keyed?.TableName || item.Put?.TableName;
          const stream = streams.find((stream2) => stream2.table.name === tableName);
          if (!stream) return;
          const marshall3 = keyed ? keyed.Key : getPrimaryKey(stream.table, item.Put.Item);
          return {
            ...stream,
            items: [{ key: stream.table.unmarshall(marshall3) }]
          };
        });
      }
    });
  }
  return send();
};
var pipeToTables = async ({
  command,
  send,
  getEntries
}) => {
  const entries = getEntries(command);
  await Promise.all(
    entries.map(async (entry) => {
      if (entry) {
        await Promise.all(
          entry.items.map(async (item) => {
            if (item) {
              item.OldImage = await getItem(entry.table, item.key);
            }
          })
        );
      }
    })
  );
  const result = await send();
  await Promise.all(
    entries.map(async (entry) => {
      if (entry) {
        await Promise.all(
          entry.items.map(async (item) => {
            if (item) {
              item.NewImage = await getItem(entry.table, item.key);
            }
          })
        );
      }
    })
  );
  await Promise.all(
    entries.map((entry) => {
      if (!entry) {
        return;
      }
      return emit(
        entry,
        entry.items.map((item) => {
          if (item) {
            return {
              Keys: entry.table.marshall(item.key),
              OldImage: item.OldImage ? entry.table.marshall(item.OldImage) : void 0,
              NewImage: item.NewImage ? entry.table.marshall(item.NewImage) : void 0
            };
          }
          return;
        }).filter(Boolean)
      );
    })
  );
  return result;
};
var pipeToTable = async ({
  streams,
  command,
  send,
  getKey
}) => {
  const listeners = streams.filter((stream) => stream.table.name === command.input.TableName);
  if (listeners.length === 0) {
    return send();
  }
  const table = listeners[0].table;
  const key3 = getKey(command, table);
  const image1 = await getItem(table, key3);
  const result = await send();
  const image2 = await getItem(table, key3);
  await Promise.all(
    listeners.map((stream) => {
      return emit(stream, [
        {
          Keys: table.marshall(key3),
          OldImage: image1 ? table.marshall(image1) : void 0,
          NewImage: image2 ? table.marshall(image2) : void 0
        }
      ]);
    })
  );
  return result;
};

// src/test/mock.ts
var mockDynamoDB = (configOrServer) => {
  let server;
  if (configOrServer instanceof import_dynamodb_server.DynamoDBServer) {
    server = configOrServer;
  } else {
    server = new import_dynamodb_server.DynamoDBServer();
    if (typeof beforeAll !== "undefined") {
      beforeAll(async () => {
        const [port, releasePort] = await (0, import_request_port.requestPort)();
        await server.listen(port);
        await server.wait();
        if (configOrServer.tables) {
          await migrate(server.getClient(), configOrServer.tables);
          if (configOrServer.seed) {
            await seed(configOrServer.seed);
          }
        }
        return async () => {
          await server.kill();
          await releasePort();
        };
      }, configOrServer.timeout);
    }
  }
  const client2 = server.getClient();
  const documentClient = server.getDocumentClient();
  const processStream = (command, send) => {
    if (!(configOrServer instanceof import_dynamodb_server.DynamoDBServer) && configOrServer.stream) {
      return pipeStream(configOrServer.stream, command, send);
    }
    return send();
  };
  const clientSend = (command) => {
    return processStream(command, () => {
      if (client2.__proto__.send.wrappedMethod) {
        return client2.__proto__.send.wrappedMethod.call(client2, command);
      }
      return client2.send(command);
    });
  };
  const documentClientSend = (command) => {
    return processStream(command, () => {
      if (documentClient.__proto__.send.wrappedMethod) {
        return documentClient.__proto__.send.wrappedMethod.call(documentClient, command);
      }
      return documentClient.send(command);
    });
  };
  (0, import_aws_sdk_client_mock.mockClient)(import_client_dynamodb7.DynamoDBClient).on(import_client_dynamodb7.CreateTableCommand).callsFake((input) => clientSend(new import_client_dynamodb7.CreateTableCommand(input))).on(import_client_dynamodb7.ListTablesCommand).callsFake((input) => clientSend(new import_client_dynamodb7.ListTablesCommand(input))).on(import_client_dynamodb7.GetItemCommand).callsFake((input) => clientSend(new import_client_dynamodb7.GetItemCommand(input))).on(import_client_dynamodb7.PutItemCommand).callsFake((input) => clientSend(new import_client_dynamodb7.PutItemCommand(input))).on(import_client_dynamodb7.DeleteItemCommand).callsFake((input) => clientSend(new import_client_dynamodb7.DeleteItemCommand(input))).on(import_client_dynamodb7.UpdateItemCommand).callsFake((input) => clientSend(new import_client_dynamodb7.UpdateItemCommand(input))).on(import_client_dynamodb7.QueryCommand).callsFake((input) => clientSend(new import_client_dynamodb7.QueryCommand(input))).on(import_client_dynamodb7.ScanCommand).callsFake((input) => clientSend(new import_client_dynamodb7.ScanCommand(input))).on(import_client_dynamodb7.BatchGetItemCommand).callsFake((input) => clientSend(new import_client_dynamodb7.BatchGetItemCommand(input))).on(import_client_dynamodb7.BatchWriteItemCommand).callsFake((input) => clientSend(new import_client_dynamodb7.BatchWriteItemCommand(input))).on(import_client_dynamodb7.TransactGetItemsCommand).callsFake((input) => clientSend(new import_client_dynamodb7.TransactGetItemsCommand(input))).on(import_client_dynamodb7.TransactWriteItemsCommand).callsFake((input) => clientSend(new import_client_dynamodb7.TransactWriteItemsCommand(input)));
  (0, import_aws_sdk_client_mock.mockClient)(import_lib_dynamodb2.DynamoDBDocumentClient).on(import_lib_dynamodb2.GetCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.GetCommand(input))).on(import_lib_dynamodb2.PutCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.PutCommand(input))).on(import_lib_dynamodb2.DeleteCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.DeleteCommand(input))).on(import_lib_dynamodb2.UpdateCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.UpdateCommand(input))).on(import_lib_dynamodb2.QueryCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.QueryCommand(input))).on(import_lib_dynamodb2.ScanCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.ScanCommand(input))).on(import_lib_dynamodb2.BatchGetCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.BatchGetCommand(input))).on(import_lib_dynamodb2.BatchWriteCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.BatchWriteCommand(input))).on(import_lib_dynamodb2.TransactGetCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.TransactGetCommand(input))).on(import_lib_dynamodb2.TransactWriteCommand).callsFake((input) => documentClientSend(new import_lib_dynamodb2.TransactWriteCommand(input)));
  return server;
};

// src/index.ts
var import_dynamodb_server2 = require("@awsless/dynamodb-server");
var import_lib_dynamodb3 = require("@aws-sdk/lib-dynamodb");
var import_client_dynamodb16 = require("@aws-sdk/client-dynamodb");
var import_client_dynamodb17 = require("@aws-sdk/client-dynamodb");
var import_client_dynamodb18 = require("@aws-sdk/client-dynamodb");
var import_client_dynamodb19 = require("@aws-sdk/client-dynamodb");
var import_client_dynamodb20 = require("@aws-sdk/client-dynamodb");

// src/exceptions/transaction-canceled.ts
var import_client_dynamodb8 = require("@aws-sdk/client-dynamodb");
import_client_dynamodb8.TransactionCanceledException.prototype.conditionFailedAt = function(...indexes) {
  const reasons = this.CancellationReasons || [];
  for (const index of indexes) {
    if (reasons[index]?.Code === "ConditionalCheckFailed") {
      return true;
    }
  }
  return false;
};

// src/index.ts
var import_client_dynamodb21 = require("@aws-sdk/client-dynamodb");

// src/operations/put-item.ts
var import_client_dynamodb9 = require("@aws-sdk/client-dynamodb");
var putItem = async (table, item, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new import_client_dynamodb9.PutItemCommand({
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
var import_client_dynamodb10 = require("@aws-sdk/client-dynamodb");
var updateItem = async (table, key3, options) => {
  const gen = new IDGenerator(table);
  const command = new import_client_dynamodb10.UpdateItemCommand({
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
var import_client_dynamodb11 = require("@aws-sdk/client-dynamodb");
var deleteItem = async (table, key3, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new import_client_dynamodb11.DeleteItemCommand({
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
var import_client_dynamodb12 = require("@aws-sdk/client-dynamodb");

// src/expressions/key-condition.ts
var KeyCondition = class extends QueryBulder {
  where(path) {
    return new Where2(this, path);
  }
  extend(fn) {
    return fn(this);
  }
};
var Where2 = class extends QueryBulder {
  constructor(query2, path) {
    super(query2);
    this.path = path;
  }
  compare(comparator, v) {
    return new Combine3(this, ["(", { p: [this.path] }, comparator, { v, p: [this.path] }, ")"]);
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
    return new Combine3(this, [
      "(",
      { p: [this.path] },
      "BETWEEN",
      { v: min, p: [this.path] },
      "AND",
      { v: max, p: [this.path] },
      ")"
    ]);
  }
  beginsWith(value) {
    return new Combine3(this, ["begins_with(", { p: [this.path] }, ",", { v: value, p: [this.path] }, ")"]);
  }
};
var Combine3 = class extends QueryBulder {
  get and() {
    return new KeyCondition(this, ["AND"]);
  }
  get or() {
    return new KeyCondition(this, ["OR"]);
  }
};
var keyConditionExpression = (options, gen) => {
  return build(flatten(options.keyCondition(new KeyCondition())), gen);
};

// src/operations/query.ts
var query = async (table, options) => {
  const { forward = true } = options;
  const gen = new IDGenerator(table);
  const command = new import_client_dynamodb12.QueryCommand({
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
var import_client_dynamodb13 = require("@aws-sdk/client-dynamodb");
var batchGetItem = async (table, keys, options = { filterNonExistentItems: false }) => {
  let response = [];
  let unprocessedKeys = keys.map((key3) => table.marshall(key3));
  const gen = new IDGenerator(table);
  const projection = projectionExpression(options, gen);
  const attributes = gen.attributeNames();
  while (unprocessedKeys.length) {
    const command = new import_client_dynamodb13.BatchGetItemCommand({
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
    response = [...response, ...(result.Responses?.[table.name] || []).map((item) => table.unmarshall(item))];
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

// src/operations/batch-delete-item.ts
var import_client_dynamodb14 = require("@aws-sdk/client-dynamodb");
var import_chunk2 = __toESM(require("chunk"), 1);
var batchDeleteItem = async (table, keys, options = {}) => {
  await Promise.all(
    (0, import_chunk2.default)(keys, 25).map(async (items) => {
      let unprocessedItems = {
        [table.name]: items.map((item) => ({
          DeleteRequest: {
            Key: table.marshall(item)
          }
        }))
      };
      while (unprocessedItems?.[table.name]?.length) {
        const command = new import_client_dynamodb14.BatchWriteItemCommand({
          RequestItems: unprocessedItems
        });
        debug(options, command);
        const result = await client(options).send(command);
        unprocessedItems = result.UnprocessedItems;
      }
    })
  );
};

// src/operations/scan.ts
var import_client_dynamodb15 = require("@aws-sdk/client-dynamodb");
var scan = async (table, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new import_client_dynamodb15.ScanCommand({
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
  let cursor2 = options.cursor;
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
      cursor: cursor2
    });
    cursor2 = result.cursor;
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
  let cursor2 = options.cursor;
  let done = false;
  const loop = async () => {
    const result = await scan(table, {
      client: options.client,
      projection: options.projection,
      consistentRead: options.consistentRead,
      limit: options.batch,
      cursor: cursor2
    });
    cursor2 = result.cursor;
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
var fromCursorString = (table, cursorStringValue) => {
  if (!cursorStringValue) {
    return;
  }
  try {
    const buffer = Buffer.from(cursorStringValue, "base64");
    const json2 = buffer.toString("utf-8");
    const cursor2 = JSON.parse(json2);
    return table.unmarshall(cursor2);
  } catch (error) {
    return;
  }
};
var toCursorString = (table, cursor2) => {
  if (!cursor2) {
    return;
  }
  const marshalled = table.marshall(cursor2);
  const json2 = JSON.stringify(marshalled);
  const buffer = Buffer.from(json2, "utf-8");
  return buffer.toString("base64");
};

// src/operations/paginate-query.ts
var paginateQuery = async (table, options) => {
  const result = await query(table, {
    ...options,
    cursor: fromCursorString(table, options.cursor)
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
    cursor: toCursorString(table, result.cursor)
  };
};

// src/operations/paginate-scan.ts
var paginateScan = async (table, options = {}) => {
  const result = await scan(table, {
    ...options,
    cursor: fromCursorString(table, options.cursor)
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
    cursor: toCursorString(table, result.cursor)
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BatchGetItemCommand,
  BatchWriteItemCommand,
  ConditionalCheckFailedException,
  DeleteItemCommand,
  DynamoDBClient,
  DynamoDBDocumentClient,
  DynamoDBServer,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  Table,
  TransactGetItemsCommand,
  TransactWriteItemsCommand,
  TransactionCanceledException,
  UpdateItemCommand,
  any,
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
  json,
  migrate,
  mockDynamoDB,
  number,
  numberEnum,
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
  seed,
  seedTable,
  streamTable,
  string,
  stringEnum,
  stringSet,
  transactConditionCheck,
  transactDelete,
  transactPut,
  transactUpdate,
  transactWrite,
  ttl,
  unknown,
  updateItem,
  uuid
});
