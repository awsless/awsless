import { Agent } from "node:https";
import { fromEnv } from "@aws-sdk/credential-providers";
import { Client } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws";
import { requestPort } from "@heat/request-port";
import { createHash } from "crypto";
import { mkdir, rename, rm, stat } from "fs/promises";
import { join, resolve } from "path";
import decompress from "decompress";
import findCacheDir from "find-cache-directory";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { sleepAwait } from "sleep-await";
import { BigFloat, parse } from "@awsless/big-float";
//#region src/client.ts
let mock;
const searchClient = (options = {}, service = "es") => {
	if (mock) return mock;
	const scheme = process.env.AWSLESS_ENV === "local" ? "http://" : "https://";
	const node = options.node ?? scheme + process.env.SEARCH_DOMAIN;
	const first = Array.isArray(node) ? node[0] : node;
	const nodeUrl = typeof first === "string" ? first : String(first?.url ?? "");
	return new Client({
		node,
		requestTimeout: 5e3,
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
	return resolve(findCacheDir({
		name: "@awsless/open-search",
		cwd: process.cwd()
	}) || "");
};
const exists$1 = async (path) => {
	try {
		await stat(path);
	} catch (error) {
		return false;
	}
	return true;
};
const download = async ({ version }) => {
	const path = join(getDownloadPath(), "min");
	const name = `opensearch-${version}`;
	const file = join(path, name);
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
	if (createHash("sha512").update(buffer).digest("hex") !== checksum) throw new Error(`The OpenSearch archive doesn't match its published sha512 checksum: ${url}`);
	const staging = join(path, `staging-${process.pid}`);
	await mkdir(staging, {
		recursive: true,
		mode: "0777"
	});
	await decompress(buffer, staging);
	try {
		await rename(join(staging, name), file);
	} catch (error) {
		if (!await exists$1(file)) throw error;
	}
	await rm(staging, {
		recursive: true,
		force: true
	});
	return file;
};
//#endregion
//#region src/server/java.ts
const exec = promisify(execFile);
const MINIMUM_JAVA_VERSION = 21;
const getJavaVersion = async (home) => {
	try {
		const result = await exec(join(home, "bin/java"), ["-version"]);
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
const exists = async (path) => {
	try {
		await stat(path);
	} catch (error) {
		return false;
	}
	return true;
};
const parseSettings = (settings) => {
	return Object.entries(settings).map(([key, value]) => {
		return ["-E", `${key}=${value}`];
	}).flat();
};
const launch = ({ path, host, port, version, debug, onExit: onDied, onOutput }) => {
	return new Promise(async (resolve, reject) => {
		const cache = join(path, "cache", String(port));
		const cleanUp = async () => {
			if (await exists(cache)) await rm(cache, { recursive: true });
		};
		await cleanUp();
		const binary = join(path, "bin/opensearch");
		const env = { ...process.env };
		if (process.platform === "darwin") {
			const javaHome = await findJavaHome();
			if (!javaHome) {
				reject(/* @__PURE__ */ new Error("No local JDK 21+ found to run OpenSearch. Install one with \"brew install openjdk\"."));
				return;
			}
			env.OPENSEARCH_JAVA_HOME = javaHome;
		}
		const child = spawn(binary, parseSettings(version.settings({
			host,
			port,
			cache
		})), { env });
		const output = [];
		const onError = (error) => fail(String(error));
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
		const done = async () => {
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
	const client = await searchClient();
	try {
		return (await client.cat.indices({ format: "json" })).statusCode === 200;
	} catch (error) {
		return false;
	}
};
const wait = async (times = 10) => {
	for (let count = 0; count < times; count++) {
		if (await ping()) return;
		await sleepAwait(100 * count);
	}
	throw new Error("ElasticSearch server is unavailable");
};
//#endregion
//#region src/mock.ts
const mockOpenSearch = ({ version = VERSION_3_5_0_MIN, debug = false } = {}) => {
	beforeAll && beforeAll(async () => {
		const [port, release] = await requestPort();
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
export { BulkError, BulkItemError, VERSION_3_5_0_MIN, array, bigfloat, bigint, boolean, bulk, bulkCreateItem, bulkDeleteItem, bulkIndexItem, bulkUpdateItem, createIndex, date, define, deleteIndex, deleteItem, download, indexItem, launch, mockOpenSearch, number, object, search, searchClient, set, string, total, updateItem, uuid };
