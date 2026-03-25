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
  get keys() {
    if (this.sort) {
      return [this.hash, this.sort];
    }
    return [this.hash];
  }
  walk(...path) {
    if (path.length === 0) {
      return this.schema;
    }
    const result = this.schema.walk?.(...path);
    if (!result) {
      throw new Error(`Invalid path to walk: ${path}`);
    }
    return result;
  }
  marshall(item) {
    return this.schema.marshall(item, []).M;
  }
  unmarshall(item, projection) {
    return this.schema.unmarshall({ M: item }, [], projection);
  }
};
var define = (name, options) => new Table(name, options);

// src/command/transact-write.ts
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
var getClient = (options) => {
  return options.client || dynamoDBClient();
};

// src/command/transact-write.ts
var transactWrite = async (items, options = {}) => {
  const client = getClient(options);
  const command = new TransactWriteItemsCommand({
    ClientRequestToken: options.idempotantKey,
    TransactItems: items.map((item) => item.transact())
  });
  await client.send(command);
};

// src/schema/schema.ts
var createSchema = (props) => {
  return {
    // encode(value) {
    // 	return value as AttributeInputValue<A>
    // },
    // decode(value) {
    // 	return value as T
    // },
    // marshall(value) {
    // 	return {
    // 		[props.type!]: this.encode(value),
    // 	} as AttributeInput<A>
    // },
    // unmarshall(value) {
    // 	return this.decode(value[props.type!])
    // },
    // validate() {
    // 	return true
    // },
    // filterIn(value) {
    // 	return typeof value === 'undefined'
    // },
    // filterOut(value) {
    // 	return typeof value === 'undefined'
    // },
    //
    //
    // walk() {
    // 	throw new TypeError('There is no more path to walk')
    // },
    ...props,
    marshall(value, path) {
      if (!props.validateInput(value)) {
        throw new InvalidPayloadError("marshall", props, path, typeof value);
      }
      return props.marshall(value, path);
    },
    unmarshall(value, path, projection) {
      if ((typeof value === "object" && value !== null || typeof value === "undefined") && props.validateOutput(value)) {
        return props.unmarshall(value, path, projection);
      }
      const valueType = typeof value === "object" && value !== null ? Object.keys(value)[0] ?? typeof value : typeof value;
      throw new InvalidPayloadError("unmarshall", props, path, valueType);
    }
  };
};
var InvalidPayloadError = class extends TypeError {
  constructor(type, schema, path, value) {
    super(
      [
        `Invalid ${type} payload provided for "${path.join(".")}".`,
        `Expected schema type ${schema.name}`,
        `Received type ${typeof value}`
      ].join("\n")
    );
  }
};

// src/schema/optional.ts
var optional = (schema) => {
  return createSchema({
    ...schema,
    marshall(value, path) {
      if (typeof value === "undefined") {
        return { NULL: true };
      }
      return schema.marshall(value, path);
    },
    unmarshall(value, path) {
      if (typeof value === "undefined" || value.NULL) {
        return void 0;
      }
      const output = schema.unmarshall(value, path);
      if (output instanceof Set && output.size === 0) {
        return void 0;
      }
      return output;
    },
    // validate(value) {
    // 	if (typeof value === 'undefined') {
    // 		return true
    // 	}
    // 	return schema.validate(value)
    // },
    validateInput(value) {
      if (typeof value === "undefined") {
        return true;
      }
      return schema.validateInput(value);
    },
    validateOutput(value) {
      if (typeof value === "undefined" || value.NULL) {
        return true;
      }
      return schema.validateOutput(value);
    }
  });
};

// src/schema/unknown.ts
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
var unknown = (opts) => createSchema({
  name: "unknown",
  // validate: () => true,
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
  },
  validateInput: () => true,
  validateOutput: () => true
});

// src/schema/any.ts
var any = (opts) => unknown(opts);

// src/schema/set.ts
var set = (schema) => {
  const type = `${schema.type}S`;
  const encode = (value, path) => {
    return Array.from(value).map((v) => {
      const marshalled = schema.marshall(v, path);
      return marshalled[schema.type];
    });
  };
  const decode = (value, path) => {
    return new Set(
      value.map((v) => {
        return schema.unmarshall({ [schema.type]: v }, path);
      })
    );
  };
  return createSchema({
    name: "set",
    type,
    marshall(value, path) {
      if (value.size === 0) {
        return void 0;
      }
      return {
        [type]: encode(value, path)
      };
    },
    unmarshall(value, path) {
      if (typeof value === "undefined") {
        return /* @__PURE__ */ new Set();
      }
      if (type in value) {
        return decode(value[type], path);
      }
      return /* @__PURE__ */ new Set();
    },
    validateInput: (value) => value instanceof Set,
    validateOutput(value) {
      if (typeof value === "undefined") {
        return true;
      }
      if (type in value && Array.isArray(value[type])) {
        return true;
      }
      return false;
    },
    walk: () => schema
  });
};

// src/schema/uuid.ts
var regex = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
var uuid = () => createSchema({
  name: "uuid",
  type: "S",
  marshall: (value) => ({ S: value }),
  unmarshall: (value) => value.S,
  // validate: value => typeof value === 'string',
  // validate: value => typeof value === 'string' && regex.test(value),
  validateInput: (value) => typeof value === "string" && regex.test(value),
  validateOutput: (value) => !!(typeof value === "object" && "S" in value && typeof value.S === "string" && regex.test(value.S))
});

// src/schema/string.ts
function string() {
  return createSchema({
    name: "string",
    type: "S",
    marshall: (value) => ({ S: value }),
    unmarshall: (value) => value.S,
    // validate: value => typeof value === 'string',
    validateInput: (value) => typeof value === "string",
    validateOutput: (value) => {
      return !!(typeof value === "object" && "S" in value && typeof value.S === "string");
    }
  });
}

