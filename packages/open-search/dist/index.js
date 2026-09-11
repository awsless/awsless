import { Agent } from "node:https";
import { fromEnv } from "@aws-sdk/credential-providers";
import { Client } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws";
import { OpenSearchServer, VERSION_3_5_0_MIN, download, launch } from "@awsless/open-search-server";
import { BigFloat, parse } from "@awsless/big-float";
//#region src/client.ts
let mock;
const searchClient = (options = {}, service = "es") => {
	if (mock) return mock;
	const node = options.node ?? process.env.SEARCH_ENDPOINT;
	if (!node) throw new Error("No search endpoint - set the SEARCH_ENDPOINT env or pass the node option.");
	const first = Array.isArray(node) ? node[0] : node;
	const nodeUrl = typeof first === "string" ? first : first?.url.href ?? "";
	return new Client({
		node,
		requestTimeout: isServerlessEndpoint(nodeUrl) ? 3e4 : 5e3,
		agent: nodeUrl.startsWith("https") ? () => new Agent({ keepAlive: false }) : void 0,
		...AwsSigv4Signer({
			region: process.env.AWS_REGION,
			service,
			getCredentials: fromEnv()
		}),
		...options
	});
};
const mockClient = (host, port) => {
	mock = new Client({ node: `http://${host}:${port}` });
};
const isServerlessEndpoint = (endpoint) => {
	return endpoint?.includes(".aoss.") ?? false;
};
const isServerless = (client) => {
	return isServerlessEndpoint(client.connectionPool.connections[0]?.url.href);
};
//#endregion
//#region src/mock.ts
const mockOpenSearch = ({ engine, version, debug } = {}) => {
	beforeAll && beforeAll(async () => {
		const server = new OpenSearchServer({
			engine,
			version,
			debug
		});
		await server.listen();
		mockClient(server.host, server.port);
		return async () => {
			await server.close();
		};
	}, 1e6);
};
//#endregion
//#region src/table.ts
const define = (index, schema, client) => {
	return {
		index,
		schema,
		client
	};
};
//#endregion
//#region src/ops/bulk.ts
const bulkDeleteItem = (table, id) => {
	return {
		action: "delete",
		table,
		id
	};
};
const bulkIndexItem = (table, id, item) => {
	return {
		action: "index",
		table,
		item,
		id
	};
};
const bulkCreateItem = (table, id, item) => {
	return {
		action: "create",
		table,
		item,
		id
	};
};
const bulkUpdateItem = (table, id, item) => {
	return {
		action: "update",
		table,
		item,
		id
	};
};
const bulk = async ({ items, client, refresh = true }) => {
	if (items.length === 0) return;
	const openSearchClient = client ?? items[0].table.client();
	const response = await openSearchClient.bulk({
		refresh: isServerless(openSearchClient) ? void 0 : refresh,
		body: items.map((entry) => {
			const body = [{ [entry.action]: {
				_id: entry.id,
				_index: entry.table.index
			} }];
			if (entry.action === "create" || entry.action === "index") body.push(entry.table.schema.encode(entry.item));
			else if (entry.action === "update") body.push({ doc: entry.table.schema.encode(entry.item) });
			return body;
		}).flat()
	});
	if (response.body.errors) throw new BulkError(findBulkItemErrors(response.body.items));
};
var BulkError = class extends Error {
	items;
	constructor(items) {
		super("Bulk error");
		this.items = items;
	}
};
var BulkItemError = class extends Error {
	index;
	id;
	type;
	constructor(index, id, type, message) {
		super(message);
		this.index = index;
		this.id = id;
		this.type = type;
	}
};
const findBulkItemErrors = (items) => {
	const errors = [];
	for (const entry of items) {
		const item = entry.delete || entry.update || entry.create || entry.index;
		if (item.error) errors.push(new BulkItemError(item._index, item._id, item.error.type, item.error.reason));
	}
	return errors;
};
//#endregion
//#region src/ops/total.ts
const total = async (table) => {
	return (await table.client().count({ index: table.index })).body.count;
};
//#endregion
//#region src/ops/search.ts
const encodeCursor = (cursor) => {
	const json = JSON.stringify(cursor);
	return Buffer.from(json, "utf8").toString("base64");
};
const decodeCursor = (cursor) => {
	if (!cursor) return;
	try {
		const json = Buffer.from(cursor, "base64").toString("utf8");
		return JSON.parse(json);
	} catch {
		return;
	}
};
const search = async (table, { query, aggs, limit = 10, offset, cursor, sort, trackTotalHits }) => {
	const { hits, total } = (await table.client().search({
		index: table.index,
		body: {
			from: offset,
			size: limit + 1,
			search_after: decodeCursor(cursor),
			track_total_hits: trackTotalHits,
			query,
			aggs,
			sort
		}
	})).body.hits;
	let nextCursor;
	if (hits.length > limit) {
		const last = hits[limit - 1];
		if (last) nextCursor = encodeCursor(last.sort);
	}
	const items = hits.splice(0, limit);
	return {
		cursor: nextCursor,
		found: total.value,
		count: items.length,
		items: items.map((item) => table.schema.decode(item._source))
	};
};
//#endregion
//#region src/ops/index-item.ts
const indexItem = async (table, id, item, { refresh = true } = {}) => {
	const client = table.client();
	await client.index({
		index: table.index,
		id,
		refresh: isServerless(client) ? void 0 : refresh,
		body: table.schema.encode(item)
	});
};
//#endregion
//#region src/ops/delete-item.ts
const deleteItem = async (table, id, { refresh = true } = {}) => {
	const client = table.client();
	await client.delete({
		index: table.index,
		id,
		refresh: isServerless(client) ? void 0 : refresh
	});
};
//#endregion
//#region src/ops/update-item.ts
const updateItem = async (table, id, item, { refresh = true } = {}) => {
	const client = table.client();
	await client.update({
		index: table.index,
		id,
		body: {
			doc: table.schema.encode(item),
			doc_as_upsert: true
		},
		refresh: isServerless(client) ? void 0 : refresh
	});
};
//#endregion
//#region src/ops/create-index.ts
const createIndex = async (table) => {
	if (!(await table.client().cat.indices({ format: "json" })).body.find((item) => {
		return item.index === table.index;
	})) await table.client().indices.create({ index: table.index });
	await table.client().indices.putMapping({
		index: table.index,
		body: table.schema.mapping
	});
};
//#endregion
//#region src/ops/delete-index.ts
const deleteIndex = async (table) => {
	if ((await table.client().cat.indices({ format: "json" })).body.find((item) => {
		return item.index === table.index;
	})) await table.client().indices.delete({ index: table.index });
};
//#endregion
//#region src/schema/schema.ts
var Schema = class {
	encode;
	decode;
	mapping;
	constructor(encode, decode, mapping) {
		this.encode = encode;
		this.decode = decode;
		this.mapping = mapping;
	}
};
//#endregion
//#region src/schema/array.ts
const array = (struct) => {
	return new Schema((input) => input.map((item) => struct.encode(item)), (encoded) => encoded.map((item) => struct.decode(item)), struct.mapping);
};
//#endregion
//#region src/schema/bigfloat.ts
const bigfloat = (props = {}) => new Schema((value) => new BigFloat(value).toString(), (value) => parse(value), {
	type: "double",
	...props
});
//#endregion
//#region src/schema/bigint.ts
const bigint = (props = {}) => new Schema((value) => value.toString(), (value) => BigInt(value), {
	type: "long",
	...props
});
//#endregion
//#region src/schema/boolean.ts
const boolean = (props = {}) => new Schema((value) => value, (value) => value, {
	type: "boolean",
	...props
});
//#endregion
//#region src/schema/date.ts
const date = (props = {}) => new Schema((value) => value.toISOString(), (value) => new Date(value), {
	type: "date",
	...props
});
//#endregion
//#region src/schema/number.ts
const number = (props = {}) => new Schema((value) => value.toString(), (value) => Number(value), {
	type: "double",
	...props
});
//#endregion
//#region src/schema/object.ts
const object = (entries) => {
	const properties = {};
	for (const key in entries) properties[key] = entries[key].mapping;
	return new Schema((input) => {
		const encoded = {};
		for (const key in input) {
			const field = entries[key];
			if (typeof field === "undefined") throw new TypeError(`No '${key}' property present on schema.`);
			encoded[key] = field.encode(input[key]);
		}
		return encoded;
	}, (encoded) => {
		const output = {};
		for (const key in encoded) {
			const field = entries[key];
			if (typeof field === "undefined") throw new TypeError(`No '${key}' property present on schema.`);
			output[key] = field.decode(encoded[key]);
		}
		return output;
	}, { properties });
};
//#endregion
//#region src/schema/set.ts
const set = (struct) => {
	return new Schema((input) => [...input].map((item) => struct.encode(item)), (encoded) => new Set(encoded.map((item) => struct.decode(item))), struct.mapping);
};
//#endregion
//#region src/schema/string.ts
const string = (props = {}) => new Schema((value) => value, (value) => value, {
	type: "keyword",
	...props
});
//#endregion
//#region src/schema/uuid.ts
const uuid = (props = {}) => new Schema((value) => value, (value) => value, {
	type: "keyword",
	...props
});
//#endregion
export { BulkError, BulkItemError, VERSION_3_5_0_MIN, array, bigfloat, bigint, boolean, bulk, bulkCreateItem, bulkDeleteItem, bulkIndexItem, bulkUpdateItem, createIndex, date, define, deleteIndex, deleteItem, download, indexItem, isServerlessEndpoint, launch, mockOpenSearch, number, object, search, searchClient, set, string, total, updateItem, uuid };
