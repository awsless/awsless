Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let node_https = require("node:https");
let _aws_sdk_credential_providers = require("@aws-sdk/credential-providers");
let _opensearch_project_opensearch = require("@opensearch-project/opensearch");
let _opensearch_project_opensearch_aws = require("@opensearch-project/opensearch/aws");
let _heat_request_port = require("@heat/request-port");
let crypto = require("crypto");
let fs_promises = require("fs/promises");
let path = require("path");
let decompress = require("decompress");
decompress = __toESM(decompress, 1);
let find_cache_directory = require("find-cache-directory");
find_cache_directory = __toESM(find_cache_directory, 1);
let child_process = require("child_process");
let util = require("util");
let sleep_await = require("sleep-await");
let _awsless_big_float = require("@awsless/big-float");
//#region src/client.ts
let mock;
const searchClient = (options = {}, service = "es") => {
	if (mock) return mock;
	const scheme = process.env.AWSLESS_ENV === "local" ? "http://" : "https://";
	const node = options.node ?? scheme + process.env.SEARCH_DOMAIN;
	const first = Array.isArray(node) ? node[0] : node;
	const nodeUrl = typeof first === "string" ? first : first?.url.href ?? "";
	return new _opensearch_project_opensearch.Client({
		node,
		requestTimeout: 5e3,
		agent: nodeUrl.startsWith("https") ? () => new node_https.Agent({ keepAlive: false }) : void 0,
		...(0, _opensearch_project_opensearch_aws.AwsSigv4Signer)({
			region: process.env.AWS_REGION,
			service,
			getCredentials: (0, _aws_sdk_credential_providers.fromEnv)()
		}),
		...options
	});
};
const mockClient = (host, port) => {
	mock = new _opensearch_project_opensearch.Client({ node: `http://${host}:${port}` });
};
//#endregion
//#region src/server/download.ts
const getArchiveName = (version) => {
	const name = `opensearch-min-${version}`;
	switch (process.platform) {
		case "win32": return `${name}-windows-arm64.zip`;
		default: return `${name}-linux-x64.tar.gz`;
	}
};
const getDownloadUrl = (version) => {
	return `https://artifacts.opensearch.org/releases/core/opensearch/${version}/${getArchiveName(version)}`;
};
const getDownloadPath = () => {
	return (0, path.resolve)((0, find_cache_directory.default)({
		name: "@awsless/open-search",
		cwd: process.cwd()
	}) || "");
};
const exists$1 = async (path$3) => {
	try {
		await (0, fs_promises.stat)(path$3);
	} catch {
		return false;
	}
	return true;
};
const download = async ({ version }) => {
	const path$4 = (0, path.join)(getDownloadPath(), "min");
	const name = `opensearch-${version}`;
	const file = (0, path.join)(path$4, name);
	if (await exists$1(file)) return file;
	console.log(`Downloading OpenSearch ${version}`);
	const url = getDownloadUrl(version);
	const response = await fetch(url, { method: "GET" });
	if (!response.ok) throw new Error(`Downloading OpenSearch failed with status ${response.status}: ${url}`);
	const data = await response.arrayBuffer();
	const buffer = Buffer.from(data);
	const checksumResponse = await fetch(`${url}.sha512`, { method: "GET" });
	if (!checksumResponse.ok) throw new Error(`Downloading the OpenSearch checksum failed with status ${checksumResponse.status}: ${url}.sha512`);
	const checksum = (await checksumResponse.text()).split(/\s+/)[0];
	if ((0, crypto.createHash)("sha512").update(buffer).digest("hex") !== checksum) throw new Error(`The OpenSearch archive doesn't match its published sha512 checksum: ${url}`);
	const staging = (0, path.join)(path$4, `staging-${process.pid}`);
	await (0, fs_promises.mkdir)(staging, {
		recursive: true,
		mode: "0777"
	});
	await (0, decompress.default)(buffer, staging);
	try {
		await (0, fs_promises.rename)((0, path.join)(staging, name), file);
	} catch (error) {
		if (!await exists$1(file)) throw error;
	}
	await (0, fs_promises.rm)(staging, {
		recursive: true,
		force: true
	});
	return file;
};
//#endregion
//#region src/server/java.ts
const exec = (0, util.promisify)(child_process.execFile);
const MINIMUM_JAVA_VERSION = 21;
const getJavaVersion = async (home) => {
	try {
		const result = await exec((0, path.join)(home, "bin/java"), ["-version"]);
		const match = `${result.stdout}${result.stderr}`.match(/version "(\d+)/);
		if (match) return Number(match[1]);
	} catch {}
};
const getMacJavaHome = async () => {
	try {
		return (await exec("/usr/libexec/java_home", ["-v", `${MINIMUM_JAVA_VERSION}+`])).stdout.trim() || void 0;
	} catch {}
};
const findJavaHome = async () => {
	const candidates = [
		process.env.OPENSEARCH_JAVA_HOME,
		process.env.JAVA_HOME,
		process.platform === "darwin" ? await getMacJavaHome() : void 0,
		"/opt/homebrew/opt/openjdk",
		"/opt/homebrew/opt/openjdk@21",
		"/usr/local/opt/openjdk",
		"/usr/local/opt/openjdk@21"
	];
	for (const home of candidates) {
		if (!home) continue;
		const version = await getJavaVersion(home);
		if (version && version >= MINIMUM_JAVA_VERSION) return home;
	}
};
//#endregion
//#region src/server/launch.ts
const exists = async (path$1) => {
	try {
		await (0, fs_promises.stat)(path$1);
	} catch {
		return false;
	}
	return true;
};
const parseSettings = (settings) => {
	return Object.entries(settings).map(([key, value]) => {
		return ["-E", `${key}=${value}`];
	}).flat();
};
const launch = async ({ path: path$2, host, port, version, debug, onExit: onDied, onOutput }) => {
	const cache = (0, path.join)(path$2, "cache", String(port));
	const cleanUp = async () => {
		if (await exists(cache)) await (0, fs_promises.rm)(cache, { recursive: true });
	};
	await cleanUp();
	const binary = (0, path.join)(path$2, "bin/opensearch");
	const env = { ...process.env };
	if (process.platform === "darwin") {
		const javaHome = await findJavaHome();
		if (!javaHome) throw new Error("No local JDK 21+ found to run OpenSearch. Install one with \"brew install openjdk\".");
		env.OPENSEARCH_JAVA_HOME = javaHome;
	}
	return new Promise((resolve, reject) => {
		const child = (0, child_process.spawn)(binary, parseSettings(version.settings({
			host,
			port,
			cache
		})), { env });
		const output = [];
		const onError = (error) => void fail(error);
		const onExit = (code) => {
			fail(`OpenSearch exited before starting (code ${code})\n${output.join("")}`);
		};
		const onMessage = (message) => {
			const line = message.toString("utf8").toLowerCase();
			output.push(line);
			if (debug) console.log(line);
			if (version.started(line)) done();
		};
		let stopping = false;
		const kill = async () => {
			stopping = true;
			if (child.exitCode === null && !child.killed) await new Promise((resolve) => {
				child.once(`exit`, () => {
					resolve(void 0);
				});
				child.kill();
			});
			await cleanUp();
		};
		process.on("beforeExit", async () => {
			off();
			await kill();
		});
		const off = () => {
			child.stderr.off("data", onMessage);
			child.stdout.off("data", onMessage);
			child.off("error", onError);
			child.off("exit", onExit);
		};
		const on = () => {
			child.stderr.on("data", onMessage);
			child.stdout.on("data", onMessage);
			child.on("error", onError);
			child.on("exit", onExit);
		};
		const done = () => {
			off();
			child.once("exit", (code, signal) => {
				if (!stopping) onDied?.(code, signal);
			});
			if (onOutput) {
				const capture = (chunk) => {
					for (const line of chunk.toString().split("\n")) if (line.trim() !== "") onOutput(line);
				};
				child.stdout.on("data", capture);
				child.stderr.on("data", capture);
			}
			resolve(kill);
		};
		const fail = async (error) => {
			off();
			await kill();
			reject(new Error(error));
		};
		on();
	});
};
//#endregion
//#region src/server/version.ts
const VERSION_3_5_0_MIN = {
	version: "3.5.0",
	started: (line) => line.includes("o.o.n.node") && line.includes("started"),
	settings: ({ port, host, cache }) => ({
		"discovery.type": "single-node",
		"http.host": host,
		"http.port": port,
		"path.data": `${cache}/data`,
		"path.logs": `${cache}/logs`,
		"cluster.routing.allocation.disk.threshold_enabled": "false"
	})
};
//#endregion
//#region src/server/wait.ts
const ping = async () => {
	const client = searchClient();
	try {
		return (await client.cat.indices({ format: "json" })).statusCode === 200;
	} catch {
		return false;
	}
};
const wait = async (times = 10) => {
	for (let count = 0; count < times; count++) {
		if (await ping()) return;
		await (0, sleep_await.sleepAwait)(100 * count);
	}
	throw new Error("ElasticSearch server is unavailable");
};
//#endregion
//#region src/mock.ts
const mockOpenSearch = ({ version = VERSION_3_5_0_MIN, debug = false } = {}) => {
	beforeAll && beforeAll(async () => {
		const [port, release] = await (0, _heat_request_port.requestPort)();
		const host = "localhost";
		const path = await download(version);
		const kill = await launch({
			path,
			port,
			host,
			version,
			debug
		});
		mockClient(host, port);
		await wait();
		return async () => {
			await kill();
			await release();
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
	const response = await (client ?? items[0].table.client()).bulk({
		refresh,
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
	await table.client().index({
		index: table.index,
		id,
		refresh,
		body: table.schema.encode(item)
	});
};
//#endregion
//#region src/ops/delete-item.ts
const deleteItem = async (table, id, { refresh = true } = {}) => {
	await table.client().delete({
		index: table.index,
		id,
		refresh
	});
};
//#endregion
//#region src/ops/update-item.ts
const updateItem = async (table, id, item, { refresh = true } = {}) => {
	await table.client().update({
		index: table.index,
		id,
		body: {
			doc: table.schema.encode(item),
			doc_as_upsert: true
		},
		refresh
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
const bigfloat = (props = {}) => new Schema((value) => new _awsless_big_float.BigFloat(value).toString(), (value) => (0, _awsless_big_float.parse)(value), {
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
exports.BulkError = BulkError;
exports.BulkItemError = BulkItemError;
exports.VERSION_3_5_0_MIN = VERSION_3_5_0_MIN;
exports.array = array;
exports.bigfloat = bigfloat;
exports.bigint = bigint;
exports.boolean = boolean;
exports.bulk = bulk;
exports.bulkCreateItem = bulkCreateItem;
exports.bulkDeleteItem = bulkDeleteItem;
exports.bulkIndexItem = bulkIndexItem;
exports.bulkUpdateItem = bulkUpdateItem;
exports.createIndex = createIndex;
exports.date = date;
exports.define = define;
exports.deleteIndex = deleteIndex;
exports.deleteItem = deleteItem;
exports.download = download;
exports.indexItem = indexItem;
exports.launch = launch;
exports.mockOpenSearch = mockOpenSearch;
exports.number = number;
exports.object = object;
exports.search = search;
exports.searchClient = searchClient;
exports.set = set;
exports.string = string;
exports.total = total;
exports.updateItem = updateItem;
exports.uuid = uuid;
