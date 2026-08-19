import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { BigFloat, PRECISION, floor, parse } from "@awsless/big-float";
import { isUint8Array } from "node:util/types";
import { parse as parse$1, stringify } from "@awsless/json";
import { BatchGetItemCommand, BatchGetItemCommand as BatchGetItemCommand$1, BatchWriteItemCommand, BatchWriteItemCommand as BatchWriteItemCommand$1, ConditionalCheckFailedException, CreateTableCommand, DeleteItemCommand, DeleteItemCommand as DeleteItemCommand$1, DynamoDBClient, DynamoDBClient as DynamoDBClient$1, DynamoDBServiceException, GetItemCommand, GetItemCommand as GetItemCommand$1, ListTablesCommand, PutItemCommand, PutItemCommand as PutItemCommand$1, QueryCommand, QueryCommand as QueryCommand$1, ScanCommand, ScanCommand as ScanCommand$1, TransactGetItemsCommand, TransactGetItemsCommand as TransactGetItemsCommand$1, TransactWriteItemsCommand, TransactWriteItemsCommand as TransactWriteItemsCommand$1, TransactionCanceledException, TransactionCanceledException as TransactionCanceledException$1, TransactionConflictException, TransactionInProgressException, UpdateItemCommand, UpdateItemCommand as UpdateItemCommand$1 } from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, BatchWriteCommand, DeleteCommand, DynamoDBDocumentClient, DynamoDBDocumentClient as DynamoDBDocumentClient$1, GetCommand, PutCommand, QueryCommand as QueryCommand$2, ScanCommand as ScanCommand$2, TransactGetCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBServer, DynamoDBServer as DynamoDBServer$1 } from "@awsless/dynamodb-server";
import { requestPort } from "@heat/request-port";
import { mockClient } from "aws-sdk-vitest-mock";
import { globalClient } from "@awsless/utils";
import { NodeHttpHandler } from "@smithy/node-http-handler";
//#region src/table.ts
var Table = class {
	name;
	hash;
	sort;
	schema;
	indexes;
	constructor(name, opt) {
		this.name = name;
		this.hash = opt.hash;
		this.sort = opt.sort;
		this.schema = opt.schema;
		this.indexes = opt.indexes;
	}
	get keys() {
		if (this.sort) return [this.hash, this.sort];
		return [this.hash];
	}
	walk(...path) {
		if (path.length === 0) return this.schema;
		const result = this.schema.walk?.(...path);
		if (!result) throw new Error(`Invalid path to walk: ${path}`);
		return result;
	}
	marshall(item) {
		return this.schema.marshall(item, []).M;
	}
	unmarshall(item, projection) {
		return this.schema.unmarshall({ M: item }, [], projection);
	}
};
const define = (name, options) => new Table(name, options);
//#endregion
//#region src/schema/schema.ts
const createSchema = (props) => {
	return {
		...props,
		marshall(value, path) {
			if (!props.validateInput(value)) throw new InvalidPayloadError("marshall", props, path, typeof value);
			return props.marshall(value, path);
		},
		unmarshall(value, path, projection) {
			if ((typeof value === "object" && value !== null || typeof value === "undefined") && props.validateOutput(value)) return props.unmarshall(value, path, projection);
			throw new InvalidPayloadError("unmarshall", props, path, typeof value === "object" && value !== null ? Object.keys(value)[0] ?? typeof value : typeof value);
		}
	};
};
var InvalidPayloadError = class extends TypeError {
	constructor(type, schema, path, value) {
		super([
			`Invalid ${type} payload provided for "${path.join(".")}".`,
			`Expected schema type ${schema.name}`,
			`Received type ${typeof value}`
		].join("\n"));
	}
};
//#endregion
//#region src/schema/optional.ts
const optional = (schema) => {
	return createSchema({
		...schema,
		marshall(value, path) {
			if (typeof value === "undefined") return { NULL: true };
			return schema.marshall(value, path);
		},
		unmarshall(value, path) {
			if (typeof value === "undefined" || value.NULL) return;
			const output = schema.unmarshall(value, path);
			if (output instanceof Set && output.size === 0) return;
			return output;
		},
		validateInput(value) {
			if (typeof value === "undefined") return true;
			return schema.validateInput(value);
		},
		validateOutput(value) {
			if (typeof value === "undefined" || value.NULL) return true;
			return schema.validateOutput(value);
		}
	});
};
//#endregion
//#region src/schema/unknown.ts
const unknown = (opts) => createSchema({
	name: "unknown",
	marshall(value) {
		return marshall({ value }, {
			removeUndefinedValues: true,
			...opts?.marshall
		}).value;
	},
	unmarshall(value) {
		if (typeof value === "undefined") return;
		return unmarshall({ value }, opts?.unmarshall).value;
	},
	validateInput: () => true,
	validateOutput: () => true
});
//#endregion
//#region src/schema/any.ts
const any = (opts) => unknown(opts);
//#endregion
//#region src/schema/set.ts
const set = (schema) => {
	const type = `${schema.type}S`;
	const encode = (value, path) => {
		return Array.from(value).map((v) => {
			return schema.marshall(v, path)[schema.type];
		});
	};
	const decode = (value, path) => {
		return new Set(value.map((v) => {
			return schema.unmarshall({ [schema.type]: v }, path);
		}));
	};
	return createSchema({
		name: "set",
		type,
		marshall(value, path) {
			if (value.size === 0) return;
			return { [type]: encode(value, path) };
		},
		unmarshall(value, path) {
			if (typeof value === "undefined") return /* @__PURE__ */ new Set();
			if (type in value) return decode(value[type], path);
			return /* @__PURE__ */ new Set();
		},
		validateInput: (value) => value instanceof Set,
		validateOutput(value) {
			if (typeof value === "undefined") return true;
			if (type in value && Array.isArray(value[type])) return true;
			return false;
		},
		walk: () => schema
	});
};
//#endregion
//#region src/schema/uuid.ts
const regex = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const uuid = () => createSchema({
	name: "uuid",
	type: "S",
	marshall: (value) => ({ S: value }),
	unmarshall: (value) => value.S,
	validateInput: (value) => typeof value === "string" && regex.test(value),
	validateOutput: (value) => !!(typeof value === "object" && "S" in value && typeof value.S === "string" && regex.test(value.S))
});
//#endregion
//#region src/schema/string.ts
function string() {
	return createSchema({
		name: "string",
		type: "S",
		marshall: (value) => ({ S: value }),
		unmarshall: (value) => value.S,
		validateInput: (value) => typeof value === "string",
		validateOutput: (value) => {
			return !!(typeof value === "object" && "S" in value && typeof value.S === "string");
		}
	});
}
//#endregion
//#region src/schema/boolean.ts
function boolean() {
	return createSchema({
		name: "boolean",
		type: "BOOL",
		marshall: (value) => ({ BOOL: value }),
		unmarshall: (value) => value.BOOL,
		validateInput: (value) => typeof value === "boolean",
		validateOutput: (value) => !!(typeof value === "object" && "BOOL" in value && typeof value.BOOL === "boolean")
	});
}
//#endregion
//#region src/schema/number.ts
function number() {
	return createSchema({
		name: "number",
		type: "N",
		marshall: (value) => ({ N: value.toString() }),
		unmarshall: (value) => Number(value.N),
		validateInput: (value) => typeof value === "number" && !isNaN(value) && isFinite(value),
		validateOutput: (value) => !!(typeof value === "object" && "N" in value && typeof value.N === "string")
	});
}
//#endregion
//#region src/schema/bigint.ts
function bigint() {
	return createSchema({
		name: "bigint",
		type: "N",
		marshall: (value) => ({ N: value.toString() }),
		unmarshall: (value) => BigInt(value.N),
		validateInput: (value) => typeof value === "bigint",
		validateOutput: (value) => !!(typeof value === "object" && "N" in value && typeof value.N === "string")
	});
}
//#endregion
//#region src/schema/bigfloat.ts
const bigfloat = ({ precision = PRECISION } = {}) => createSchema({
	name: "bigfloat",
	type: "N",
	marshall: (value) => ({ N: floor(value, precision).toString() }),
	unmarshall: (value) => parse(value.N),
	validateInput: (value) => value instanceof BigFloat,
	validateOutput: (value) => !!(typeof value === "object" && "N" in value && typeof value.N === "string")
});
//#endregion
//#region src/schema/uint8-array.ts
const uint8array = () => createSchema({
	name: "uint8array",
	type: "B",
	marshall: (value) => ({ B: value }),
	unmarshall: (value) => value.B,
	validateInput: (value) => value instanceof Uint8Array,
	validateOutput: (value) => !!(typeof value === "object" && "B" in value && isUint8Array(value.B))
});
//#endregion
//#region src/schema/object.ts
const object = (props, rest) => createSchema({
	name: "object",
	type: "M",
	marshall: (input, path) => {
		const result = {};
		for (const [key, schema] of Object.entries(props)) {
			const value = input[key];
			if (typeof value === "undefined") continue;
			const marshalled = schema.marshall(value, [...path, key]);
			if (typeof marshalled === "undefined" || marshalled.NULL) continue;
			result[key] = marshalled;
		}
		if (rest) for (const [key, value] of Object.entries(input)) {
			if (props[key]) continue;
			if (typeof value === "undefined") continue;
			const marshalled = rest.marshall(value, [...path, key]);
			if (typeof value === "undefined" || marshalled.NULL) continue;
			result[key] = marshalled;
		}
		return { M: result };
	},
	unmarshall: (output, path, projection) => {
		const result = {};
		for (const [key, schema] of Object.entries(props)) {
			const value = output.M[key];
			if (projection && !projection.includes(key)) continue;
			const unmarshalled = schema.unmarshall(value, [...path, key]);
			if (typeof unmarshalled !== "undefined") result[key] = unmarshalled;
		}
		if (rest) for (const [key, value] of Object.entries(output.M)) {
			if (props[key]) continue;
			if (projection && !projection.includes(key)) continue;
			const unmarshalled = rest.unmarshall(value, [...path, key]);
			if (typeof unmarshalled !== "undefined") result[key] = unmarshalled;
		}
		return result;
	},
	validateInput: (value) => typeof value === "object" && value !== null,
	validateOutput: (value) => !!(typeof value === "object" && "M" in value && typeof value.M === "object" && value.M !== null),
	walk(path, ...next) {
		const type = props[path] ?? rest;
		return next.length ? type?.walk?.(...next) : type;
	}
});
//#endregion
//#region src/schema/record.ts
const record = (schema) => createSchema({
	name: "record",
	type: "M",
	marshall(input, path) {
		const result = {};
		for (const [key, value] of Object.entries(input)) {
			const marshalled = schema.marshall(value, [...path, key]);
			if (marshalled.NULL) continue;
			result[key] = marshalled;
		}
		return { M: result };
	},
	unmarshall(output, path) {
		const result = {};
		for (const [key, value] of Object.entries(output.M)) result[key] = schema.unmarshall(value, [...path, key]);
		return result;
	},
	validateInput: (value) => typeof value === "object" && value !== null,
	validateOutput: (value) => !!(typeof value === "object" && "M" in value && typeof value.M === "object" && value.M !== null),
	walk(_, ...rest) {
		return rest.length ? schema.walk?.(...rest) : schema;
	}
});
//#endregion
//#region src/schema/variant.ts
const variant = (key, options) => createSchema({
	name: "variant",
	type: "M",
	marshall(input, path) {
		const type = input[key];
		if (!type) throw new TypeError(`Missing variant key: ${key}`);
		const variant = options[type];
		if (!variant) throw new TypeError(`Unknown variant: ${type}`);
		return { M: {
			...variant.marshall(input, path).M,
			[key]: { S: type }
		} };
	},
	unmarshall(output, path) {
		const type = output.M[key];
		if (!type || !type.S) throw new TypeError(`Missing variant key: ${key}`);
		const variant = options[type.S];
		if (!variant) throw new TypeError(`Unknown variant: ${type.S}`);
		return {
			...variant.unmarshall(output, path),
			[key]: type.S
		};
	},
	validateInput: (value) => typeof value === "object" && value !== null,
	validateOutput: (value) => !!(typeof value === "object" && "M" in value && typeof value.M === "object" && value.M !== null),
	walk() {
		throw new TypeError(`Update & condition expressions are unsupported for a variant type`);
	}
});
//#endregion
//#region src/schema/array.ts
const array = (schema) => createSchema({
	name: "array",
	type: "L",
	marshall: (value, path) => ({ L: value.map((item, i) => schema.marshall(item, [...path, i])) }),
	unmarshall: (value, path) => value.L.map((item, i) => schema.unmarshall(item, [...path, i])),
	validateInput: (value) => Array.isArray(value),
	validateOutput: (value) => typeof value === "object" && "L" in value && Array.isArray(value.L),
	walk: (_, ...rest) => rest.length ? schema.walk?.(...rest) : schema
});
//#endregion
//#region src/schema/tuple.ts
function tuple(entries, rest) {
	return createSchema({
		name: "tuple",
		type: "L",
		marshall: (value, path) => ({ L: value.map((item, i) => (entries[i] ?? rest)?.marshall(item, [...path, i])) }),
		unmarshall: (value, path) => value.L.map((item, i) => (entries[i] ?? rest)?.unmarshall(item, [...path, i])),
		validateInput: (value) => Array.isArray(value),
		validateOutput: (value) => !!(typeof value === "object" && "L" in value && Array.isArray(value.L)),
		walk(path, ...restPath) {
			const schema = entries[path] ?? rest;
			return restPath.length ? schema?.walk?.(...restPath) : schema;
		}
	});
}
//#endregion
//#region src/schema/date.ts
const date = () => createSchema({
	name: "date",
	type: "N",
	marshall: (value) => ({ N: String(value.getTime()) }),
	unmarshall: (value) => new Date(Number(value.N)),
	validateInput: (value) => value instanceof Date && !isNaN(value.getTime()),
	validateOutput: (value) => !!(typeof value === "object" && "N" in value && typeof value.N === "string")
});
//#endregion
//#region src/schema/enum.ts
function enum_(_) {
	return unknown();
}
//#endregion
//#region src/schema/json.ts
const json = () => createSchema({
	name: "json",
	type: "S",
	marshall: (value) => ({ S: stringify(value) }),
	unmarshall: (value) => parse$1(value.S),
	validateInput: () => true,
	validateOutput: (value) => !!(typeof value === "object" && "S" in value && typeof value.S === "string")
});
//#endregion
//#region src/schema/ttl.ts
const ttl = () => createSchema({
	name: "ttl",
	type: "N",
	marshall: (value) => ({ N: String(Math.floor(value.getTime() / 1e3)) }),
	unmarshall: (value) => /* @__PURE__ */ new Date(Number(value.N) * 1e3),
	validateInput: (value) => value instanceof Date && !isNaN(value.getTime()),
	validateOutput: (value) => !!(typeof value === "object" && "N" in value && typeof value.N === "string")
});
//#endregion
//#region src/test/serialize.ts
const filter = (list) => {
	return list.filter((item) => !!item);
};
const toArray = (list) => {
	return list ? Array.isArray(list) ? list : [list] : [];
};
const unique = (list) => {
	const unique = {};
	list.forEach((item) => {
		unique[item.AttributeName] = item;
	});
	return Object.values(unique);
};
const serializeTable = (table) => {
	const indexes = Object.entries(table.indexes || {});
	const result = {
		TableName: table.name,
		KeySchema: filter([{
			KeyType: "HASH",
			AttributeName: table.hash
		}, table.sort ? {
			KeyType: "RANGE",
			AttributeName: table.sort
		} : void 0]),
		AttributeDefinitions: unique(filter([
			{
				AttributeName: table.hash,
				AttributeType: table.schema.walk?.(table.hash).type
			},
			table.sort ? {
				AttributeName: table.sort,
				AttributeType: table.schema.walk?.(table.sort).type
			} : void 0,
			...indexes.map(([_, item]) => [...toArray(item.hash).map((hash) => ({
				AttributeName: hash,
				AttributeType: table.schema.walk?.(hash).type
			})), ...toArray(item.sort).map((sort) => ({
				AttributeName: sort,
				AttributeType: table.schema.walk?.(sort).type
			}))]).flat()
		]))
	};
	if (indexes.length) result.GlobalSecondaryIndexes = indexes.map(([name, item]) => ({
		Projection: { ProjectionType: "ALL" },
		IndexName: name,
		KeySchema: [...toArray(item.hash).map((hash) => ({
			KeyType: "HASH",
			AttributeName: hash
		})), ...toArray(item.sort).map((sort) => ({
			KeyType: "RANGE",
			AttributeName: sort
		}))]
	}));
	return result;
};
//#endregion
//#region src/test/migrate.ts
const migrate = (client, tables) => {
	return Promise.all([tables].flat().map((table) => {
		if (table instanceof Table) table = serializeTable(table);
		return client.send(new CreateTableCommand({
			...table,
			BillingMode: "PAY_PER_REQUEST"
		}));
	}));
};
//#endregion
//#region src/client.ts
const dynamoDBClient = /* @__PURE__ */ globalClient(() => {
	return new DynamoDBClient$1({
		maxAttempts: 2,
		requestHandler: new NodeHttpHandler({
			connectionTimeout: 3e3,
			requestTimeout: 3e3
		})
	});
});
const dynamoDBDocumentClient = /* @__PURE__ */ globalClient(() => {
	return DynamoDBDocumentClient$1.from(dynamoDBClient(), { marshallOptions: { removeUndefinedValues: true } });
});
const getClient = (options) => {
	return options.client || dynamoDBClient();
};
//#endregion
//#region src/helper/backoff.ts
const backoff = (attempt, base = 100, max = 5e3) => {
	const delay = Math.min(base * 2 ** attempt, max);
	const time = delay / 2 + Math.random() * (delay / 2);
	return new Promise((resolve) => setTimeout(resolve, time));
};
//#endregion
//#region src/command/command.ts
const thenable = (callback) => {
	let promise;
	return { then(onfulfilled, onrejected) {
		return (promise ?? (promise = callback())).then(onfulfilled, onrejected);
	} };
};
const transactable = (transact) => ({ transact });
const iterable = (cursor, callback) => ({ [Symbol.asyncIterator]() {
	let done = false;
	return { async next() {
		if (done) return { done: true };
		const result = await callback(cursor);
		cursor = result.cursor;
		if (!result.cursor) done = true;
		if (result.items.length === 0) return { done: true };
		return {
			value: result.items,
			done: false
		};
	} };
} });
//#endregion
//#region src/command/put-items.ts
const putItems = (table, items, options = {}) => {
	const client = getClient(options);
	return thenable(async () => {
		const unprocessedItems = items.map((item) => ({ PutRequest: { Item: table.marshall(item) } }));
		let attempt = 0;
		while (unprocessedItems.length) {
			const command = new BatchWriteItemCommand$1({ RequestItems: { [table.name]: unprocessedItems.splice(0, 25) } });
			const resultUnprocessedItems = (await client.send(command)).UnprocessedItems?.[table.name] ?? [];
			unprocessedItems.push(...resultUnprocessedItems);
			if (resultUnprocessedItems.length) await backoff(attempt++);
			else attempt = 0;
		}
	});
};
//#endregion
//#region src/test/seed.ts
const seedTable = (table, items) => {
	return {
		table,
		items
	};
};
const seed = async (defs) => {
	await Promise.all(defs.map(({ table, items }) => {
		return putItems(table, items);
	}));
};
//#endregion
//#region src/expression/attributes.ts
var ExpressionAttributes = class {
	table;
	#names = /* @__PURE__ */ new Map();
	#values = /* @__PURE__ */ new Map();
	constructor(table) {
		this.table = table;
	}
	path(path) {
		return path.map((name, index) => {
			if (typeof name === "number") return `[${name}]`;
			return `${index === 0 ? "" : "."}${this.name(name)}`;
		}).join("");
	}
	name(key) {
		if (!this.#names.has(key)) this.#names.set(key, `#n${this.#names.size + 1}`);
		return this.#names.get(key);
	}
	value(value, path) {
		const marshalled = this.table.walk(...path).marshall(value, path);
		return this.raw(marshalled);
	}
	elementValue(value, path) {
		const schema = this.table.walk(...path);
		const element = schema.walk?.();
		if (element) return this.raw(element.marshall(value, path));
		return this.raw(schema.marshall(value, path));
	}
	raw(value) {
		let key;
		try {
			key = JSON.stringify(value);
		} catch (_) {
			key = value;
		}
		if (!this.#values.has(key)) this.#values.set(key, {
			id: `:v${this.#values.size + 1}`,
			value
		});
		return this.#values.get(key).id;
	}
	attributeNames() {
		const attrs = {};
		if (this.#names.size > 0) {
			const names = {};
			for (const [name, id] of this.#names) names[id] = name;
			attrs.ExpressionAttributeNames = names;
		}
		return attrs;
	}
	attributeValues() {
		const attrs = {};
		if (this.#values.size > 0) {
			const values = {};
			for (const { id, value } of this.#values.values()) values[id] = value;
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
//#endregion
//#region src/expression/projection.ts
const buildProjectionExpression = (attrs, projection) => {
	if (!projection) return;
	return projection.map((key) => attrs.name(key)).join(", ");
};
//#endregion
//#region src/command/get-item.ts
const getItem = (table, key, options = {}) => {
	const attrs = new ExpressionAttributes(table);
	const client = getClient(options);
	const command = new GetItemCommand$1({
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
			if (result.Item) return table.unmarshall(result.Item, options.select);
		})
	};
};
//#endregion
//#region src/test/stream.ts
const streamTable = (table, fn) => {
	return {
		table,
		fn
	};
};
const getPrimaryKey = (table, item) => {
	const key = { [table.hash]: item[table.hash] };
	if (table.sort) key[table.sort] = item[table.sort];
	return key;
};
const getEventName = (OldImage, NewImage) => {
	if (NewImage) {
		if (OldImage) return "MODIFY";
		return "INSERT";
	}
	return "REMOVE";
};
const emit = (stream, items) => {
	return stream.fn({ Records: items.map(({ Keys, OldImage, NewImage }) => ({
		eventName: getEventName(OldImage, NewImage),
		dynamodb: {
			Keys,
			OldImage,
			NewImage
		}
	})) });
};
const pipeStream = (streams, command, send) => {
	if (command instanceof PutItemCommand$1) return pipeToTable({
		streams,
		command,
		send,
		getKey: (command, table) => {
			const key = getPrimaryKey(table, command.input.Item);
			return table.unmarshall(key, table.keys);
		}
	});
	if (command instanceof UpdateItemCommand$1 || command instanceof DeleteItemCommand$1) return pipeToTable({
		streams,
		command,
		send,
		getKey: (command, table) => {
			return table.unmarshall(command.input.Key, table.keys);
		}
	});
	if (command instanceof BatchWriteItemCommand$1) return pipeToTables({
		command,
		send,
		getEntries: (command) => {
			return Object.entries(command.input.RequestItems).map(([tableName, items]) => {
				const stream = streams.find((stream) => stream.table.name === tableName);
				if (!stream) return;
				return {
					...stream,
					items: items.map((item) => {
						if (item.PutRequest) {
							const key = getPrimaryKey(stream.table, item.PutRequest.Item);
							return { key: stream.table.unmarshall(key, stream.table.keys) };
						} else if (item.DeleteRequest) return { key: stream.table.unmarshall(item.DeleteRequest.Key, stream.table.keys) };
					})
				};
			});
		}
	});
	if (command instanceof TransactWriteItemsCommand$1) return pipeToTables({
		command,
		send,
		getEntries: (command) => {
			return command.input.TransactItems.map((item) => {
				if (item.ConditionCheck) return;
				const keyed = item.Delete || item.Update;
				const tableName = keyed?.TableName || item.Put?.TableName;
				const stream = streams.find((stream) => stream.table.name === tableName);
				if (!stream) return;
				const marshall = keyed ? keyed.Key : getPrimaryKey(stream.table, item.Put.Item);
				return {
					...stream,
					items: [{ key: stream.table.unmarshall(marshall, stream.table.keys) }]
				};
			});
		}
	});
	return send();
};
const pipeToTables = async ({ command, send, getEntries }) => {
	const entries = getEntries(command);
	await Promise.all(entries.map(async (entry) => {
		if (entry) await Promise.all(entry.items.map(async (item) => {
			if (item) item.OldImage = await getItem(entry.table, item.key);
		}));
	}));
	const result = await send();
	await Promise.all(entries.map(async (entry) => {
		if (entry) await Promise.all(entry.items.map(async (item) => {
			if (item) item.NewImage = await getItem(entry.table, item.key);
		}));
	}));
	await Promise.all(entries.map((entry) => {
		if (!entry) return;
		return emit(entry, entry.items.map((item) => {
			if (item) return {
				Keys: entry.table.marshall(item.key),
				OldImage: item.OldImage ? entry.table.marshall(item.OldImage) : void 0,
				NewImage: item.NewImage ? entry.table.marshall(item.NewImage) : void 0
			};
		}).filter(Boolean));
	}));
	return result;
};
const pipeToTable = async ({ streams, command, send, getKey }) => {
	const listeners = streams.filter((stream) => stream.table.name === command.input.TableName);
	if (listeners.length === 0) return send();
	const table = listeners[0].table;
	const key = getKey(command, table);
	const image1 = await getItem(table, key);
	const result = await send();
	const image2 = await getItem(table, key);
	await Promise.all(listeners.map((stream) => {
		return emit(stream, [{
			Keys: table.marshall(key),
			OldImage: image1 ? table.marshall(image1) : void 0,
			NewImage: image2 ? table.marshall(image2) : void 0
		}]);
	}));
	return result;
};
//#endregion
//#region src/test/mock.ts
const mockDynamoDB = (configOrServer) => {
	let server;
	if (configOrServer instanceof DynamoDBServer$1) server = configOrServer;
	else {
		server = new DynamoDBServer$1({ engine: configOrServer.engine === "correctness" ? "java" : "memory" });
		if (typeof beforeAll !== "undefined") beforeAll(async () => {
			let releasePort;
			if (server.engine === "java") {
				const [port, release] = await requestPort();
				releasePort = release;
				await server.listen(port);
			}
			const dbMock = mockClient(DynamoDBClient$1);
			dbMock.on(CreateTableCommand).callsFake((input) => clientSend(new CreateTableCommand(input)));
			dbMock.on(ListTablesCommand).callsFake((input) => clientSend(new ListTablesCommand(input ?? {})));
			dbMock.on(GetItemCommand$1).callsFake((input) => clientSend(new GetItemCommand$1(input)));
			dbMock.on(PutItemCommand$1).callsFake((input) => clientSend(new PutItemCommand$1(input)));
			dbMock.on(DeleteItemCommand$1).callsFake((input) => clientSend(new DeleteItemCommand$1(input)));
			dbMock.on(UpdateItemCommand$1).callsFake((input) => clientSend(new UpdateItemCommand$1(input)));
			dbMock.on(QueryCommand$1).callsFake((input) => clientSend(new QueryCommand$1(input)));
			dbMock.on(ScanCommand$1).callsFake((input) => clientSend(new ScanCommand$1(input)));
			dbMock.on(BatchGetItemCommand$1).callsFake((input) => clientSend(new BatchGetItemCommand$1(input)));
			dbMock.on(BatchWriteItemCommand$1).callsFake((input) => clientSend(new BatchWriteItemCommand$1(input)));
			dbMock.on(TransactGetItemsCommand$1).callsFake((input) => clientSend(new TransactGetItemsCommand$1(input)));
			dbMock.on(TransactWriteItemsCommand$1).callsFake((input) => clientSend(new TransactWriteItemsCommand$1(input)));
			const docMock = mockClient(DynamoDBDocumentClient$1);
			docMock.on(GetCommand).callsFake((input) => documentClientSend(new GetCommand(input)));
			docMock.on(PutCommand).callsFake((input) => documentClientSend(new PutCommand(input)));
			docMock.on(DeleteCommand).callsFake((input) => documentClientSend(new DeleteCommand(input)));
			docMock.on(UpdateCommand).callsFake((input) => documentClientSend(new UpdateCommand(input)));
			docMock.on(QueryCommand$2).callsFake((input) => documentClientSend(new QueryCommand$2(input)));
			docMock.on(ScanCommand$2).callsFake((input) => documentClientSend(new ScanCommand$2(input)));
			docMock.on(BatchGetCommand).callsFake((input) => documentClientSend(new BatchGetCommand(input)));
			docMock.on(BatchWriteCommand).callsFake((input) => documentClientSend(new BatchWriteCommand(input)));
			docMock.on(TransactGetCommand).callsFake((input) => documentClientSend(new TransactGetCommand(input)));
			docMock.on(TransactWriteCommand).callsFake((input) => documentClientSend(new TransactWriteCommand(input)));
			if (configOrServer.tables) {
				await migrate(server.getClient(), configOrServer.tables);
				if (configOrServer.seed) await seed(configOrServer.seed);
			}
			return async () => {
				await server.stop();
				await releasePort?.();
			};
		}, configOrServer.timeout);
	}
	const client = server.getClient();
	const documentClient = server.getDocumentClient();
	const originalDynamoDBSend = DynamoDBClient$1.prototype.send.bind(client);
	const originalDocumentClientSend = DynamoDBDocumentClient$1.prototype.send.bind(documentClient);
	const processStream = (command, send) => {
		if (!(configOrServer instanceof DynamoDBServer$1) && configOrServer.stream) return pipeStream(configOrServer.stream, command, send);
		return send();
	};
	const clientSend = (command) => {
		return processStream(command, () => {
			return originalDynamoDBSend(command);
		});
	};
	const documentClientSend = (command) => {
		return processStream(command, () => {
			return originalDocumentClientSend(command);
		});
	};
	return server;
};
//#endregion
//#region src/exception/transaction-canceled.ts
TransactionCanceledException$1.prototype.cancellationReasonAt = function(index) {
	const reason = (this.CancellationReasons ?? [])[index];
	if (!reason) throw new Error(`Cancellation reason index is out of bounds: ${index}`);
	return reason.Code;
};
TransactionCanceledException$1.prototype.conditionFailedAt = function(index) {
	return this.cancellationReasonAt(index) === "ConditionalCheckFailed";
};
TransactionCanceledException$1.prototype.conflictAt = function(index) {
	return this.cancellationReasonAt(index) === "TransactionConflict";
};
TransactionCanceledException$1.prototype.validationErrorAt = function(index) {
	return this.cancellationReasonAt(index) === "ValidationError";
};
//#endregion
//#region src/expression/fluent.ts
const secret = Symbol("fluent");
var Fluent = class extends Function {};
const createFluent = () => {
	const createProxy = (list) => {
		return new Proxy(new Fluent(), {
			apply(_, __, keys) {
				return createProxy([...list, keys]);
			},
			get(_, key) {
				if (key === secret) return list;
				if (key === "toString") return () => `Fluent`;
				if (typeof key === "symbol") return;
				if (key === "at") return createProxy(list);
				return createProxy([...list, key]);
			}
		});
	};
	return createProxy([]);
};
const getFluentData = (prop) => {
	return prop[secret];
};
const getFluentExpression = (prop) => {
	const list = getFluentData(prop);
	const length = list.length;
	return {
		path: list.slice(0, -2).flat(),
		op: list[length - 2],
		value: list[length - 1]
	};
};
const getFluentPath = (prop) => {
	return getFluentData(prop).flat();
};
//#endregion
//#region src/expression/condition.ts
const buildConditionExpression = (attrs, builder) => {
	if (!builder) return;
	const fluent = builder(createFluent());
	const build = (fluent) => {
		if (Array.isArray(fluent)) return build(createFluent().and(fluent));
		const { path, op, value } = getFluentExpression(fluent);
		if (op === "and" || op === "or") return `(${value[0].map((item) => build(item)).join(` ${op.toUpperCase()} `)})`;
		if (op === "not") return `NOT ${build(value[0])}`;
		let p;
		let v;
		const [k1, k2] = path;
		if (k1 === "size" && k2 instanceof Fluent) {
			p = `size(${attrs.path(getFluentPath(k2))})`;
			v = (value) => {
				return attrs.raw({ N: String(value) });
			};
		} else {
			p = attrs.path(path);
			v = (value) => {
				return attrs.value(value, path);
			};
		}
		const param = (index) => {
			const arg = value[index];
			if (arg instanceof Fluent) return attrs.path(getFluentPath(arg));
			return v(arg);
		};
		switch (op) {
			case "eq":
				if (typeof value[0] === "undefined" || value[0] instanceof Set && value[0].size === 0) return `attribute_not_exists(${p})`;
				return `${p} = ${param(0)}`;
			case "nq":
				if (typeof value[0] === "undefined") return `attribute_exists(${p})`;
				return `${p} <> ${param(0)}`;
			case "lt": return `${p} < ${param(0)}`;
			case "lte": return `${p} <= ${param(0)}`;
			case "gt": return `${p} > ${param(0)}`;
			case "gte": return `${p} >= ${param(0)}`;
			case "between": return `${p} BETWEEN ${param(0)} AND ${param(1)}`;
			case "in": return `${p} IN (${value[0].map((item) => {
				if (item instanceof Fluent) return attrs.path(getFluentPath(item));
				return attrs.value(item, path);
			}).join(", ")})`;
			case "contains": {
				const elemParam = attrs.elementValue(value[0], path);
				return `contains(${p}, ${elemParam})`;
			}
			case "startsWith": return `begins_with(${p}, ${param(0)})`;
			case "exists": return `attribute_exists(${p})`;
			case "notExists": return `attribute_not_exists(${p})`;
			case "type": return `attribute_type(${p}, ${attrs.raw({ S: value[0] })})`;
		}
		throw new TypeError(`Unsupported operator: ${op}`);
	};
	return build(fluent);
};
//#endregion
//#region src/command/put-item.ts
const putItem = (table, item, options = {}) => {
	const client = getClient(options);
	const attrs = new ExpressionAttributes(table);
	const command = new PutItemCommand$1({
		TableName: table.name,
		Item: table.marshall(item),
		ConditionExpression: buildConditionExpression(attrs, options.when),
		ReturnValues: options.return,
		...attrs.attributes()
	});
	return {
		...transactable(() => ({ Put: command.input })),
		...thenable(async () => {
			const result = await client.send(command);
			if (result.Attributes) return table.unmarshall(result.Attributes);
		})
	};
};
//#endregion
//#region src/expression/update.ts
const shouldDelete = (value) => {
	return typeof value === "undefined" || value === null || value instanceof Set && value.size === 0;
};
const buildUpdateExpression = (attrs, builder) => {
	if (!builder) return;
	const fluent = builder(createFluent());
	const fluents = Array.isArray(fluent) ? fluent : [fluent];
	const set = [];
	const add = [];
	const rem = [];
	const del = [];
	for (const fluent of fluents) {
		const { path, op, value } = getFluentExpression(fluent);
		const p = attrs.path(path);
		const param = (index, defaultRaw) => {
			const v = value[index];
			if (v instanceof Fluent) return attrs.path(getFluentPath(v));
			if (typeof v !== "undefined") return attrs.value(v, path);
			return attrs.raw(defaultRaw);
		};
		const listParam = () => {
			if (value[0] instanceof Fluent) return attrs.path(getFluentPath(value[0]));
			return attrs.value(value, path);
		};
		const innerSetParam = () => {
			if (value[0] instanceof Fluent) return attrs.path(getFluentPath(value[0]));
			return attrs.value(new Set(value), path);
		};
		switch (op) {
			case "set":
				if (path.length === 0) throw new TypeError(`You can't set the root object`);
				if (shouldDelete(value[0])) rem.push(p);
				else set.push(`${p} = ${param(0)}`);
				break;
			case "setPartial":
				for (const [k, v] of Object.entries(value[0])) if (shouldDelete(v)) rem.push(attrs.path([...path, k]));
				else set.push(`${attrs.path([...path, k])} = ${attrs.value(v, [...path, k])}`);
				break;
			case "setIfNotExists":
				if (shouldDelete(value[0])) rem.push(p);
				else set.push(`${p} = if_not_exists(${p}, ${param(0)})`);
				break;
			case "delete":
				rem.push(p);
				break;
			case "append":
				set.push(`${p} = list_append(${p}, ${listParam()})`);
				break;
			case "prepend":
				set.push(`${p} = list_append(${listParam()}, ${p})`);
				break;
			case "incr":
				set.push(`${p} = if_not_exists(${p}, ${param(1, { N: "0" })}) + ${param(0)}`);
				break;
			case "decr":
				set.push(`${p} = if_not_exists(${p}, ${param(1, { N: "0" })}) - ${param(0)}`);
				break;
			case "add":
				add.push(`${p} ${innerSetParam()}`);
				break;
			case "remove":
				del.push(`${p} ${innerSetParam()}`);
				break;
			default: throw new TypeError(`Unsupported operator: ${op}`);
		}
	}
	return [
		["SET", set],
		["ADD", add],
		["REMOVE", rem],
		["DELETE", del]
	].filter(([_, entries]) => entries.length).map(([op, entries]) => {
		return `${op} ${entries.join(", ")}`;
	}).join(" ");
};
//#endregion
//#region src/command/update-item.ts
const updateItem = (table, key, options) => {
	const client = getClient(options);
	const attrs = new ExpressionAttributes(table);
	const update = buildUpdateExpression(attrs, options.update);
	const condition = buildConditionExpression(attrs, options.when);
	const command = new UpdateItemCommand$1({
		TableName: table.name,
		Key: table.marshall(key),
		UpdateExpression: update,
		ConditionExpression: condition,
		ReturnValues: options.return,
		...attrs.attributes()
	});
	return {
		...transactable(() => ({ Update: command.input })),
		...thenable(async () => {
			const result = await client.send(command);
			if (result.Attributes) return table.unmarshall(result.Attributes);
		})
	};
};
//#endregion
//#region src/command/delete-item.ts
const deleteItem = (table, key, options = {}) => {
	const client = getClient(options);
	const attrs = new ExpressionAttributes(table);
	const command = new DeleteItemCommand$1({
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
			if (result.Attributes) return table.unmarshall(result.Attributes);
		})
	};
};
//#endregion
//#region src/command/get-items.ts
const getItems = (table, keys, options = { filterNonExistentItems: false }) => {
	const client = getClient(options);
	return thenable(async () => {
		const response = [];
		const unprocessedKeys = keys.map((key) => table.marshall(key));
		const attrs = new ExpressionAttributes(table);
		const projection = buildProjectionExpression(attrs, options.select);
		const attributes = attrs.attributeNames();
		let attempt = 0;
		while (unprocessedKeys.length) {
			const command = new BatchGetItemCommand$1({ RequestItems: { [table.name]: {
				Keys: unprocessedKeys.splice(0, 100),
				ConsistentRead: options.consistentRead,
				ProjectionExpression: projection,
				...attributes
			} } });
			const result = await client.send(command);
			const resultUnprocessedKeys = result.UnprocessedKeys?.[table.name]?.Keys ?? [];
			const resultProcessedItems = (result.Responses?.[table.name] ?? []).map((item) => table.unmarshall(item, options.select));
			unprocessedKeys.push(...resultUnprocessedKeys);
			response.push(...resultProcessedItems);
			if (resultUnprocessedKeys.length && resultProcessedItems.length === 0) await backoff(attempt++);
			else attempt = 0;
		}
		const list = keys.map((key) => {
			return response.find((item) => {
				for (const i in key) {
					const k = i;
					if (key[k] !== item?.[k]) return false;
				}
				return true;
			});
		});
		if (options.filterNonExistentItems) return list.filter((item) => !!item);
		return list;
	});
};
//#endregion
//#region src/command/delete-items.ts
const deleteItems = (table, keys, options = {}) => {
	const client = getClient(options);
	return thenable(async () => {
		const unprocessedItems = keys.map((key) => ({ DeleteRequest: { Key: table.marshall(key) } }));
		let attempt = 0;
		while (unprocessedItems.length) {
			const command = new BatchWriteItemCommand$1({ RequestItems: { [table.name]: unprocessedItems.splice(0, 25) } });
			const resultUnprocessedItems = (await client.send(command)).UnprocessedItems?.[table.name] ?? [];
			unprocessedItems.push(...resultUnprocessedItems);
			if (resultUnprocessedItems.length) await backoff(attempt++);
			else attempt = 0;
		}
	});
};
//#endregion
//#region src/helper/cursor.ts
const fromCursorString = (cursorStringValue) => {
	if (!cursorStringValue) return;
	try {
		const json = Buffer.from(cursorStringValue, "base64").toString("utf-8");
		return JSON.parse(json);
	} catch (error) {
		return;
	}
};
const toCursorString = (cursor) => {
	if (!cursor) return;
	const json = JSON.stringify(cursor);
	return Buffer.from(json, "utf-8").toString("base64");
};
//#endregion
//#region src/command/query.ts
const query = (table, key, options = {}) => {
	const client = getClient(options);
	const execute = async (cursor, limit) => {
		const sort = options.order ?? options.sort;
		const attrs = new ExpressionAttributes(table);
		const command = new QueryCommand$1({
			TableName: table.name,
			IndexName: options.index,
			KeyConditionExpression: buildConditionExpression(attrs, (e) => [...Object.entries(key).map(([k, v]) => e(k).eq(v)), ...options.where ? [options.where(e)] : []]),
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
				if ((await execute(result.cursor, 1)).items.length === 0) delete result.cursor;
			}
			return result;
		})
	};
};
//#endregion
//#region src/command/get-index-item.ts
const getIndexItem = (table, index, key, options) => {
	return thenable(async () => {
		return (await query(table, key, {
			...options,
			index,
			limit: 1,
			disablePreciseCursor: true
		})).items[0];
	});
};
//#endregion
//#region src/command/scan.ts
const scan = (table, options = {}) => {
	const client = getClient(options);
	const execute = async (cursor, limit) => {
		const attrs = new ExpressionAttributes(table);
		const command = new ScanCommand$1({
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
				if ((await execute(result.cursor, 1)).items.length === 0) delete result.cursor;
			}
			return result;
		})
	};
};
//#endregion
//#region src/command/condition-check.ts
const conditionCheck = (table, key, options) => {
	const attrs = new ExpressionAttributes(table);
	const input = {
		TableName: table.name,
		Key: table.marshall(key),
		ConditionExpression: buildConditionExpression(attrs, options.when),
		...attrs.attributes()
	};
	return transactable(() => ({ ConditionCheck: input }));
};
//#endregion
//#region src/command/transact-write.ts
const transactWrite = async (items, options = {}) => {
	const client = getClient(options);
	const command = new TransactWriteItemsCommand$1({
		ClientRequestToken: options.idempotantKey,
		TransactItems: items.map((item) => item.transact())
	});
	await client.send(command);
};
//#endregion
//#region src/command/transact-read.ts
const transactRead = async (items, options = {}) => {
	const transactItems = items.map((item) => item.transact());
	const command = new TransactGetItemsCommand$1({ TransactItems: transactItems.map((item) => item.input) });
	return ((await getClient(options).send(command)).Responses ?? []).map((res, i) => {
		if (res.Item) return transactItems[i].unmarshall(res.Item);
	});
};
//#endregion
export { BatchGetItemCommand, BatchWriteItemCommand, ConditionalCheckFailedException, DeleteItemCommand, DynamoDBClient, DynamoDBDocumentClient, DynamoDBServer, DynamoDBServiceException, Fluent, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand, Table, TransactGetItemsCommand, TransactWriteItemsCommand, TransactionCanceledException, TransactionConflictException, TransactionInProgressException, UpdateItemCommand, any, array, bigfloat, bigint, boolean, conditionCheck, createFluent, date, define, deleteItem, deleteItems, dynamoDBClient, dynamoDBDocumentClient, enum_, getIndexItem, getItem, getItems, json, migrate, mockDynamoDB, number, object, optional, putItem, putItems, query, record, scan, seed, seedTable, set, streamTable, string, transactRead, transactWrite, ttl, tuple, uint8array, unknown, updateItem, uuid, variant };
