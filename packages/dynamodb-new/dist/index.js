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
import { TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";

// src/client.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { globalClient } from "@awsless/utils";
import { NodeHttpHandler } from "@smithy/node-http-handler";
var dynamoDBClient = /* @__PURE__ */ globalClient(() => {
  return new DynamoDBClient({
    maxAttempts: 2,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 3 * 1e3,
      requestTimeout: 3 * 1e3
    })
  });
});
var dynamoDBDocumentClient = /* @__PURE__ */ globalClient(() => {
  return DynamoDBDocumentClient.from(dynamoDBClient(), {
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
  isDeletableValue(value) {
    return (
      // undefined value's should be deleted.
      typeof value === "undefined" || // empty set's should be deleted.
      value instanceof Set && value.size === 0
    );
  }
  /** Set a value */
  set(value) {
    if (this.isDeletableValue(value)) {
      return this.del();
    }
    return this.u("set", { p: this.path }, "=", { v: value, p: this.path });
  }
  /** Set a value if the attribute doesn't already exists */
  setIfNotExists(value) {
    if (this.isDeletableValue(value)) {
      return this.del();
    }
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
  const command = new TransactWriteItemsCommand({
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
var createSchema = (props) => {
  return {
    optional: false,
    encode(value) {
      return value;
    },
    decode(value) {
      return value;
    },
    marshall(value) {
      return {
        [props.type]: this.encode(value)
      };
    },
    unmarshall(value) {
      return this.decode(value[props.type]);
    },
    filterIn(value) {
      return typeof value === "undefined";
    },
    filterOut(value) {
      return typeof value === "undefined";
    },
    ...props
  };
};

// src/schema/optional.ts
var optional = (schema) => {
  return createSchema({
    ...schema,
    optional: true,
    marshall(value) {
      if (typeof value === "undefined") {
        return void 0;
      }
      return schema.marshall(value);
    },
    unmarshall(value) {
      if (typeof value === "undefined") {
        return void 0;
      }
      return schema.unmarshall(value);
    }
  });
};

// src/schema/unknown.ts
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
var unknown = (opts) => createSchema({
  marshall(value) {
    return marshall(
      { value },
      {
        removeUndefinedValues: true,
        ...opts?.marshall ?? {}
      }
    ).value;
  },
  unmarshall(value) {
    if (typeof value === "undefined") {
      return;
    }
    return unmarshall({ value }, opts?.unmarshall).value;
  }
});

// src/schema/any.ts
var any = (opts) => unknown(opts);

// src/schema/set.ts
var set = (schema) => {
  const type = `${schema.type}S`;
  return createSchema({
    type,
    encode(value) {
      if (value.size === 0) {
        return void 0;
      }
      return Array.from(value).map((v) => {
        return schema.encode(v);
      });
    },
    decode(value) {
      return new Set(
        value.map((v) => {
          return schema.decode(v);
        })
      );
    },
    unmarshall(value) {
      if (typeof value === "undefined") {
        return /* @__PURE__ */ new Set();
      }
      return this.decode(value[type]);
    },
    filterIn: (value) => typeof value === "undefined" || value.size === 0,
    filterOut: () => false,
    walk: () => schema
  });
};

// src/schema/uuid.ts
var uuid = () => createSchema({
  type: "S"
});

// src/schema/string.ts
function string() {
  return createSchema({
    type: "S"
  });
}

// src/schema/boolean.ts
var boolean = () => createSchema({
  type: "BOOL"
});

// src/schema/number.ts
function number() {
  return createSchema({
    type: "N",
    encode: (value) => value.toString(),
    decode: (value) => Number(value)
  });
}

// src/schema/bigint.ts
function bigint() {
  return createSchema({
    type: "N",
    encode: (value) => value.toString(),
    decode: (value) => BigInt(value)
  });
}

// src/schema/bigfloat.ts
import { BigFloat } from "@awsless/big-float";
var bigfloat = () => createSchema({
  type: "N",
  encode: (value) => new BigFloat(value).toString(),
  decode: (value) => new BigFloat(value)
});

// src/schema/binary.ts
var binary = () => createSchema({
  type: "B"
});

// src/schema/object.ts
var object = (props) => createSchema({
  type: "M",
  encode: (input) => {
    const result = {};
    for (const [key3, schema] of Object.entries(props)) {
      const value = input[key3];
      if (schema.filterIn(value)) {
        continue;
      }
      result[key3] = schema.marshall(value);
    }
    return result;
  },
  decode: (output) => {
    const result = {};
    for (const [key3, schema] of Object.entries(props)) {
      const value = output[key3];
      if (schema.filterOut(value)) {
        continue;
      }
      result[key3] = schema.unmarshall(value);
    }
    return result;
  },
  walk(path, ...rest) {
    const type = props[path];
    return rest.length ? type.walk?.(...rest) : type;
  }
});

// src/schema/record.ts
var record = (schema) => createSchema({
  type: "M",
  encode(input) {
    const result = {};
    for (const [key3, value] of Object.entries(input)) {
      result[key3] = schema.marshall(value);
    }
    return result;
  },
  decode(output) {
    const result = {};
    for (const [key3, value] of Object.entries(output)) {
      result[key3] = schema.unmarshall(value);
    }
    return result;
  },
  walk(_, ...rest) {
    return rest.length ? schema.walk?.(...rest) : schema;
  }
});

// src/schema/array.ts
var array = (schema) => createSchema({
  type: "L",
  encode: (value) => value.map((item) => schema.marshall(item)),
  decode: (value) => value.map((item) => schema.unmarshall(item)),
  walk(_, ...rest) {
    return rest.length ? schema.walk?.(...rest) : schema;
  }
});

// src/schema/date.ts
var date = () => createSchema({
  type: "N",
  encode: (value) => String(value.getTime()),
  decode: (value) => new Date(Number(value))
});

// src/schema/json.ts
import { parse, stringify } from "@awsless/json";
var json = () => createSchema({
  type: "S",
  encode: (value) => stringify(value),
  decode: (value) => parse(value)
});

// src/schema/ttl.ts
var ttl = () => createSchema({
  type: "N",
  encode: (value) => String(Math.floor(value.getTime() / 1e3)),
  decode: (value) => new Date(Number(value) * 1e3)
});

// src/schema/enum/string.ts
var stringEnum = (_) => createSchema({ type: "S" });

// src/schema/enum/number.ts
var numberEnum = (_) => createSchema({
  type: "N",
  encode: (value) => value.toString(),
  decode: (value) => Number(value)
});

// src/test/mock.ts
import {
  BatchGetItemCommand,
  BatchWriteItemCommand as BatchWriteItemCommand3,
  CreateTableCommand as CreateTableCommand2,
  DeleteItemCommand as DeleteItemCommand2,
  DynamoDBClient as DynamoDBClient3,
  GetItemCommand as GetItemCommand2,
  ListTablesCommand,
  PutItemCommand as PutItemCommand2,
  QueryCommand,
  ScanCommand,
  TransactGetItemsCommand,
  TransactWriteItemsCommand as TransactWriteItemsCommand3,
  UpdateItemCommand as UpdateItemCommand2
} from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient as DynamoDBDocumentClient2,
  GetCommand,
  PutCommand,
  QueryCommand as Query,
  ScanCommand as Scan,
  TransactGetCommand,
  TransactWriteCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBServer } from "@awsless/dynamodb-server";
import { requestPort } from "@heat/request-port";
import { mockClient } from "aws-sdk-client-mock";

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
        new CreateTableCommand({
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
import { BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import chunk from "chunk";
var batchPutItem = async (table, items, options = {}) => {
  await Promise.all(
    chunk(items, 25).map(async (items2) => {
      let unprocessedItems = {
        [table.name]: items2.map((item) => ({
          PutRequest: {
            Item: table.marshall(item)
          }
        }))
      };
      while (unprocessedItems?.[table.name]?.length) {
        const command = new BatchWriteItemCommand({
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
import {
  BatchWriteItemCommand as BatchWriteItemCommand2,
  DeleteItemCommand,
  PutItemCommand,
  TransactWriteItemsCommand as TransactWriteItemsCommand2,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";

// src/operations/get-item.ts
import { GetItemCommand } from "@aws-sdk/client-dynamodb";

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
  const command = new GetItemCommand({
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
  if (command instanceof PutItemCommand) {
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
  if (command instanceof UpdateItemCommand || command instanceof DeleteItemCommand) {
    return pipeToTable({
      streams,
      command,
      send,
      getKey: (command2, table) => {
        return table.unmarshall(command2.input.Key);
      }
    });
  }
  if (command instanceof BatchWriteItemCommand2) {
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
  if (command instanceof TransactWriteItemsCommand2) {
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
          const marshall2 = keyed ? keyed.Key : getPrimaryKey(stream.table, item.Put.Item);
          return {
            ...stream,
            items: [{ key: stream.table.unmarshall(marshall2) }]
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
  if (configOrServer instanceof DynamoDBServer) {
    server = configOrServer;
  } else {
    server = new DynamoDBServer();
    if (typeof beforeAll !== "undefined") {
      beforeAll(async () => {
        const [port, releasePort] = await requestPort();
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
    if (!(configOrServer instanceof DynamoDBServer) && configOrServer.stream) {
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
  mockClient(DynamoDBClient3).on(CreateTableCommand2).callsFake((input) => clientSend(new CreateTableCommand2(input))).on(ListTablesCommand).callsFake((input) => clientSend(new ListTablesCommand(input))).on(GetItemCommand2).callsFake((input) => clientSend(new GetItemCommand2(input))).on(PutItemCommand2).callsFake((input) => clientSend(new PutItemCommand2(input))).on(DeleteItemCommand2).callsFake((input) => clientSend(new DeleteItemCommand2(input))).on(UpdateItemCommand2).callsFake((input) => clientSend(new UpdateItemCommand2(input))).on(QueryCommand).callsFake((input) => clientSend(new QueryCommand(input))).on(ScanCommand).callsFake((input) => clientSend(new ScanCommand(input))).on(BatchGetItemCommand).callsFake((input) => clientSend(new BatchGetItemCommand(input))).on(BatchWriteItemCommand3).callsFake((input) => clientSend(new BatchWriteItemCommand3(input))).on(TransactGetItemsCommand).callsFake((input) => clientSend(new TransactGetItemsCommand(input))).on(TransactWriteItemsCommand3).callsFake((input) => clientSend(new TransactWriteItemsCommand3(input)));
  mockClient(DynamoDBDocumentClient2).on(GetCommand).callsFake((input) => documentClientSend(new GetCommand(input))).on(PutCommand).callsFake((input) => documentClientSend(new PutCommand(input))).on(DeleteCommand).callsFake((input) => documentClientSend(new DeleteCommand(input))).on(UpdateCommand).callsFake((input) => documentClientSend(new UpdateCommand(input))).on(Query).callsFake((input) => documentClientSend(new Query(input))).on(Scan).callsFake((input) => documentClientSend(new Scan(input))).on(BatchGetCommand).callsFake((input) => documentClientSend(new BatchGetCommand(input))).on(BatchWriteCommand).callsFake((input) => documentClientSend(new BatchWriteCommand(input))).on(TransactGetCommand).callsFake((input) => documentClientSend(new TransactGetCommand(input))).on(TransactWriteCommand).callsFake((input) => documentClientSend(new TransactWriteCommand(input)));
  return server;
};

// src/index.ts
import { DynamoDBServer as DynamoDBServer2 } from "@awsless/dynamodb-server";
import { DynamoDBDocumentClient as DynamoDBDocumentClient3 } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient as DynamoDBClient4 } from "@aws-sdk/client-dynamodb";
import { GetItemCommand as GetItemCommand3, PutItemCommand as PutItemCommand4, UpdateItemCommand as UpdateItemCommand4, DeleteItemCommand as DeleteItemCommand4 } from "@aws-sdk/client-dynamodb";
import { QueryCommand as QueryCommand3, ScanCommand as ScanCommand3 } from "@aws-sdk/client-dynamodb";
import { TransactWriteItemsCommand as TransactWriteItemsCommand4, TransactGetItemsCommand as TransactGetItemsCommand2 } from "@aws-sdk/client-dynamodb";
import { BatchGetItemCommand as BatchGetItemCommand3, BatchWriteItemCommand as BatchWriteItemCommand5 } from "@aws-sdk/client-dynamodb";

// src/exceptions/transaction-canceled.ts
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
TransactionCanceledException.prototype.conditionFailedAt = function(...indexes) {
  const reasons = this.CancellationReasons || [];
  for (const index of indexes) {
    if (reasons[index]?.Code === "ConditionalCheckFailed") {
      return true;
    }
  }
  return false;
};

// src/index.ts
import { ConditionalCheckFailedException, TransactionCanceledException as TransactionCanceledException2 } from "@aws-sdk/client-dynamodb";

// src/operations/put-item.ts
import { PutItemCommand as PutItemCommand3 } from "@aws-sdk/client-dynamodb";
var putItem = async (table, item, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new PutItemCommand3({
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
import { UpdateItemCommand as UpdateItemCommand3 } from "@aws-sdk/client-dynamodb";
var updateItem = async (table, key3, options) => {
  const gen = new IDGenerator(table);
  const command = new UpdateItemCommand3({
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
import { DeleteItemCommand as DeleteItemCommand3 } from "@aws-sdk/client-dynamodb";
var deleteItem = async (table, key3, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new DeleteItemCommand3({
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
  const command = new QueryCommand2({
    TableName: table.name,
    IndexName: options.index?.toString(),
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
import { BatchWriteItemCommand as BatchWriteItemCommand4 } from "@aws-sdk/client-dynamodb";
import chunk2 from "chunk";
var batchDeleteItem = async (table, keys, options = {}) => {
  await Promise.all(
    chunk2(keys, 25).map(async (items) => {
      let unprocessedItems = {
        [table.name]: items.map((item) => ({
          DeleteRequest: {
            Key: table.marshall(item)
          }
        }))
      };
      while (unprocessedItems?.[table.name]?.length) {
        const command = new BatchWriteItemCommand4({
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
import { ScanCommand as ScanCommand2 } from "@aws-sdk/client-dynamodb";
var scan = async (table, options = {}) => {
  const gen = new IDGenerator(table);
  const command = new ScanCommand2({
    TableName: table.name,
    IndexName: options.index?.toString(),
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
var queryAll = async function* (table, options) {
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
var scanAll = async function* (table, options) {
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
export {
  BatchGetItemCommand3 as BatchGetItemCommand,
  BatchWriteItemCommand5 as BatchWriteItemCommand,
  ConditionalCheckFailedException,
  DeleteItemCommand4 as DeleteItemCommand,
  DynamoDBClient4 as DynamoDBClient,
  DynamoDBDocumentClient3 as DynamoDBDocumentClient,
  DynamoDBServer2 as DynamoDBServer,
  GetItemCommand3 as GetItemCommand,
  PutItemCommand4 as PutItemCommand,
  QueryCommand3 as QueryCommand,
  ScanCommand3 as ScanCommand,
  Table,
  TransactGetItemsCommand2 as TransactGetItemsCommand,
  TransactWriteItemsCommand4 as TransactWriteItemsCommand,
  TransactionCanceledException2 as TransactionCanceledException,
  UpdateItemCommand4 as UpdateItemCommand,
  any,
  array,
  batchDeleteItem,
  batchGetItem,
  batchPutItem,
  bigfloat,
  bigint,
  binary,
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
  set,
  streamTable,
  string,
  stringEnum,
  transactConditionCheck,
  transactDelete,
  transactPut,
  transactUpdate,
  transactWrite,
  ttl,
  unknown,
  updateItem,
  uuid
};