// src/schema/boolean.ts
function boolean() {
  return createSchema({
    name: "boolean",
    type: "BOOL",
    marshall: (value) => ({ BOOL: value }),
    unmarshall: (value) => value.BOOL,
    // validate: value => typeof value === 'boolean',
    validateInput: (value) => typeof value === "boolean",
    validateOutput: (value) => !!(typeof value === "object" && "BOOL" in value && typeof value.BOOL === "boolean")
  });
}

// src/schema/number.ts
function number() {
  return createSchema({
    name: "number",
    type: "N",
    marshall: (value) => ({ N: value.toString() }),
    unmarshall: (value) => Number(value.N),
    // validate: value => typeof value === 'number',
    validateInput: (value) => typeof value === "number" && !isNaN(value) && isFinite(value),
    validateOutput: (value) => !!(typeof value === "object" && "N" in value && typeof value.N === "string")
  });
}

// src/schema/bigint.ts
function bigint() {
  return createSchema({
    name: "bigint",
    type: "N",
    marshall: (value) => ({ N: value.toString() }),
    unmarshall: (value) => BigInt(value.N),
    // validate: value => typeof value === 'bigint',
    validateInput: (value) => typeof value === "bigint",
    validateOutput: (value) => !!(typeof value === "object" && "N" in value && typeof value.N === "string")
  });
}

// src/schema/bigfloat.ts
import { BigFloat, floor, parse, PRECISION } from "@awsless/big-float";
var bigfloat = ({ precision = PRECISION } = {}) => createSchema({
  name: "bigfloat",
  type: "N",
  marshall: (value) => ({ N: floor(value, precision).toString() }),
  unmarshall: (value) => parse(value.N),
  // validate: value => value instanceof BigFloat,
  validateInput: (value) => value instanceof BigFloat,
  validateOutput: (value) => !!(typeof value === "object" && "N" in value && typeof value.N === "string")
});

// src/schema/uint8-array.ts
import { isUint8Array } from "node:util/types";
var uint8array = () => createSchema({
  name: "uint8array",
  type: "B",
  marshall: (value) => ({ B: value }),
  unmarshall: (value) => value.B,
  // validate: value => value instanceof Uint8Array,
  validateInput: (value) => value instanceof Uint8Array,
  validateOutput: (value) => !!(typeof value === "object" && "B" in value && isUint8Array(value.B))
});

// src/schema/object.ts
var object = (props, rest) => createSchema({
  name: "object",
  type: "M",
  marshall: (input, path) => {
    const result = {};
    for (const [key, schema] of Object.entries(props)) {
      const value = input[key];
      if (typeof value === "undefined") {
        continue;
      }
      const marshalled = schema.marshall(value, [...path, key]);
      if (typeof marshalled === "undefined" || marshalled.NULL) {
        continue;
      }
      result[key] = marshalled;
    }
    if (rest) {
      for (const [key, value] of Object.entries(input)) {
        if (props[key]) {
          continue;
        }
        if (typeof value === "undefined") {
          continue;
        }
        const marshalled = rest.marshall(value, [...path, key]);
        if (typeof value === "undefined" || marshalled.NULL) {
          continue;
        }
        result[key] = marshalled;
      }
    }
    return { M: result };
  },
  unmarshall: (output, path, projection) => {
    const result = {};
    for (const [key, schema] of Object.entries(props)) {
      const value = output.M[key];
      if (projection && !projection.includes(key)) {
        continue;
      }
      const unmarshalled = schema.unmarshall(value, [...path, key]);
      if (typeof unmarshalled !== "undefined") {
        result[key] = unmarshalled;
      }
    }
    if (rest) {
      for (const [key, value] of Object.entries(output.M)) {
        if (props[key]) {
          continue;
        }
        if (projection && !projection.includes(key)) {
          continue;
        }
        const unmarshalled = rest.unmarshall(value, [...path, key]);
        if (typeof unmarshalled !== "undefined") {
          result[key] = unmarshalled;
        }
      }
    }
    return result;
  },
  // validate: value => typeof value === 'object' && value !== null,
  validateInput: (value) => typeof value === "object" && value !== null,
  validateOutput: (value) => !!(typeof value === "object" && "M" in value && typeof value.M === "object" && value.M !== null),
  walk(path, ...next) {
    const type = props[path] ?? rest;
    return next.length ? type?.walk?.(...next) : type;
  }
});

// src/schema/record.ts
var record = (schema) => createSchema({
  name: "record",
  type: "M",
  marshall(input, path) {
    const result = {};
    for (const [key, value] of Object.entries(input)) {
      const marshalled = schema.marshall(value, [...path, key]);
      if (marshalled.NULL) {
        continue;
      }
      result[key] = marshalled;
    }
    return { M: result };
  },
  unmarshall(output, path) {
    const result = {};
    for (const [key, value] of Object.entries(output.M)) {
      result[key] = schema.unmarshall(value, [...path, key]);
    }
    return result;
  },
  validateInput: (value) => typeof value === "object" && value !== null,
  validateOutput: (value) => !!(typeof value === "object" && "M" in value && typeof value.M === "object" && value.M !== null),
  walk(_, ...rest) {
    return rest.length ? schema.walk?.(...rest) : schema;
  }
});

