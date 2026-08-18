import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.js";
import { requestPort } from "@heat/request-port";
import { Cluster, Command, Redis } from "ioredis";
import { RedisMemoryServer } from "redis-memory-server";
import { mul, parse } from "@awsless/big-float";
import { Duration, milliSeconds, toSafeMilliSeconds } from "@awsless/duration";
import chunk from "chunk";
import { createHash } from "node:crypto";
//#region src/client/ioredis.ts
const filterArgs = (args) => {
	return args.filter((arg) => typeof arg !== "undefined");
};
const createCommand = (redis, name, args, options) => {
	return new Command(name, filterArgs(args), {
		errorStack: redis.options.showFriendlyErrorStack ? /* @__PURE__ */ new Error() : void 0,
		keyPrefix: redis.options.keyPrefix,
		readOnly: options?.readonly,
		replyEncoding: "utf8"
	});
};
let optionOverrides = {};
const overrideOptions = (options) => {
	optionOverrides = options;
};
const createIoRedisClient = (options) => {
	const createClient = () => {
		const props = {
			tls: {},
			lazyConnect: true,
			stringNumbers: true,
			keepAlive: 0,
			noDelay: true,
			enableReadyCheck: false,
			maxRetriesPerRequest: 3,
			autoResubscribe: false,
			autoResendUnfulfilledCommands: false,
			connectTimeout: 5e3,
			commandTimeout: 5e3,
			reconnectOnError(err) {
				return err.message.includes("READONLY") ? 2 : false;
			},
			...options,
			...optionOverrides
		};
		if (!props.cluster) return new Redis(props);
		else return new Cluster([{
			host: props.host,
			port: props.port
		}], {
			dnsLookup: (address, callback) => callback(null, address),
			slotsRefreshTimeout: 5e3,
			enableReadyCheck: false,
			clusterRetryStrategy(times) {
				if (times > 5) return null;
				return Math.min(times * 200, 2e3);
			},
			redisOptions: props
		});
	};
	let redis;
	const getLazyClient = () => {
		if (!redis) redis = createClient();
		return redis;
	};
	return {
		send: (name, args, options) => {
			const redis = getLazyClient();
			return redis.sendCommand(createCommand(redis, name, args, options));
		},
		batch: (commands) => {
			const pipe = getLazyClient().pipeline();
			for (const command of commands) pipe.sendCommand(createCommand(pipe, command.name, command.args, command.options));
			return pipe.exec();
		},
		transact: (commands) => {
			const pipe = getLazyClient().multi();
			for (const command of commands) pipe.sendCommand(createCommand(pipe, command.name, command.args, command.options));
			return pipe.exec();
		},
		async destroy() {
			if (redis) {
				const promise = redis.quit();
				redis = void 0;
				await promise;
			}
		}
	};
};
//#endregion
//#region src/test/server.ts
var RedisServer = class {
	client;
	process;
	stopping = false;
	async start(port, version = "7.2.4", args = []) {
		if (this.process) throw new Error(`Redis server is already listening on port: ${await this.process.getPort()}`);
		if (port && (port < 0 || port >= 65536)) throw new RangeError(`Port should be >= 0 and < 65536. Received ${port}.`);
		this.stopping = false;
		this.process = await RedisMemoryServer.create({
			instance: {
				port,
				args
			},
			binary: { version }
		});
	}
	onExit(handler) {
		(this.process?.instanceInfoSync?.childProcess)?.once("exit", (code, signal) => {
			if (!this.stopping) handler(code, signal);
		});
	}
	onOutput(handler) {
		const child = this.process?.instanceInfoSync?.childProcess;
		const capture = (chunk) => {
			for (const line of chunk.toString().split("\n")) if (line.trim() !== "") handler(line);
		};
		child?.stdout?.on("data", capture);
		child?.stderr?.on("data", capture);
	}
	async kill() {
		if (this.process) {
			this.stopping = true;
			await this.client?.disconnect();
			await this.process.stop();
			this.process = void 0;
		}
	}
	async getPort() {
		const port = await this.process?.getPort();
		if (!port) throw new Error("The redis server is not running.");
		return port;
	}
	async ping() {
		return await (await this.getClient()).ping() === "PONG";
	}
	async getClient() {
		if (!this.client) {
			this.client = new Redis({
				host: await this.process?.getHost(),
				port: await this.process?.getPort(),
				stringNumbers: true,
				keepAlive: 0,
				noDelay: true,
				enableReadyCheck: false,
				maxRetriesPerRequest: null,
				retryStrategy(times) {
					return times > 3 ? null : Math.min(times * 200, 1e3);
				}
			});
			this.client.on("error", () => {});
		}
		return this.client;
	}
};
//#endregion
//#region src/test/mock.ts
const mockRedis = () => {
	const server = new RedisServer();
	let releasePort;
	beforeAll && beforeAll(async () => {
		const [port, release] = await requestPort();
		releasePort = release;
		await server.start(port);
		await server.ping();
		overrideOptions({
			port,
			host: "localhost",
			cluster: false,
			tls: void 0,
			commandQueue: false,
			offlineQueue: false
		});
	}, 3e4);
	afterAll && afterAll(async () => {
		await server.kill();
		await releasePort();
	}, 3e4);
};
//#endregion
//#region src/command/util.ts
const removeNull = (value) => {
	if (value === null) return;
	return value;
};
const returnVoid = () => {};
const returnEcho = (v) => v;
const returnBoolean = (v) => !!v;
const returnNumberBoolean = (v) => v === 1 || v === "1";
const returnInt = (v) => parseInt(v, 10);
const returnFloat = (v) => parseFloat(v);
const returnScanResult = ([cursor, items]) => {
	if (cursor === "0") return {
		cursor: void 0,
		items
	};
	return {
		cursor,
		items
	};
};
const buildScanArgs = ({ match, limit, cursor }) => {
	const args = [];
	args.push(cursor ?? 0);
	args.push("COUNT", limit ?? 10);
	if (match) args.push("MATCH", match);
	return args;
};
const command = (redis, name, args, resolve, options) => {
	let promise;
	return {
		name,
		args,
		options,
		resolve,
		then(onfulfilled, onrejected) {
			if (!promise) promise = redis.send(name, args, options).then(resolve);
			return promise.then(onfulfilled).catch(onrejected);
		}
	};
};
const iterable = (cursor, callback) => {
	return { [Symbol.asyncIterator]() {
		let done = false;
		return { async next() {
			if (done) return { done: true };
			const result = await callback(cursor);
			cursor = result.cursor;
			if (!result.cursor) done = true;
			if (Array.isArray(result.items) && result.items.length === 0) return { done: true };
			if ((result.items instanceof Set || result.items instanceof Map) && result.items.size === 0) return { done: true };
			return {
				value: result.items,
				done: false
			};
		} };
	} };
};
//#endregion
//#region src/command/key.ts
var key_exports = /* @__PURE__ */ __exportAll({
	asyncDelete: () => asyncDelete,
	delete: () => del$5,
	has: () => has$5,
	rename: () => rename,
	scan: () => scan$4,
	type: () => type
});
/**
* Check whether a key exists.
*
* @command EXISTS
* @complexity O(N) where N is the number of keys to check
* @speed fast
* @since 1.0.0
*/
const has$5 = (client, key) => {
	return command(client, "EXISTS", [key], returnNumberBoolean);
};
/**
* Delete a key.
*
* @command DEL
* @complexity O(N) where N is the number of keys that will be removed
* @speed slow
* @since 1.0.0
*/
const del$5 = (client, key) => {
	return command(client, "DEL", [key], returnBoolean);
};
/**
* Delete a key asynchronously.
*
* @command UNLINK
* @complexity O(1) for each key removed from the keyspace. The actual memory reclaiming happens asynchronously
* @speed fast
* @since 4.0.0
*/
const asyncDelete = (client, key) => {
	return command(client, "UNLINK", [key], returnBoolean);
};
/**
* Get the type of value stored at a key.
*
* @command TYPE
* @complexity O(1)
* @speed fast
* @since 1.0.0
*/
const type = (client, key) => {
	return command(client, "TYPE", [key], returnEcho);
};
/**
* Rename a key.
*
* @command RENAME | RENAMENX
* @complexity O(1)
* @speed fast
* @since 1.0.0
*/
const rename = (client, from, to, options = {}) => {
	if (options.when === "not-exists") return command(client, "RENAMENX", [from, to], returnNumberBoolean);
	return command(client, "RENAME", [from, to], () => {
		return true;
	});
};
const formatScanResult$3 = (result) => {
	return returnScanResult(result);
};
/**
* Iterate through keys in the current database.
*
* @command SCAN
* @complexity O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return to 0
* @speed slow
* @since 2.8.0
*/
const scan$4 = (client, options = {}) => {
	return {
		...command(client, "SCAN", buildScanArgs(options), formatScanResult$3),
		[Symbol.asyncIterator]() {
			let cursor = options.cursor;
			let done = false;
			return { async next() {
				while (!done) {
					const result = await client.send("SCAN", buildScanArgs({
						...options,
						cursor
					}));
					const formatted = formatScanResult$3(result);
					cursor = formatted.cursor;
					if (!formatted.cursor) done = true;
					if (formatted.items.length > 0) return {
						value: formatted.items,
						done: false
					};
				}
				return { done: true };
			} };
		}
	};
};
//#endregion
//#region src/command/string.ts
var string_exports = /* @__PURE__ */ __exportAll({
	append: () => append$1,
	decr: () => decr$1,
	delete: () => del$4,
	get: () => get$3,
	has: () => has$4,
	incr: () => incr$2,
	set: () => set$3,
	substring: () => substring
});
/**
* Get a string value by key.
*
* @command GET
* @complexity O(1)
* @speed fast
* @since 1.0.0
*/
const get$3 = (client, key) => {
	return command(client, "GET", [key], removeNull);
};
/**
* Set a string value with optional TTL and existence conditions.
*
* @command SET
* @complexity O(1)
* @speed slow
* @since 1.0.0
*/
const set$3 = (client, key, value, options = {}) => {
	const args = [key, value];
	if (options.when === "exists") args.push("XX");
	if (options.when === "not-exists") args.push("NX");
	if (options.ttl instanceof Date) args.push("PXAT", options.ttl.getTime());
	if (options.ttl instanceof Duration) args.push("PX", toSafeMilliSeconds(options.ttl).toString());
	if (options.ttl === "keep") args.push("KEEPTTL");
	return command(client, "SET", args, returnBoolean);
};
/**
* Check whether a key exists.
*
* @command EXISTS
* @complexity O(N) where N is the number of keys to check
* @speed fast
* @since 1.0.0
*/
const has$4 = has$5;
/**
* Increment a numeric string value by a given amount.
*
* @command INCRBYFLOAT
* @complexity O(1)
* @speed fast
* @since 2.6.0
*/
const incr$2 = (client, key, value = 1) => {
	const num = parse(value).toString();
	return command(client, "INCRBYFLOAT", [key, num], returnEcho);
};
/**
* Decrement a numeric string value by a given amount.
*
* @command INCRBYFLOAT
* @complexity O(1)
* @speed fast
* @since 2.6.0
*/
const decr$1 = (client, key, value = 1) => {
	const num = mul(value, -1).toString();
	return command(client, "INCRBYFLOAT", [key, num], returnEcho);
};
/**
* Append text to the end of a string value.
*
* @command APPEND
* @complexity O(1). The amortized time complexity is O(1) assuming the appended value is small and the already present value is any size
* @speed fast
* @since 2.0.0
*/
const append$1 = (client, key, value) => {
	return command(client, "APPEND", [key, value], returnInt);
};
/**
* Read a substring by start and end offsets.
*
* @command GETRANGE
* @complexity O(N) where N is the length of the returned string
* @speed slow
* @since 2.4.0
*/
const substring = (client, key, start, end = -1) => {
	return command(client, "GETRANGE", [
		key,
		start,
		end
	], returnEcho);
};
/**
* Delete a key.
*
* @command DEL
* @complexity O(N) where N is the number of keys that will be removed
* @speed slow
* @since 1.0.0
*/
const del$4 = del$5;
//#endregion
//#region src/command/map/ttl.ts
var ttl_exports$1 = /* @__PURE__ */ __exportAll({
	delete: () => persist$1,
	duration: () => duration$1,
	get: () => get$2,
	set: () => set$2
});
/**
* Set expirations on one or more hash fields.
*
* @command HPEXPIRE | HPEXPIREAT
* @complexity O(N) where N is the number of specified fields
* @speed fast
* @since 7.4.0
*/
const set$2 = (client, key, ttl, ...fields) => {
	const isDate = ttl instanceof Date;
	const cmd = isDate ? "HPEXPIREAT" : "HPEXPIRE";
	const args = [key];
	if (isDate) args.push(ttl.getTime());
	else args.push(toSafeMilliSeconds(ttl).toString());
	return command(client, cmd, [
		...args,
		"FIELDS",
		fields.length,
		...fields
	], (r) => r.map(returnBoolean));
};
/**
* Get expiration dates for hash fields.
*
* @command HPEXPIRETIME
* @complexity O(N) where N is the number of specified fields
* @speed fast
* @since 7.4.0
*/
const get$2 = (client, key, ...fields) => {
	return command(client, "HPEXPIRETIME", [
		key,
		"FIELDS",
		fields.length,
		...fields
	], (r) => r.map((v) => {
		if (v < 0) return;
		return new Date(v);
	}));
};
/**
* Get remaining TTL durations for hash fields.
*
* @command HPTTL
* @complexity O(N) where N is the number of specified fields
* @speed fast
* @since 7.4.0
*/
const duration$1 = (client, key, ...fields) => {
	return command(client, "HPTTL", [
		key,
		"FIELDS",
		fields.length,
		...fields
	], (r) => r.map((v) => {
		if (v < 0) return;
		return milliSeconds(v);
	}));
};
/**
* Remove expirations from hash fields.
*
* @command HPERSIST
* @complexity O(N) where N is the number of specified fields
* @speed fast
* @since 7.4.0
*/
const persist$1 = (client, key, ...fields) => {
	return command(client, "HPERSIST", [
		key,
		"FIELDS",
		fields.length,
		...fields
	], (r) => r.map(returnBoolean));
};
//#endregion
//#region src/command/map.ts
var map_exports = /* @__PURE__ */ __exportAll({
	all: () => all$3,
	clear: () => clear$3,
	decr: () => decr,
	delete: () => del$3,
	get: () => get$1,
	has: () => has$3,
	incr: () => incr$1,
	length: () => length$3,
	scan: () => scan$3,
	set: () => set$1,
	ttl: () => ttl_exports$1
});
/**
* Get a hash field value.
*
* @command HGET
* @complexity O(1)
* @speed fast
* @since 2.0.0
*/
const get$1 = (client, key, field) => {
	return command(client, "HGET", [key, field], removeNull);
};
/**
* Set a hash field value.
*
* @command HSET
* @complexity O(1) for each field/value pair added
* @speed fast
* @since 2.0.0
*/
const set$1 = (client, key, field, value) => {
	return command(client, "HSET", [
		key,
		field,
		value
	], returnBoolean);
};
/**
* Check whether a hash field exists.
*
* @command HEXISTS
* @complexity O(1)
* @speed fast
* @since 2.0.0
*/
const has$3 = (client, key, field) => {
	return command(client, "HEXISTS", [key, field], returnBoolean);
};
/**
* Delete a field from a hash.
*
* @command HDEL
* @complexity O(N) where N is the number of fields to be removed
* @speed fast
* @since 2.0.0
*/
const del$3 = (client, key, field) => {
	return command(client, "HDEL", [key, field], returnBoolean);
};
/**
* Increment a numeric hash field by a given amount.
*
* @command HINCRBYFLOAT
* @complexity O(1)
* @speed fast
* @since 2.6.0
*/
const incr$1 = (client, key, field, value = 1) => {
	const num = parse(value).toString();
	return command(client, "HINCRBYFLOAT", [
		key,
		field,
		num
	], returnEcho);
};
/**
* Decrement a numeric hash field by a given amount.
*
* @command HINCRBYFLOAT
* @complexity O(1)
* @speed fast
* @since 2.6.0
*/
const decr = (client, key, field, value = 1) => {
	const num = mul(value, -1).toString();
	return command(client, "HINCRBYFLOAT", [
		key,
		field,
		num
	], returnEcho);
};
/**
* Get the number of fields in a hash.
*
* @command HLEN
* @complexity O(1)
* @speed fast
* @since 2.0.0
*/
const length$3 = (client, key) => {
	return command(client, "HLEN", [key], returnInt);
};
/**
* Delete an entire hash key.
*
* @command DEL
* @complexity O(N) where N is the number of keys that will be removed
* @speed slow
* @since 1.0.0
*/
const clear$3 = del$5;
/**
* Get all fields and values from a hash.
*
* @command HGETALL
* @complexity O(N) where N is the size of the hash
* @speed slow
* @since 2.1.0
*/
const all$3 = (client, key) => {
	return command(client, "HGETALL", [key], (items) => new Map(chunk(items, 2)));
};
const formatScanResult$2 = (result) => {
	const { cursor, items } = returnScanResult(result);
	return {
		cursor,
		items: new Map(chunk(items, 2))
	};
};
/**
* Iterate through hash fields and values.
*
* @command HSCAN
* @complexity O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return to 0
* @speed slow
* @since 2.8.0
*/
const scan$3 = (client, key, options = {}) => {
	return {
		...command(client, "HSCAN", [key, ...buildScanArgs(options)], formatScanResult$2),
		...iterable(options.cursor, async (cursor) => {
			const result = await client.send("HSCAN", [key, ...buildScanArgs({
				...options,
				cursor
			})]);
			return formatScanResult$2(result);
		})
	};
};
//#endregion
//#region src/command/ttl.ts
var ttl_exports = /* @__PURE__ */ __exportAll({
	delete: () => persist,
	duration: () => duration,
	get: () => get,
	set: () => set
});
/**
* Set or update the expiration for a string key.
*
* @command PEXPIRE | PEXPIREAT
* @complexity O(1)
* @speed fast
* @since 2.6.0
*/
const set = (client, key, ttl) => {
	const isDate = ttl instanceof Date;
	const cmd = isDate ? "PEXPIREAT" : "PEXPIRE";
	const args = [key];
	if (isDate) args.push(ttl.getTime());
	else args.push(toSafeMilliSeconds(ttl).toString());
	return command(client, cmd, args, returnBoolean);
};
/**
* Get the expiration date for a string key.
*
* @command PEXPIRETIME
* @complexity O(1)
* @speed fast
* @since 7.0.0
*/
const get = (client, key) => {
	return command(client, "PEXPIRETIME", [key], (r) => {
		if (r < 0) return;
		return new Date(r);
	});
};
/**
* Get the remaining TTL duration for a string key.
*
* @command PTTL
* @complexity O(1)
* @speed fast
* @since 2.6.0
*/
const duration = (client, key) => {
	return command(client, "PTTL", [key], (r) => {
		if (r < 0) return;
		return milliSeconds(r);
	});
};
/**
* Remove the expiration from a string key.
*
* @command PERSIST
* @complexity O(1)
* @speed fast
* @since 2.2.0
*/
const persist = (client, key) => {
	return command(client, "PERSIST", [key], returnBoolean);
};
//#endregion
//#region src/command/set.ts
var set_exports = /* @__PURE__ */ __exportAll({
	add: () => add$1,
	all: () => all$2,
	clear: () => clear$2,
	delete: () => del$2,
	has: () => has$2,
	length: () => length$2,
	pop: () => pop$2,
	random: () => random$1,
	scan: () => scan$2
});
const returnSet = (r) => new Set(r);
/**
* Add one or more values to a set.
*
* @command SADD
* @complexity O(N) where N is the number of members to be added
* @speed fast
* @since 1.0.0
*/
const add$1 = (client, key, ...values) => {
	return command(client, "SADD", [key, ...values], returnInt);
};
/**
* Remove one or more values from a set.
*
* @command SREM
* @complexity O(N) where N is the number of members to be removed
* @speed fast
* @since 1.0.0
*/
const del$2 = (client, key, ...values) => {
	return command(client, "SREM", [key, ...values], returnInt);
};
/**
* Check whether a set contains a value.
*
* @command SISMEMBER
* @complexity O(1)
* @speed fast
* @since 1.0.0
*/
const has$2 = (client, key, value) => {
	return command(client, "SISMEMBER", [key, value], returnBoolean);
};
function random$1(client, key, count) {
	return command(client, "SRANDMEMBER", [key, count], typeof count !== "undefined" ? returnSet : removeNull);
}
function pop$2(client, key, count) {
	return command(client, "SPOP", [key, count], typeof count !== "undefined" ? returnSet : removeNull);
}
/**
* Get the number of values in a set.
*
* @command SCARD
* @complexity O(1)
* @speed fast
* @since 1.0.0
*/
const length$2 = (client, key) => {
	return command(client, "SCARD", [key], returnInt);
};
/**
* Delete a set key.
*
* @command DEL
* @complexity O(N) where N is the number of keys that will be removed
* @speed slow
* @since 1.0.0
*/
const clear$2 = del$5;
/**
* Get all values from a set.
*
* @command SMEMBERS
* @complexity O(N) where N is the set cardinality
* @speed slow
* @since 2.1.0
*/
const all$2 = (client, key) => {
	return command(client, "SMEMBERS", [key], returnSet);
};
const formatScanResult$1 = (result) => {
	const { cursor, items } = returnScanResult(result);
	return {
		cursor,
		items: new Set(items)
	};
};
/**
* Iterate through set values.
*
* @command SSCAN
* @complexity O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return to 0
* @speed slow
* @since 2.8.0
*/
const scan$2 = (client, key, options = {}) => {
	return {
		...command(client, "SSCAN", [key, ...buildScanArgs(options)], formatScanResult$1),
		...iterable(options.cursor, async (cursor) => {
			const result = await client.send("SSCAN", [key, ...buildScanArgs({
				...options,
				cursor
			})]);
			return formatScanResult$1(result);
		})
	};
};
//#endregion
//#region src/command/sorted-set.ts
var sorted_set_exports = /* @__PURE__ */ __exportAll({
	add: () => add,
	all: () => all$1,
	clear: () => clear$1,
	delete: () => del$1,
	has: () => has$1,
	incr: () => incr,
	indexOf: () => indexOf$1,
	length: () => length$1,
	pop: () => pop$1,
	random: () => random,
	rangeByLex: () => rangeByLex,
	rangeByRank: () => rangeByRank,
	rangeByScore: () => rangeByScore,
	scan: () => scan$1,
	score: () => score
});
const returnOptionalFloat = (value) => {
	if (value === null) return;
	return parseFloat(value);
};
const returnEntry = ([value, score]) => [value, parseFloat(score.toString())];
const returnSortedSet = (r) => chunk(r, 2).map((entry) => returnEntry(entry));
const returnOptionalEntry = (r) => r.length === 0 ? void 0 : returnEntry(r);
/**
* Add one or more scored values to a sorted set.
*
* @command ZADD
* @complexity O(log(N)) for each item added, where N is the number of elements in the sorted set
* @speed fast
* @since 1.2.0
*/
const add = (client, key, ...values) => {
	const entries = values.map(([value, score]) => [score.toString(), value]).flat();
	return command(client, "ZADD", [key, ...entries], returnInt);
};
/**
* Increment the score for a value in a sorted set.
*
* @command ZINCRBY
* @complexity O(log(N)) where N is the number of elements in the sorted set
* @speed fast
* @since 1.2.0
*/
const incr = (client, key, value, score) => {
	return command(client, "ZINCRBY", [
		key,
		score.toString(),
		value
	], returnFloat);
};
/**
* Get the score for a value in a sorted set.
*
* @command ZSCORE
* @complexity O(1)
* @speed fast
* @since 1.2.0
*/
const score = (client, key, value) => {
	return command(client, "ZSCORE", [key, value], returnOptionalFloat);
};
/**
* Get the rank of a value in a sorted set.
*
* @command ZRANK
* @complexity O(log(N)) where N is the number of elements in the sorted set
* @speed fast
* @since 2.0.0
*/
const indexOf$1 = (client, key, value) => {
	return command(client, "ZRANK", [key, value], removeNull);
};
/**
* Remove one or more values from a sorted set.
*
* @command ZREM
* @complexity O(M*log(N)) with N being the number of elements in the sorted set and M the number of elements to be removed
* @speed fast
* @since 1.2.0
*/
const del$1 = (client, key, ...values) => {
	return command(client, "ZREM", [key, ...values], returnInt);
};
/**
* Check whether a sorted set contains a value.
*
* @command ZRANK
* @complexity O(log(N)) where N is the number of elements in the sorted set
* @speed fast
* @since 2.0.0
*/
const has$1 = (client, key, value) => {
	return command(client, "ZRANK", [key, value], (r) => r !== null);
};
function random(client, key, count) {
	return command(client, "ZRANDMEMBER", [key, count], typeof count !== "undefined" ? returnEcho : removeNull);
}
function pop$1(client, key, score, count) {
	return command(client, score === "max" ? "ZPOPMAX" : "ZPOPMIN", [key, count], typeof count !== "undefined" ? returnSortedSet : returnOptionalEntry);
}
/**
* Get the number of values in a sorted set.
*
* @command ZCARD
* @complexity O(1)
* @speed fast
* @since 1.2.0
*/
const length$1 = (client, key) => {
	return command(client, "ZCARD", [key], returnInt);
};
/**
* Delete a sorted set key.
*
* @command DEL
* @complexity O(N) where N is the number of keys that will be removed
* @speed slow
* @since 1.0.0
*/
const clear$1 = del$5;
function all$1(client, key, options = {}) {
	if (options.withScores) return rangeByScore(client, key, 0, Infinity, { withScores: true });
	return rangeByScore(client, key, 0, Infinity);
}
const formatInf = (num) => {
	if (num === Infinity) return "+inf";
	if (num === -Infinity) return "-inf";
	return num.toString();
};
const buildRangeArgs = (key, start, end, options) => {
	const args = [key, ...options.by === "rank" ? [start.toString(), end.toString()] : options.by === "score" ? options.reverse ? [formatInf(end), formatInf(start)] : [formatInf(start), formatInf(end)] : options.reverse ? [end.toString(), start.toString()] : [start.toString(), end.toString()]];
	if (options.by === "score") args.push("BYSCORE");
	else if (options.by === "lex") args.push("BYLEX");
	if (options.reverse) args.push("REV");
	if (options.by !== "rank") args.push("LIMIT", options.offset ?? 0, options.limit ?? 10);
	if (options.withScores) args.push("WITHSCORES");
	return args;
};
function rangeByRank(client, key, start, end, options = {}) {
	return command(client, "ZRANGE", buildRangeArgs(key, start, end, {
		...options,
		by: "rank"
	}), options.withScores ? returnSortedSet : returnEcho);
}
function rangeByScore(client, key, start, end, options = {}) {
	return command(client, "ZRANGE", buildRangeArgs(key, start, end, {
		...options,
		by: "score"
	}), options.withScores ? returnSortedSet : returnEcho);
}
/**
* Read members whose values fall between two lexicographical bounds.
*
* @command ZRANGE
* @complexity O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements returned
* @speed slow
* @since 1.2.0
*/
const rangeByLex = (client, key, start, end, options = {}) => {
	return command(client, "ZRANGE", buildRangeArgs(key, start, end, {
		...options,
		by: "lex"
	}), returnEcho);
};
const formatScanResult = (result) => {
	const { cursor, items } = returnScanResult(result);
	return {
		cursor,
		items: returnSortedSet(items)
	};
};
/**
* Iterate through sorted set values and scores.
*
* @command ZSCAN
* @complexity O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return to 0
* @speed slow
* @since 2.8.0
*/
const scan$1 = (client, key, options = {}) => {
	return {
		...command(client, "ZSCAN", [key, ...buildScanArgs(options)], formatScanResult),
		...iterable(options.cursor, async (cursor) => {
			const result = await client.send("ZSCAN", [key, ...buildScanArgs({
				...options,
				cursor
			})]);
			return formatScanResult(result);
		})
	};
};
//#endregion
//#region src/command/array.ts
var array_exports = /* @__PURE__ */ __exportAll({
	all: () => all,
	append: () => append,
	at: () => at,
	clear: () => clear,
	delete: () => del,
	has: () => has,
	indexOf: () => indexOf,
	insertAfter: () => insertAfter,
	insertBefore: () => insertBefore,
	length: () => length,
	pop: () => pop,
	prepend: () => prepend,
	range: () => range,
	replace: () => replace,
	scan: () => scan,
	shift: () => shift,
	trim: () => trim
});
/**
* Get the value at a list index.
*
* @command LINDEX
* @complexity O(N) where N is the distance from the closest end of the list
* @speed slow
* @since 1.0.0
*/
const at = (client, key, index) => {
	return command(client, "LINDEX", [key, index], removeNull);
};
/**
* Check whether a list contains a value.
*
* @command LPOS
* @complexity O(N) where N is the number of elements in the list
* @speed slow
* @since 6.0.6
*/
const has = (client, key, value) => {
	return command(client, "LPOS", [key, value], (r) => r !== null);
};
/**
* Find the index of a value in a list.
*
* @command LPOS
* @complexity O(N) where N is the number of elements in the list
* @speed slow
* @since 6.0.6
*/
const indexOf = (client, key, value) => {
	return command(client, "LPOS", [key, value], (r) => r === null ? void 0 : parseInt(r, 10));
};
/**
* Replace the value at a list index.
*
* @command LSET
* @complexity O(N) where N is the length of the list
* @speed slow
* @since 1.0.0
*/
const replace = (client, key, index, value) => {
	return command(client, "LSET", [
		key,
		index,
		value
	], returnVoid);
};
const insert = (client, key, position, pivot, value) => {
	return command(client, "LINSERT", [
		key,
		position,
		pivot,
		value
	], returnInt);
};
/**
* Insert a value before a pivot value in a list.
*
* @command LINSERT
* @complexity O(N) where N is the number of elements to traverse before seeing the pivot value
* @speed slow
* @since 2.2.0
*/
const insertBefore = (client, key, pivot, value) => {
	return insert(client, key, "BEFORE", pivot, value);
};
/**
* Insert a value after a pivot value in a list.
*
* @command LINSERT
* @complexity O(N) where N is the number of elements to traverse before seeing the pivot value
* @speed slow
* @since 2.2.0
*/
const insertAfter = (client, key, pivot, value) => {
	return insert(client, key, "AFTER", pivot, value);
};
/**
* Append one or more values to the end of a list.
*
* @command RPUSH
* @complexity O(1) for each element added
* @speed fast
* @since 1.0.0
*/
const append = (client, key, ...elements) => {
	return command(client, "RPUSH", [key, ...elements], returnInt);
};
/**
* Prepend one or more values to the start of a list.
*
* @command LPUSH
* @complexity O(1) for each element added
* @speed fast
* @since 1.0.0
*/
const prepend = (client, key, ...elements) => {
	const revElements = elements.toReversed();
	return command(client, "LPUSH", [key, ...revElements], returnInt);
};
/**
* Remove and return the last item from a list.
*
* @command RPOP
* @complexity O(1)
* @speed fast
* @since 1.0.0
*/
const pop = (client, key) => {
	return command(client, "RPOP", [key], removeNull);
};
/**
* Remove and return the first item from a list.
*
* @command LPOP
* @complexity O(1)
* @speed fast
* @since 1.0.0
*/
const shift = (client, key) => {
	return command(client, "LPOP", [key], removeNull);
};
/**
* Remove matching values from a list.
*
* @command LREM
* @complexity O(N+M) where N is the length of the list and M is the number of removed elements
* @speed slow
* @since 1.0.0
*/
const del = (client, key, value, options = {}) => {
	return command(client, "LREM", [
		key,
		options.count ?? 0,
		value
	], returnInt);
};
/**
* Trim a list to the specified start and end range.
*
* @command LTRIM
* @complexity O(N) where N is the number of elements to be removed
* @speed slow
* @since 1.0.0
*/
const trim = (client, key, start, end) => {
	return command(client, "LTRIM", [
		key,
		start,
		end
	], returnBoolean);
};
/**
* Get the number of items in a list.
*
* @command LLEN
* @complexity O(1)
* @speed fast
* @since 1.0.0
*/
const length = (client, key) => {
	return command(client, "LLEN", [key], returnInt);
};
/**
* Delete a list key.
*
* @command DEL
* @complexity O(N) where N is the number of keys that will be removed
* @speed slow
* @since 1.0.0
*/
const clear = del$5;
/**
* Get a range of values from a list.
*
* @command LRANGE
* @complexity O(S+N) where S is the distance of start offset and N is the number of elements in the specified range
* @speed slow
* @since 1.0.0
*/
const range = (client, key, start, end) => {
	return command(client, "LRANGE", [
		key,
		start,
		end
	], returnEcho);
};
/**
* Get all values from a list.
*
* @command LRANGE
* @complexity O(N) where N is the number of elements in the list
* @speed slow
* @since 2.1.0
*/
const all = (client, key) => {
	return range(client, key, 0, -1);
};
/**
* Iterate through a list in fixed-size ranges.
*
* @command LRANGE
* @complexity O(S+N) where S is the distance of start offset and N is the number of elements in the specified range
* @speed slow
* @since 1.0.0
*/
const scan = (client, key, options = {}) => {
	const cursor = options.cursor ?? 0;
	const limit = options.limit ?? 10;
	const formatScanResult = (cursor, items) => {
		if (items.length < limit) return {
			cursor: void 0,
			items
		};
		return {
			cursor: cursor + limit,
			items
		};
	};
	return {
		...command(client, "LRANGE", [
			key,
			cursor,
			cursor + limit - 1
		], (v) => formatScanResult(cursor, v)),
		...iterable(cursor, async (cursor) => {
			const c = cursor ?? 0;
			const result = await client.send("LRANGE", [
				key,
				c,
				c + limit - 1
			]);
			return formatScanResult(c, result);
		})
	};
};
//#endregion
//#region src/command/pubsub.ts
var pubsub_exports = /* @__PURE__ */ __exportAll({ publish: () => publish });
/**
* Publish a message to a channel.
*
* Returns the number of subscribers that received the message. In cluster
* mode only subscribers connected to the serving node are counted, so a
* zero reply doesn't mean the message went unseen.
*
* Sharded publishing (SPUBLISH) routes the message by channel slot instead
* of broadcasting to every cluster node, and is only received by sharded
* subscribers (SSUBSCRIBE).
*
* @command PUBLISH | SPUBLISH
* @complexity O(N+M) where N is the number of channel subscribers and M the number of subscribed patterns
* @speed fast
* @since 2.0.0
*/
const publish = (client, channel, message, options = {}) => {
	return command(client, options.sharded ? "SPUBLISH" : "PUBLISH", [channel, message], returnInt);
};
//#endregion
//#region src/command/script.ts
var script_exports = /* @__PURE__ */ __exportAll({
	define: () => define,
	eval: () => evaluate,
	evalSha: () => evalSha,
	exists: () => exists,
	flush: () => flush$1,
	load: () => load,
	lua: () => lua
});
/**
* Execute a Lua script directly.
*
* @command EVAL
* @complexity Depends on the executed script
* @speed slow
* @since 2.6.0
*/
const evaluate = (client, script, keys, args) => {
	return command(client, "EVAL", [
		script,
		keys.length,
		...keys,
		...args
	], returnEcho);
};
/**
* Execute a Lua script by SHA hash.
*
* @command EVALSHA
* @complexity Depends on the executed script
* @speed slow
* @since 2.6.0
*/
const evalSha = (client, hash, keys, args) => {
	return command(client, "EVALSHA", [
		hash,
		keys.length,
		...keys,
		...args
	], returnEcho);
};
/**
* Load a Lua script into the script cache.
*
* @command SCRIPT LOAD
* @complexity O(N) where N is the length in bytes of the script body
* @speed slow
* @since 2.6.0
*/
const load = (client, script) => {
	return command(client, "SCRIPT", ["LOAD", script], returnEcho);
};
/**
* Check whether one or more scripts exist in the script cache.
*
* @command SCRIPT EXISTS
* @complexity O(N) where N is the number of SHA1 digests to check
* @speed slow
* @since 2.6.0
*/
const exists = (client, ...hashes) => {
	return command(client, "SCRIPT", ["EXISTS", ...hashes], (r) => r.map(returnNumberBoolean));
};
/**
* Flush the script cache.
*
* @command SCRIPT FLUSH
* @complexity O(N) where N is the number of cached scripts
* @speed slow
* @since 2.6.0
*/
const flush$1 = (client, mode = "sync") => {
	return command(client, "SCRIPT", ["FLUSH", mode.toUpperCase()], returnVoid);
};
const createScriptRunner = (script, keyNum = 0, readonly = false) => {
	let hash;
	const sha = () => {
		if (!hash) hash = createHash("sha1").update(script).digest("hex");
		return hash;
	};
	return (client, ...args) => {
		let promise;
		const run = async () => {
			let result;
			try {
				result = await command(client, "EVALSHA", [
					sha(),
					keyNum,
					...args
				], returnEcho, { readonly });
			} catch (error) {
				if (error instanceof Error && error.message.includes("NOSCRIPT")) result = await command(client, "EVAL", [
					script,
					keyNum,
					...args
				], returnEcho, { readonly });
				else throw error;
			}
			return result;
		};
		return {
			name: "EVALSHA",
			args: [
				sha(),
				keyNum,
				...args
			],
			options: { readonly },
			resolve: returnEcho,
			preloadScript: script,
			then(onfulfilled, onrejected) {
				if (!promise) promise = run();
				return promise.then(onfulfilled).catch(onrejected);
			}
		};
	};
};
/**
* Define a reusable typed Lua script runner.
*
* @command EVALSHA | EVAL
* @complexity Depends on the executed script
* @speed slow
* @since 2.6.0
*/
const define = ({ script, keys = 0, readonly = false }) => {
	const run = createScriptRunner(script, keys, readonly);
	return (client, ...args) => {
		return run(client, ...args);
	};
};
/**
* Define a reusable Lua script with template literal arguments.
*
* @command EVALSHA | EVAL
* @complexity Depends on the executed script
* @speed slow
* @since 2.6.0
*/
const lua = (strings, ...args) => {
	const script = String.raw({ raw: strings }, ...args.map((_, i) => `ARGV[${i + 1}]`));
	const run = createScriptRunner(script);
	return (client) => {
		return run(client, ...args);
	};
};
//#endregion
//#region src/command/db.ts
var db_exports = /* @__PURE__ */ __exportAll({
	flush: () => flush,
	size: () => size
});
/**
* Remove all keys from the current database.
*
* @command FLUSHDB
* @complexity O(N) where N is the number of keys in the selected database
* @speed slow
* @dangerous
* @since 1.0.0
*/
const flush = (client, mode = "async") => {
	return command(client, "FLUSHDB", [mode.toUpperCase()], returnVoid);
};
/**
* Get the number of keys in the current database.
*
* @command DBSIZE
* @complexity O(1)
* @speed fast
* @since 1.0.0
*/
const size = (client) => {
	return command(client, "DBSIZE", [], returnInt);
};
//#endregion
//#region src/command/server.ts
var server_exports = /* @__PURE__ */ __exportAll({
	flushAll: () => flushAll,
	swap: () => swap,
	time: () => time
});
/**
* Remove all keys from all databases.
*
* @command FLUSHALL
* @complexity O(N) where N is the total number of keys in all databases
* @speed slow
* @dangerous
* @since 1.0.0
*/
const flushAll = (client, mode = "async") => {
	return command(client, "FLUSHALL", [mode.toUpperCase()], returnVoid);
};
/**
* Get the Redis server time as a Date.
*
* @command TIME
* @complexity O(1)
* @speed fast
* @since 2.6.0
*/
const time = (client) => {
	return command(client, "TIME", [], ([sec, micro]) => {
		return new Date(parseInt(sec, 10) * 1e3 + Math.floor(parseInt(micro, 10) / 1e3));
	});
};
/**
* Swap the contents of two databases.
*
* @command SWAPDB
* @complexity O(N) where N is the count of clients watching or blocking on keys from both databases
* @speed fast
* @dangerous
* @since 4.0.0
*/
const swap = (client, db1, db2) => {
	return command(client, "SWAPDB", [db1, db2], returnVoid);
};
//#endregion
//#region src/command/batch.ts
const runBatch = async (client, commands) => {
	const response = await client.batch(commands);
	if (response === null) throw new Error("Invalid batch response");
	return response.map(([error, data]) => {
		if (error) throw error;
		return data;
	});
};
/**
* Execute multiple commands with a Redis pipeline.
*
* @complexity Depends on the commands in the batch
* @speed depends on commands
* @since n/a
*/
const batch = async (client, commands) => {
	const preloadScriptCommands = Array.from(new Set(commands.map((c) => c.preloadScript).filter((v) => typeof v === "string"))).map((script) => ({
		name: "SCRIPT",
		args: ["LOAD", script]
	}));
	return (await runBatch(client, [...preloadScriptCommands, ...commands])).slice(preloadScriptCommands.length).map((data, i) => {
		const command = commands[i];
		if (!command) throw new Error(`Invalid batch index [${i}] response`);
		return command.resolve(data);
	});
};
//#endregion
//#region src/command/index.ts
var command_exports = /* @__PURE__ */ __exportAll({
	array: () => array_exports,
	batch: () => batch,
	db: () => db_exports,
	key: () => key_exports,
	map: () => map_exports,
	pubsub: () => pubsub_exports,
	script: () => script_exports,
	server: () => server_exports,
	set: () => set_exports,
	sortedSet: () => sorted_set_exports,
	string: () => string_exports,
	ttl: () => ttl_exports
});
//#endregion
//#region src/client/lazy.ts
const createLazyClient = (cb) => {
	let client;
	const redis = () => {
		if (!client) client = cb();
		return client;
	};
	return {
		send(name, args, options) {
			return redis().send(name, args, options);
		},
		batch(commands) {
			return redis().batch(commands);
		},
		transact(commands) {
			return redis().transact(commands);
		},
		async destroy() {
			await client?.destroy();
		}
	};
};
//#endregion
//#region src/client/index.ts
const createRedisClient = (options) => {
	return createLazyClient(() => createIoRedisClient(options));
};
//#endregion
export { RedisServer, createIoRedisClient, createLazyClient, createRedisClient, mockRedis, overrideOptions, command_exports as redis };