// src/schema/variant.ts
var variant = (key, options) => createSchema({
  name: "variant",
  type: "M",
  marshall(input, path) {
    const type = input[key];
    if (!type) {
      throw new TypeError(`Missing variant key: ${key}`);
    }
    const variant2 = options[type];
    if (!variant2) {
      throw new TypeError(`Unknown variant: ${type}`);
    }
    return {
      M: {
        ...variant2.marshall(input, path).M,
        [key]: {
          S: type
        }
      }
    };
  },
  unmarshall(output, path) {
    const type = output.M[key];
    if (!type || !type.S) {
      throw new TypeError(`Missing variant key: ${key}`);
    }
    const variant2 = options[type.S];
    if (!variant2) {
      throw new TypeError(`Unknown variant: ${type}`);
    }
    return {
      ...variant2.unmarshall(output, path),
      [key]: type.S
    };
  },
  // validate: value => typeof value === 'object' && value !== null,
  validateInput: (value) => typeof value === "object" && value !== null,
  validateOutput: (value) => !!(typeof value === "object" && "M" in value && typeof value.M === "object" && value.M !== null),
  walk() {
    throw new TypeError(`Update & condition expressions are unsupported for a variant type`);
  }
});

// src/schema/array.ts
var array = (schema) => createSchema({
  name: "array",
  type: "L",
  marshall: (value, path) => ({ L: value.map((item, i) => schema.marshall(item, [...path, i])) }),
  unmarshall: (value, path) => value.L.map((item, i) => schema.unmarshall(item, [...path, i])),
  // validate: value => Array.isArray(value),
  validateInput: (value) => Array.isArray(value),
  validateOutput: (value) => typeof value === "object" && "L" in value && Array.isArray(value.L),
  walk: (_, ...rest) => rest.length ? schema.walk?.(...rest) : schema
});

// src/schema/tuple.ts
function tuple(entries, rest) {
  return createSchema({
    name: "tuple",
    type: "L",
    marshall: (value, path) => ({
      L: value.map((item, i) => (entries[i] ?? rest)?.marshall(item, [...path, i]))
    }),
    unmarshall: (value, path) => value.L.map((item, i) => (entries[i] ?? rest)?.unmarshall(item, [...path, i])),
    // validate: value => Array.isArray(value),
    validateInput: (value) => Array.isArray(value),
    validateOutput: (value) => !!(typeof value === "object" && "L" in value && Array.isArray(value.L)),
    walk(path, ...restPath) {
      const schema = entries[path] ?? rest;
      return restPath.length ? schema?.walk?.(...restPath) : schema;
    }
  });
}

// src/schema/date.ts
var date = () => createSchema({
  name: "date",
  type: "N",
  marshall: (value) => ({ N: String(value.getTime()) }),
  unmarshall: (value) => new Date(Number(value.N)),
  // validate: value => value instanceof Date,
  validateInput: (value) => value instanceof Date && !isNaN(value.getTime()),
  validateOutput: (value) => !!(typeof value === "object" && "N" in value && typeof value.N === "string")
});

// src/schema/enum.ts
function enum_(_) {
  return unknown();
}

// src/schema/json.ts
import { parse as parse2, stringify } from "@awsless/json";
var json = () => createSchema({
  name: "json",
  type: "S",
  marshall: (value) => ({ S: stringify(value) }),
  unmarshall: (value) => parse2(value.S),
  validateInput: () => true,
  validateOutput: (value) => !!(typeof value === "object" && "S" in value && typeof value.S === "string")
});

// src/schema/ttl.ts
var ttl = () => createSchema({
  name: "ttl",
  type: "N",
  marshall: (value) => ({ N: String(Math.floor(value.getTime() / 1e3)) }),
  unmarshall: (value) => new Date(Number(value.N) * 1e3),
  // validate: value => value instanceof Date,
  validateInput: (value) => value instanceof Date && !isNaN(value.getTime()),
  validateOutput: (value) => !!(typeof value === "object" && "N" in value && typeof value.N === "string")
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
var toArray = (list) => {
  return list ? Array.isArray(list) ? list : [list] : [];
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
        KeyType: "RANGE",
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
          ...toArray(item.hash).map((hash) => ({
            AttributeName: hash,
            AttributeType: table.schema.walk?.(hash).type
          })),
          ...toArray(item.sort).map((sort) => ({
            AttributeName: sort,
            AttributeType: table.schema.walk?.(sort).type
          }))
          // {
          // 	AttributeName: item.hash,
          // 	AttributeType: table.schema.walk?.(item.hash)!.type,
          // },
          // item.sort
          // 	? {
          // 			AttributeName: item.sort,
          // 			AttributeType: table.schema.walk?.(item.sort)!.type,
          // 		}
          // 	: undefined,
        ]).flat()
      ])
    )
  };
  if (indexes.length) {
    result.GlobalSecondaryIndexes = indexes.map(([name, item]) => ({
      Projection: { ProjectionType: "ALL" },
      IndexName: name,
      KeySchema: [
        ...toArray(item.hash).map((hash) => ({
          KeyType: "HASH",
          AttributeName: hash
        })),
        ...toArray(item.sort).map((sort) => ({
          KeyType: "RANGE",
          AttributeName: sort
        }))
      ]
      // KeySchema: filter([
      // 	{
      // 		KeyType: 'HASH',
      // 		AttributeName: item.hash,
      // 	},
      // 	item.sort
      // 		? {
      // 				KeyType: 'RANGE',
      // 				AttributeName: item.sort,
      // 			}
      // 		: undefined,
      // ]),
    }));
  }
  return result;
};

// src/test/migrate.ts
var migrate = (client, tables) => {
  return Promise.all(
    [tables].flat().map((table) => {
      if (table instanceof Table) {
        table = serializeTable(table);
      }
      return client.send(
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

// src/command/put-items.ts
import { BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";

// src/command/command.ts
var thenable = (callback) => {
  let promise;
  return {
    then(onfulfilled, onrejected) {
      return (promise ?? (promise = callback())).then(onfulfilled, onrejected);
    }
  };
};
var transactable = (transact) => ({
  transact
});
var iterable = (cursor, callback) => ({
  [Symbol.asyncIterator]() {
    let done = false;
    return {
      async next() {
        if (done) {
          return { done: true };
        }
        const result = await callback(cursor);
        cursor = result.cursor;
        if (!result.cursor) {
          done = true;
        }
        if (result.items.length === 0) {
          return { done: true };
        }
        return {
          value: result.items,
          done: false
        };
      }
    };
  }
});

// src/command/put-items.ts
var putItems = (table, items, options = {}) => {
  const client = getClient(options);
  return thenable(async () => {
    const unprocessedItems = items.map((item) => ({
      PutRequest: {
        Item: table.marshall(item)
      }
    }));
    while (unprocessedItems.length) {
      const command = new BatchWriteItemCommand({
        RequestItems: {
          [table.name]: unprocessedItems.splice(0, 25)
        }
      });
      const result = await client.send(command);
      const resultUnprocessedItems = result.UnprocessedItems?.[table.name] ?? [];
      unprocessedItems.push(...resultUnprocessedItems);
    }
  });
};

// src/test/seed.ts
var seedTable = (table, items) => {
  return { table, items };
};
var seed = async (defs) => {
  await Promise.all(
    defs.map(({ table, items }) => {
      return putItems(table, items);
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

// src/command/get-item.ts
import { GetItemCommand } from "@aws-sdk/client-dynamodb";

// src/expression/attributes.ts
var ExpressionAttributes = class {
  constructor(table) {
    this.table = table;
  }
  #names = /* @__PURE__ */ new Map();
  #values = /* @__PURE__ */ new Map();
  path(path) {
    return path.map((name, index) => {
      if (typeof name === "number") {
        return `[${name}]`;
      }
      return `${index === 0 ? "" : "."}${this.name(name)}`;
    }).join("");
  }
  name(key) {
    if (!this.#names.has(key)) {
      this.#names.set(key, `#n${this.#names.size + 1}`);
    }
    return this.#names.get(key);
  }
  value(value, path) {
    const schema = this.table.walk(...path);
    const marshalled = schema.marshall(value, path);
    return this.raw(marshalled);
  }
  // innerSetValue(value: any, path: Array<string | number>): string {
  // 	const schema = this.table.walk(...path)
  // 	const marshalled = schema.marshall(value, path)
  // 	return this.raw(marshalled.M[SET_KEY])
  // }
  // isSet(path: Array<string | number>): boolean {
  // 	const schema = this.table.walk(...path)
  // 	const type = schema.type
  // 	return type === 'SS' || type === 'NS' || type === 'BS'
  // }
  elementValue(value, path) {
    const schema = this.table.walk(...path);
    const element = schema.walk?.();
    if (element) {
      return this.raw(element.marshall(value, path));
    }
    return this.raw(schema.marshall(value, path));
  }
  raw(value) {
    let key;
    try {
      key = JSON.stringify(value);
    } catch (_) {
      key = value;
    }
    if (!this.#values.has(key)) {
      this.#values.set(key, {
        id: `:v${this.#values.size + 1}`,
        value
      });
    }
    return this.#values.get(key).id;
  }
  attributeNames() {
    const attrs = {};
    if (this.#names.size > 0) {
      const names = {};
      for (const [name, id] of this.#names) {
        names[id] = name;
      }
      attrs.ExpressionAttributeNames = names;
    }
    return attrs;
  }
  attributeValues() {
    const attrs = {};
    if (this.#values.size > 0) {
      const values = {};
      for (const { id, value } of this.#values.values()) {
        values[id] = value;
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

// src/expression/projection.ts
var buildProjectionExpression = (attrs, projection) => {
  if (!projection) {
    return;
  }
  return projection.map((key) => attrs.name(key)).join(", ");
};

// src/command/get-item.ts
var getItem = (table, key, options = {}) => {
  const attrs = new ExpressionAttributes(table);
  const client = getClient(options);
  const command = new GetItemCommand({
    TableName: table.name,
    Key: table.marshall(key),
    ConsistentRead: options.consistentRead,
    ProjectionExpression: buildProjectionExpression(attrs, options.select),
    ...attrs.attributes()
  });
  return {
    ...transactable(() => ({
      unmarshall: (item) => table.unmarshall(item, options.select),
      input: { Get: command.input }
    })),
    ...thenable(async () => {
      const result = await client.send(command);
      if (result.Item) {
        return table.unmarshall(result.Item, options.select);
      }
    })
  };
};

// src/test/stream.ts
var streamTable = (table, fn) => {
  return { table, fn };
};
var getPrimaryKey = (table, item) => {
  const key = {
    [table.hash]: item[table.hash]
  };
  if (table.sort) {
    key[table.sort] = item[table.sort];
  }
  return key;
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
        const key = getPrimaryKey(table, command2.input.Item);
        return table.unmarshall(key, table.keys);
      }
    });
  }
  if (command instanceof UpdateItemCommand || command instanceof DeleteItemCommand) {
    return pipeToTable({
      streams,
      command,
      send,
      getKey: (command2, table) => {
        return table.unmarshall(command2.input.Key, table.keys);
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
                const key = getPrimaryKey(stream.table, item.PutRequest.Item);
                return { key: stream.table.unmarshall(key, stream.table.keys) };
              } else if (item.DeleteRequest) {
                return { key: stream.table.unmarshall(item.DeleteRequest.Key, stream.table.keys) };
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
            items: [{ key: stream.table.unmarshall(marshall2, stream.table.keys) }]
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
  const key = getKey(command, table);
  const image1 = await getItem(table, key);
  const result = await send();
  const image2 = await getItem(table, key);
  await Promise.all(
    listeners.map((stream) => {
      return emit(stream, [
        {
          Keys: table.marshall(key),
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
    server = new DynamoDBServer({
      engine: configOrServer.engine === "correctness" ? "java" : "memory"
      // engine: 'java',
    });
    if (typeof beforeAll !== "undefined") {
      beforeAll(async () => {
        const [port, releasePort] = await requestPort();
        await server.listen(port);
        mockClient(DynamoDBClient3).on(CreateTableCommand2).callsFake((input) => clientSend(new CreateTableCommand2(input))).on(ListTablesCommand).callsFake((input) => clientSend(new ListTablesCommand(input))).on(GetItemCommand2).callsFake((input) => clientSend(new GetItemCommand2(input))).on(PutItemCommand2).callsFake((input) => clientSend(new PutItemCommand2(input))).on(DeleteItemCommand2).callsFake((input) => clientSend(new DeleteItemCommand2(input))).on(UpdateItemCommand2).callsFake((input) => clientSend(new UpdateItemCommand2(input))).on(QueryCommand).callsFake((input) => clientSend(new QueryCommand(input))).on(ScanCommand).callsFake((input) => clientSend(new ScanCommand(input))).on(BatchGetItemCommand).callsFake((input) => clientSend(new BatchGetItemCommand(input))).on(BatchWriteItemCommand3).callsFake((input) => clientSend(new BatchWriteItemCommand3(input))).on(TransactGetItemsCommand).callsFake((input) => clientSend(new TransactGetItemsCommand(input))).on(TransactWriteItemsCommand3).callsFake((input) => clientSend(new TransactWriteItemsCommand3(input)));
        mockClient(DynamoDBDocumentClient2).on(GetCommand).callsFake((input) => documentClientSend(new GetCommand(input))).on(PutCommand).callsFake((input) => documentClientSend(new PutCommand(input))).on(DeleteCommand).callsFake((input) => documentClientSend(new DeleteCommand(input))).on(UpdateCommand).callsFake((input) => documentClientSend(new UpdateCommand(input))).on(Query).callsFake((input) => documentClientSend(new Query(input))).on(Scan).callsFake((input) => documentClientSend(new Scan(input))).on(BatchGetCommand).callsFake((input) => documentClientSend(new BatchGetCommand(input))).on(BatchWriteCommand).callsFake((input) => documentClientSend(new BatchWriteCommand(input))).on(TransactGetCommand).callsFake((input) => documentClientSend(new TransactGetCommand(input))).on(TransactWriteCommand).callsFake((input) => documentClientSend(new TransactWriteCommand(input)));
        if (configOrServer.tables) {
          await migrate(server.getClient(), configOrServer.tables);
          if (configOrServer.seed) {
            await seed(configOrServer.seed);
          }
        }
        return async () => {
          await server.stop();
          await releasePort();
        };
      }, configOrServer.timeout);
    }
  }
  const client = server.getClient();
  const documentClient = server.getDocumentClient();
  const processStream = (command, send) => {
    if (!(configOrServer instanceof DynamoDBServer) && configOrServer.stream) {
      return pipeStream(configOrServer.stream, command, send);
    }
    return send();
  };
  const clientSend = (command) => {
    return processStream(command, () => {
      if (client.__proto__.send.wrappedMethod) {
        return client.__proto__.send.wrappedMethod.call(client, command);
      }
      return client.send(command);
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
  return server;
};

// src/index.ts
import { DynamoDBServer as DynamoDBServer2 } from "@awsless/dynamodb-server";
import { DynamoDBDocumentClient as DynamoDBDocumentClient3 } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient as DynamoDBClient4 } from "@aws-sdk/client-dynamodb";
import { GetItemCommand as GetItemCommand3, PutItemCommand as PutItemCommand4, UpdateItemCommand as UpdateItemCommand4, DeleteItemCommand as DeleteItemCommand4 } from "@aws-sdk/client-dynamodb";
import { QueryCommand as QueryCommand3, ScanCommand as ScanCommand3 } from "@aws-sdk/client-dynamodb";
import { TransactWriteItemsCommand as TransactWriteItemsCommand4, TransactGetItemsCommand as TransactGetItemsCommand3 } from "@aws-sdk/client-dynamodb";
import { BatchGetItemCommand as BatchGetItemCommand3, BatchWriteItemCommand as BatchWriteItemCommand5 } from "@aws-sdk/client-dynamodb";

// src/exception/transaction-canceled.ts
import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
TransactionCanceledException.prototype.cancellationReasonAt = function(index) {
  const reasons = this.CancellationReasons ?? [];
  const reason = reasons[index];
  if (!reason) {
    throw new Error(`Cancellation reason index is out of bounds: ${index}`);
  }
  return reason.Code;
};
TransactionCanceledException.prototype.conditionFailedAt = function(index) {
  return this.cancellationReasonAt(index) === "ConditionalCheckFailed";
};
TransactionCanceledException.prototype.conflictAt = function(index) {
  return this.cancellationReasonAt(index) === "TransactionConflict";
};
TransactionCanceledException.prototype.validationErrorAt = function(index) {
  return this.cancellationReasonAt(index) === "ValidationError";
};

// src/index.ts
import {
  ConditionalCheckFailedException,
  TransactionCanceledException as TransactionCanceledException2,
  TransactionConflictException,
  DynamoDBServiceException
} from "@aws-sdk/client-dynamodb";

// src/expression/fluent.ts
var secret = Symbol("fluent");
var Fluent = class extends Function {
};
var createFluent = () => {
  const createProxy = (list) => {
    return new Proxy(new Fluent(), {
      apply(_, __, keys) {
        return createProxy([...list, keys]);
      },
      get(_, key) {
        if (key === secret) {
          return list;
        }
        if (key === "toString") {
          return () => `Fluent`;
        }
        if (typeof key === "symbol") {
          return;
        }
        if (key === "at") {
          return createProxy(list);
        }
        return createProxy([...list, key]);
      }
    });
  };
  return createProxy([]);
};
var getFluentData = (prop) => {
  return prop[secret];
};
var getFluentExpression = (prop) => {
  const list = getFluentData(prop);
  const length = list.length;
  return {
    path: list.slice(0, -2).flat(),
    op: list[length - 2],
    value: list[length - 1]
  };
};
var getFluentPath = (prop) => {
  return getFluentData(prop).flat();
};

// src/command/put-item.ts
import { PutItemCommand as PutItemCommand3 } from "@aws-sdk/client-dynamodb";

// src/expression/condition.ts
var buildConditionExpression = (attrs, builder) => {
  if (!builder) {
    return;
  }
  const fluent = builder(createFluent());
  const build = (fluent2) => {
    if (Array.isArray(fluent2)) {
      return build(createFluent().and(fluent2));
    }
    const { path, op, value } = getFluentExpression(fluent2);
    if (op === "and" || op === "or") {
      const expressions = value[0].map((item) => build(item));
      return `(${expressions.join(` ${op.toUpperCase()} `)})`;
    }
    if (op === "not") {
      return `NOT ${build(value[0])}`;
    }
    let p;
    let v;
    const [k1, k2] = path;
    if (k1 === "size" && k2 instanceof Fluent) {
      p = `size(${attrs.path(getFluentPath(k2))})`;
      v = (value2) => {
        return attrs.raw({ N: String(value2) });
      };
    } else {
      p = attrs.path(path);
      v = (value2) => {
        return attrs.value(value2, path);
      };
    }
    const param = (index) => {
      const arg = value[index];
      if (arg instanceof Fluent) {
        return attrs.path(getFluentPath(arg));
      }
      return v(arg);
    };
    switch (op) {
      case "eq":
        if (typeof value[0] === "undefined" || value[0] instanceof Set && value[0].size === 0) {
          return `attribute_not_exists(${p})`;
        }
        return `${p} = ${param(0)}`;
      case "nq":
        if (typeof value[0] === "undefined") {
          return `attribute_exists(${p})`;
        }
        return `${p} <> ${param(0)}`;
      case "lt":
        return `${p} < ${param(0)}`;
      case "lte":
        return `${p} <= ${param(0)}`;
      case "gt":
        return `${p} > ${param(0)}`;
      case "gte":
        return `${p} >= ${param(0)}`;
      case "between":
        return `${p} BETWEEN ${param(0)} AND ${param(1)}`;
      case "in":
        return `${p} IN (${value[0].map((item) => {
          if (item instanceof Fluent) {
            return attrs.path(getFluentPath(item));
          }
          return attrs.value(item, path);
        }).join(", ")})`;
      case "contains": {
        const elemParam = attrs.elementValue(value[0], path);
        return `contains(${p}, ${elemParam})`;
      }
      case "startsWith":
        return `begins_with(${p}, ${param(0)})`;
      case "exists":
        return `attribute_exists(${p})`;
      case "notExists":
        return `attribute_not_exists(${p})`;
      case "type":
        return `attribute_type(${p}, ${attrs.raw({
          S: value[0]
        })})`;
    }
    throw new TypeError(`Unsupported operator: ${op}`);
  };
  return build(fluent);
};

// src/command/put-item.ts
var putItem = (table, item, options = {}) => {
  const client = getClient(options);
  const attrs = new ExpressionAttributes(table);
  const command = new PutItemCommand3({
    TableName: table.name,
    Item: table.marshall(item),
    ConditionExpression: buildConditionExpression(attrs, options.when),
    ReturnValues: options.return,
    ...attrs.attributes()
  });
  return {
    ...transactable(() => ({
      Put: command.input
    })),
    ...thenable(async () => {
      const result = await client.send(command);
      if (result.Attributes) {
        return table.unmarshall(result.Attributes);
      }
      return;
    })
  };
};

// src/command/update-item.ts
import { UpdateItemCommand as UpdateItemCommand3 } from "@aws-sdk/client-dynamodb";

// src/expression/update.ts
var shouldDelete = (value) => {
  return (
    // undefined value's should be deleted.
    typeof value === "undefined" || // null value's should be deleted.
    value === null || // empty set's should be deleted
    value instanceof Set && value.size === 0
  );
};
var buildUpdateExpression = (attrs, builder) => {
  if (!builder) {
    return;
  }
  const fluent = builder(createFluent());
  const fluents = Array.isArray(fluent) ? fluent : [fluent];
  const set2 = [];
  const add = [];
  const rem = [];
  const del = [];
  for (const fluent2 of fluents) {
    const { path, op, value } = getFluentExpression(fluent2);
    const p = attrs.path(path);
    const param = (index, defaultRaw) => {
      const v = value[index];
      if (v instanceof Fluent) {
        return attrs.path(getFluentPath(v));
      }
      if (typeof v !== "undefined") {
        return attrs.value(v, path);
      }
      return attrs.raw(defaultRaw);
    };
    const listParam = () => {
      if (value[0] instanceof Fluent) {
        return attrs.path(getFluentPath(value[0]));
      }
      return attrs.value(value, path);
    };
    const innerSetParam = () => {
      if (value[0] instanceof Fluent) {
        return attrs.path(getFluentPath(value[0]));
      }
      return attrs.value(new Set(value), path);
    };
    switch (op) {
      case "set":
        if (path.length === 0) {
          throw new TypeError(`You can't set the root object`);
        }
        if (shouldDelete(value[0])) {
          rem.push(p);
        } else {
          set2.push(`${p} = ${param(0)}`);
        }
        break;
      case "setPartial":
        for (const [k, v] of Object.entries(value[0])) {
          if (shouldDelete(v)) {
            rem.push(attrs.path([...path, k]));
          } else {
            set2.push(`${attrs.path([...path, k])} = ${attrs.value(v, [...path, k])}`);
          }
        }
        break;
      case "setIfNotExists":
        if (shouldDelete(value[0])) {
          rem.push(p);
        } else {
          set2.push(`${p} = if_not_exists(${p}, ${param(0)})`);
        }
        break;
      case "delete":
        rem.push(p);
        break;
      // case 'push':
      case "append":
        set2.push(`${p} = list_append(${p}, ${listParam()})`);
        break;
      // case 'unshift':
      case "prepend":
        set2.push(`${p} = list_append(${listParam()}, ${p})`);
        break;
      case "incr":
        set2.push(`${p} = if_not_exists(${p}, ${param(1, { N: "0" })}) + ${param(0)}`);
        break;
      case "decr":
        set2.push(`${p} = if_not_exists(${p}, ${param(1, { N: "0" })}) - ${param(0)}`);
        break;
      case "add": {
        add.push(`${p} ${innerSetParam()}`);
        break;
      }
      case "remove": {
        del.push(`${p} ${innerSetParam()}`);
        break;
      }
      default:
        throw new TypeError(`Unsupported operator: ${op}`);
    }
  }
  return [
    ["SET", set2],
    ["ADD", add],
    ["REMOVE", rem],
    ["DELETE", del]
  ].filter(([_, entries]) => entries.length).map(([op, entries]) => {
    return `${op} ${entries.join(", ")}`;
  }).join(" ");
};

// src/command/update-item.ts
var updateItem = (table, key, options) => {
  const client = getClient(options);
  const attrs = new ExpressionAttributes(table);
  const update = buildUpdateExpression(attrs, options.update);
  const condition = buildConditionExpression(attrs, options.when);
  const command = new UpdateItemCommand3({
    TableName: table.name,
    Key: table.marshall(key),
    UpdateExpression: update,
    ConditionExpression: condition,
    ReturnValues: options.return,
    ...attrs.attributes()
  });
  return {
    ...transactable(() => ({
      Update: command.input
    })),
    ...thenable(async () => {
      const result = await client.send(command);
      if (result.Attributes) {
        return table.unmarshall(result.Attributes);
      }
      return;
    })
  };
};

// src/command/delete-item.ts
import { DeleteItemCommand as DeleteItemCommand3 } from "@aws-sdk/client-dynamodb";
var deleteItem = (table, key, options = {}) => {
  const client = getClient(options);
  const attrs = new ExpressionAttributes(table);
  const command = new DeleteItemCommand3({
    TableName: table.name,
    Key: table.marshall(key),
    ConditionExpression: buildConditionExpression(attrs, options.when),
    ReturnValues: options.return,
    ...attrs.attributes()
  });
  return {
    ...transactable(() => ({ Delete: command.input })),
    ...thenable(async () => {
      const result = await client.send(command);
      if (result.Attributes) {
        return table.unmarshall(result.Attributes);
      }
      return;
    })
  };
};

// src/command/get-items.ts
import { BatchGetItemCommand as BatchGetItemCommand2 } from "@aws-sdk/client-dynamodb";
var getItems = (table, keys, options = { filterNonExistentItems: false }) => {
  const client = getClient(options);
  return thenable(async () => {
    const response = [];
    const unprocessedKeys = keys.map((key) => table.marshall(key));
    const attrs = new ExpressionAttributes(table);
    const projection = buildProjectionExpression(attrs, options.select);
    const attributes = attrs.attributeNames();
    while (unprocessedKeys.length) {
      const command = new BatchGetItemCommand2({
        RequestItems: {
          [table.name]: {
            Keys: unprocessedKeys.splice(0, 100),
            ConsistentRead: options.consistentRead,
            ProjectionExpression: projection,
            ...attributes
          }
        }
      });
      const result = await client.send(command);
      const resultUnprocessedKeys = result.UnprocessedKeys?.[table.name]?.Keys ?? [];
      const resultProcessedItems = (result.Responses?.[table.name] ?? []).map(
        (item) => table.unmarshall(item, options.select)
      );
      unprocessedKeys.push(...resultUnprocessedKeys);
      response.push(...resultProcessedItems);
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
  });
};

// src/command/delete-items.ts
import { BatchWriteItemCommand as BatchWriteItemCommand4 } from "@aws-sdk/client-dynamodb";
var deleteItems = (table, keys, options = {}) => {
  const client = getClient(options);
  return thenable(async () => {
    const unprocessedItems = keys.map((key) => ({
      DeleteRequest: {
        Key: table.marshall(key)
      }
    }));
    while (unprocessedItems.length) {
      const command = new BatchWriteItemCommand4({
        RequestItems: {
          [table.name]: unprocessedItems.splice(0, 25)
        }
      });
      const result = await client.send(command);
      const resultUnprocessedItems = result.UnprocessedItems?.[table.name] ?? [];
      unprocessedItems.push(...resultUnprocessedItems);
    }
  });
};

// src/command/query.ts
import { QueryCommand as QueryCommand2 } from "@aws-sdk/client-dynamodb";

// src/helper/cursor.ts
var fromCursorString = (cursorStringValue) => {
  if (!cursorStringValue) {
    return;
  }
  try {
    const buffer = Buffer.from(cursorStringValue, "base64");
    const json2 = buffer.toString("utf-8");
    return JSON.parse(json2);
  } catch (error) {
    return;
  }
};
var toCursorString = (cursor) => {
  if (!cursor) {
    return;
  }
  const json2 = JSON.stringify(cursor);
  const buffer = Buffer.from(json2, "utf-8");
  return buffer.toString("base64");
};

// src/command/query.ts
var query = (table, key, options = {}) => {
  const client = getClient(options);
  const execute = async (cursor, limit) => {
    const sort = options.order ?? options.sort;
    const attrs = new ExpressionAttributes(table);
    const command = new QueryCommand2({
      TableName: table.name,
      IndexName: options.index,
      KeyConditionExpression: buildConditionExpression(attrs, (e) => [
        ...Object.entries(key).map(([k, v]) => e(k).eq(v)),
        ...options.where ? [options.where(e)] : []
      ]),
      ConsistentRead: options.consistentRead,
      ScanIndexForward: sort === "desc" ? false : true,
      ExclusiveStartKey: fromCursorString(cursor),
      ProjectionExpression: buildProjectionExpression(attrs, options.select),
      Limit: limit ?? options.limit ?? 10,
      ...attrs.attributes()
    });
    const result = await client.send(command);
    return {
      items: result.Items?.map((item) => table.unmarshall(item, options.select)) ?? [],
      cursor: toCursorString(result.LastEvaluatedKey)
    };
  };
  return {
    ...iterable(options.cursor, execute),
    ...thenable(async () => {
      const result = await execute(options.cursor);
      if (result.cursor && !options.disablePreciseCursor) {
        const more = await execute(result.cursor, 1);
        if (more.items.length === 0) {
          delete result.cursor;
        }
      }
      return result;
    })
  };
};

// src/command/get-index-item.ts
var getIndexItem = (table, index, key, options) => {
  return thenable(async () => {
    const result = await query(table, key, {
      ...options,
      index,
      limit: 1,
      disablePreciseCursor: true
    });
    return result.items[0];
  });
};

// src/command/scan.ts
import { ScanCommand as ScanCommand2 } from "@aws-sdk/client-dynamodb";
var scan = (table, options = {}) => {
  const client = getClient(options);
  const execute = async (cursor, limit) => {
    const attrs = new ExpressionAttributes(table);
    const command = new ScanCommand2({
      TableName: table.name,
      ConsistentRead: options.consistentRead,
      Limit: limit ?? options.limit ?? 10,
      ExclusiveStartKey: fromCursorString(cursor),
      ProjectionExpression: buildProjectionExpression(attrs, options.select),
      ...attrs.attributes()
    });
    const result = await client.send(command);
    return {
      items: result.Items?.map((item) => table.unmarshall(item, options.select)) || [],
      cursor: toCursorString(result.LastEvaluatedKey)
    };
  };
  return {
    ...iterable(options.cursor, execute),
    ...thenable(async () => {
      const result = await execute(options.cursor);
      if (result.cursor && !options.disablePreciseCursor) {
        const more = await execute(result.cursor, 1);
        if (more.items.length === 0) {
          delete result.cursor;
        }
      }
      return result;
    })
  };
};

// src/command/condition-check.ts
var conditionCheck = (table, key, options) => {
  const attrs = new ExpressionAttributes(table);
  const input = {
    TableName: table.name,
    Key: table.marshall(key),
    ConditionExpression: buildConditionExpression(attrs, options.when),
    ...attrs.attributes()
  };
  return transactable(() => ({
    ConditionCheck: input
  }));
};

// src/command/transact-read.ts
import { TransactGetItemsCommand as TransactGetItemsCommand2 } from "@aws-sdk/client-dynamodb";
var transactRead = async (items, options = {}) => {
  const transactItems = items.map((item) => item.transact());
  const command = new TransactGetItemsCommand2({
    TransactItems: transactItems.map((item) => item.input)
  });
  const client = getClient(options);
  const result = await client.send(command);
  const responses = result.Responses ?? [];
  return responses.map((res, i) => {
    if (res.Item) {
      return transactItems[i].unmarshall(res.Item);
    }
  });
};
export {
  BatchGetItemCommand3 as BatchGetItemCommand,
  BatchWriteItemCommand5 as BatchWriteItemCommand,
  ConditionalCheckFailedException,
  DeleteItemCommand4 as DeleteItemCommand,
  DynamoDBClient4 as DynamoDBClient,
  DynamoDBDocumentClient3 as DynamoDBDocumentClient,
  DynamoDBServer2 as DynamoDBServer,
  DynamoDBServiceException,
  Fluent,
  GetItemCommand3 as GetItemCommand,
  PutItemCommand4 as PutItemCommand,
  QueryCommand3 as QueryCommand,
  ScanCommand3 as ScanCommand,
  Table,
  TransactGetItemsCommand3 as TransactGetItemsCommand,
  TransactWriteItemsCommand4 as TransactWriteItemsCommand,
  TransactionCanceledException2 as TransactionCanceledException,
  TransactionConflictException,
  UpdateItemCommand4 as UpdateItemCommand,
  any,
  array,
  bigfloat,
  bigint,
  boolean,
  conditionCheck,
  createFluent,
  date,
  define,
  deleteItem,
  deleteItems,
  dynamoDBClient,
  dynamoDBDocumentClient,
  enum_,
  getIndexItem,
  getItem,
  getItems,
  json,
  migrate,
  mockDynamoDB,
  number,
  object,
  optional,
  putItem,
  putItems,
  query,
  record,
  scan,
  seed,
  seedTable,
  set,
  streamTable,
  string,
  transactRead,
  transactWrite,
  ttl,
  tuple,
  uint8array,
  unknown,
  updateItem,
  uuid,
  variant
};
