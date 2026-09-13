import { createHash } from "node:crypto";
import { lauxlib, lua, lualib, to_luastring } from "fengari";
import { Socket, createServer } from "node:net";
//#region src/engine/errors.ts
var RedisError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "RedisError";
	}
};
const wrongType = () => new RedisError("WRONGTYPE Operation against a key holding the wrong kind of value");
const syntaxError = () => new RedisError("ERR syntax error");
const notInteger = () => new RedisError("ERR value is not an integer or out of range");
const notFloat = () => new RedisError("ERR value is not a valid float");
const arityError = (name) => new RedisError(`ERR wrong number of arguments for '${name.toLowerCase()}' command`);
const unsupported = (what) => new RedisError(`ERR the local redis server does not support ${what}`);
const unknownSubcommand = (sub, container) => new RedisError(`ERR unknown subcommand '${sub}'. Try ${container.toUpperCase()} HELP.`);
//#endregion
//#region src/engine/number.ts
const INT_RE = /^(?:0|-?[1-9]\d*)$/;
const FLOAT_RE = /^[+-]?(?:\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)$/;
const INF_RE = /^[+-]?inf(?:inity)?$/i;
const parseInt64 = (value) => {
	if (!INT_RE.test(value)) throw notInteger();
	const n = BigInt(value);
	if (n > 9223372036854775807n || n < -9223372036854775808n) throw notInteger();
	return n;
};
const parseInteger = (value, error = notInteger) => {
	if (!INT_RE.test(value)) throw error();
	const n = Number(value);
	if (!Number.isSafeInteger(n)) throw error();
	return n;
};
const parseFloatArg = (value, error = notFloat) => {
	if (INF_RE.test(value)) return value.startsWith("-") ? -Infinity : Infinity;
	if (!FLOAT_RE.test(value)) throw error();
	const n = Number(value);
	if (Number.isNaN(n)) throw error();
	return n;
};
const formatDouble = (value) => {
	if (value === Infinity) return "inf";
	if (value === -Infinity) return "-inf";
	if (Number.isNaN(value)) return "nan";
	return String(value);
};
const formatG = (value, precision) => {
	if (!Number.isFinite(value)) return formatDouble(value);
	let text = value.toPrecision(precision);
	let exponent = "";
	const e = text.indexOf("e");
	if (e !== -1) {
		exponent = text.slice(e);
		text = text.slice(0, e);
	}
	if (text.includes(".")) text = text.replace(/0+$/, "").replace(/\.$/, "");
	return text + exponent;
};
const formatLongDouble = (value) => formatG(value, 16);
//#endregion
//#region src/engine/reply.ts
const status = (value) => ({
	type: "status",
	value
});
const error = (value) => ({
	type: "error",
	value
});
const int = (value) => ({
	type: "int",
	value
});
const bulk = (value) => ({
	type: "bulk",
	value: value ?? null
});
const array = (value) => ({
	type: "array",
	value
});
const bulks = (values) => array(values.map((v) => bulk(v)));
const ints = (values) => array(values.map((v) => int(v)));
const bool = (value) => int(value ? 1 : 0);
const OK = status("OK");
const NIL = bulk(null);
const NIL_ARRAY = array(null);
const NONE = { type: "none" };
const double = (value) => ({
	type: "double",
	value
});
const map = (value) => ({
	type: "map",
	value
});
const set$1 = (value) => ({
	type: "set",
	value
});
const pairs = (value) => ({
	type: "pairs",
	value
});
const push$1 = (value) => ({
	type: "push",
	value
});
const verbatim = (value) => ({
	type: "verbatim",
	value
});
const toResp2 = (reply) => {
	switch (reply.type) {
		case "double": return bulk(formatDouble(reply.value));
		case "map":
		case "pairs": return array(reply.value.flatMap(([k, v]) => [toResp2(k), toResp2(v)]));
		case "set":
		case "push": return array(reply.value.map(toResp2));
		case "verbatim": return bulk(reply.value);
		case "array": return reply.value === null ? reply : array(reply.value.map(toResp2));
		default: return reply;
	}
};
//#endregion
//#region src/engine/glob.ts
const globMatch = (pattern, str) => {
	let p = 0;
	let s = 0;
	while (p < pattern.length) {
		const c = pattern[p];
		if (c === "*") {
			while (pattern[p + 1] === "*") p++;
			if (p + 1 === pattern.length) return true;
			while (s <= str.length) {
				if (globMatch(pattern.slice(p + 1), str.slice(s))) return true;
				s++;
			}
			return false;
		}
		if (s >= str.length) return false;
		if (c === "?") {
			s++;
			p++;
			continue;
		}
		if (c === "[") {
			p++;
			const not = pattern[p] === "^";
			if (not) p++;
			let matched = false;
			while (p < pattern.length && pattern[p] !== "]") {
				const ch = pattern[p];
				if (ch === "\\" && p + 1 < pattern.length) {
					p++;
					if (pattern[p] === str[s]) matched = true;
				} else if (pattern[p + 1] === "-" && p + 2 < pattern.length) {
					let start = pattern.charCodeAt(p);
					let end = pattern.charCodeAt(p + 2);
					const code = str.charCodeAt(s);
					if (start > end) {
						const tmp = start;
						start = end;
						end = tmp;
					}
					p += 2;
					if (code >= start && code <= end) matched = true;
				} else if (ch === str[s]) matched = true;
				p++;
			}
			if (not) matched = !matched;
			if (!matched) return false;
			s++;
			p++;
			continue;
		}
		if (c === "\\" && p + 1 < pattern.length) p++;
		if (pattern[p] !== str[s]) return false;
		s++;
		p++;
	}
	return s === str.length;
};
//#endregion
//#region src/engine/commands/server.ts
const REDIS_VERSION$1 = "7.2.4";
const platform = () => {
	const p = globalThis.process;
	return {
		os: `${p?.platform ?? "unknown"} ${p?.arch ?? ""}`.trim(),
		runtime: p?.version ?? ""
	};
};
const sections = (ctx) => {
	const { os, runtime } = platform();
	const uptime = Math.floor((ctx.now - ctx.engine.startedAt) / 1e3);
	return [
		{
			name: "server",
			lines: () => [
				`redis_version:${REDIS_VERSION$1}`,
				"redis_git_sha1:00000000",
				"redis_git_dirty:0",
				"redis_build_id:awsless-redis-server",
				"redis_mode:standalone",
				`os:${os}`,
				"arch_bits:64",
				`multiplexing_api:node ${runtime}`,
				`process_id:${globalThis.process?.pid ?? 0}`,
				`run_id:${ctx.engine.runId}`,
				`tcp_port:${ctx.engine.port}`,
				`server_time_usec:${ctx.now * 1e3}`,
				`uptime_in_seconds:${uptime}`,
				`uptime_in_days:${Math.floor(uptime / 86400)}`,
				"hz:10",
				"configured_hz:10",
				"executable:@awsless/redis-server",
				"config_file:"
			]
		},
		{
			name: "clients",
			lines: () => [
				`connected_clients:${ctx.engine.clients.size}`,
				"cluster_connections:0",
				"maxclients:10000",
				"client_recent_max_input_buffer:0",
				"client_recent_max_output_buffer:0",
				"blocked_clients:0",
				"tracking_clients:0",
				`pubsub_clients:${[...ctx.engine.clients].filter((c) => ctx.engine.isSubscribed(c)).length}`,
				"clients_in_timeout_table:0"
			]
		},
		{
			name: "memory",
			lines: () => {
				const used = globalThis.process?.memoryUsage?.().heapUsed ?? 0;
				return [
					`used_memory:${used}`,
					`used_memory_human:${(used / 1024 / 1024).toFixed(2)}M`,
					`used_memory_rss:${used}`,
					`used_memory_peak:${used}`,
					`used_memory_peak_human:${(used / 1024 / 1024).toFixed(2)}M`,
					"maxmemory:0",
					"maxmemory_human:0B",
					"maxmemory_policy:noeviction",
					"mem_fragmentation_ratio:1.00",
					"mem_allocator:js"
				];
			}
		},
		{
			name: "persistence",
			lines: () => [
				"loading:0",
				"rdb_changes_since_last_save:0",
				"rdb_bgsave_in_progress:0",
				`rdb_last_save_time:${Math.floor(ctx.now / 1e3)}`,
				"aof_enabled:0"
			]
		},
		{
			name: "stats",
			lines: () => [
				`total_connections_received:${ctx.engine.stats.connections}`,
				`total_commands_processed:${ctx.engine.stats.commands}`,
				"instantaneous_ops_per_sec:0",
				"rejected_connections:0",
				"evicted_keys:0",
				`pubsub_channels:${ctx.engine.channels.size}`,
				`pubsub_patterns:${ctx.engine.patterns.size}`,
				`pubsubshard_channels:${ctx.engine.shards.size}`
			]
		},
		{
			name: "replication",
			lines: () => [
				"role:master",
				"connected_slaves:0",
				"master_failover_state:no-failover",
				`master_replid:${ctx.engine.runId}`,
				"master_repl_offset:0"
			]
		},
		{
			name: "cpu",
			lines: () => ["used_cpu_sys:0.000000", "used_cpu_user:0.000000"]
		},
		{
			name: "cluster",
			lines: () => ["cluster_enabled:0"]
		},
		{
			name: "keyspace",
			lines: () => ctx.engine.keyspace().map((db) => `db${db.index}:keys=${db.keys},expires=${db.expires},avg_ttl=0`)
		}
	];
};
const info = (ctx, args) => {
	const requested = new Set(args.map((a) => a.toLowerCase()));
	const everything = requested.has("all") || requested.has("everything");
	const all = requested.size === 0 || requested.has("default") || everything;
	const out = [];
	for (const section of sections(ctx)) if (all || requested.has(section.name)) out.push(`# ${section.name[0].toUpperCase()}${section.name.slice(1)}`, ...section.lines(), "");
	return verbatim(out.join("\r\n"));
};
const config = (ctx, args) => {
	const sub = args[0].toUpperCase();
	if (sub === "GET") {
		if (args.length < 2) throw new RedisError("ERR wrong number of arguments for 'config|get' command");
		const known = {
			databases: String(ctx.engine.databases.length),
			maxmemory: "0",
			"maxmemory-policy": "noeviction",
			port: String(ctx.engine.port),
			bind: "127.0.0.1",
			timeout: "0",
			"notify-keyspace-events": "",
			appendonly: "no",
			save: ""
		};
		const out = [];
		for (const [name, value] of Object.entries(known)) if (args.slice(1).some((pattern) => globMatch(pattern.toLowerCase(), name))) out.push([bulk(name), bulk(value)]);
		return map(out);
	}
	if (sub === "SET" || sub === "RESETSTAT" || sub === "REWRITE") throw unsupported(`CONFIG ${sub}`);
	throw unknownSubcommand(args[0], "config");
};
const parseFlushMode = (args) => {
	if (args.length > 1) throw syntaxError();
	const mode = args[0]?.toUpperCase();
	if (mode !== void 0 && mode !== "ASYNC" && mode !== "SYNC") throw syntaxError();
};
const commands$10 = [
	{
		name: "INFO",
		arity: -1,
		handler: info
	},
	{
		name: "COMMAND",
		arity: -1,
		handler: (ctx, args) => {
			const sub = args[0]?.toUpperCase();
			if (sub === void 0 || sub === "DOCS" || sub === "INFO") return array([]);
			if (sub === "COUNT") return int(ctx.engine.commandNames().length);
			if (sub === "LIST") return bulks(ctx.engine.commandNames().map((n) => n.toLowerCase()));
			if (sub === "GETKEYS" || sub === "GETKEYSANDFLAGS" || sub === "HELP") throw unsupported(`COMMAND ${sub}`);
			throw unknownSubcommand(args[0], "command");
		}
	},
	{
		name: "CONFIG",
		arity: -2,
		noscript: true,
		handler: config
	},
	{
		name: "DBSIZE",
		arity: 1,
		handler: (ctx) => int(ctx.db.keys().filter((key) => ctx.db.get(key, ctx.now)).length)
	},
	{
		name: "TIME",
		arity: 1,
		handler: (ctx) => bulks([String(Math.floor(ctx.now / 1e3)), String(ctx.now % 1e3 * 1e3)])
	},
	{
		name: "FLUSHDB",
		arity: -1,
		write: true,
		handler: (ctx, args) => {
			parseFlushMode(args);
			ctx.db.flush();
			return OK;
		}
	},
	{
		name: "FLUSHALL",
		arity: -1,
		write: true,
		handler: (ctx, args) => {
			parseFlushMode(args);
			ctx.engine.flushAll();
			return OK;
		}
	},
	{
		name: "SWAPDB",
		arity: 3,
		write: true,
		noscript: true,
		handler: (ctx, args) => {
			const a = ctx.engine.databases[parseInteger(args[0], () => new RedisError("ERR invalid first DB index"))];
			const b = ctx.engine.databases[parseInteger(args[1], () => new RedisError("ERR invalid second DB index"))];
			if (!a) throw new RedisError("ERR DB index is out of range");
			if (!b) throw new RedisError("ERR DB index is out of range");
			if (a !== b) a.swapWith(b);
			return OK;
		}
	},
	{
		name: "LASTSAVE",
		arity: 1,
		handler: (ctx) => int(Math.floor(ctx.now / 1e3))
	},
	{
		name: "SAVE",
		arity: 1,
		noscript: true,
		handler: () => OK
	},
	{
		name: "BGSAVE",
		arity: -1,
		noscript: true,
		handler: () => status("Background saving started")
	},
	{
		name: "ROLE",
		arity: 1,
		handler: () => array([
			bulk("master"),
			int(0),
			array([])
		])
	},
	{
		name: "BGREWRITEAOF",
		arity: 1,
		noscript: true,
		handler: () => {
			throw unsupported("BGREWRITEAOF");
		}
	},
	{
		name: "DEBUG",
		arity: -2,
		noscript: true,
		handler: () => {
			throw unsupported("DEBUG");
		}
	},
	{
		name: "MONITOR",
		arity: 1,
		noscript: true,
		handler: () => {
			throw unsupported("MONITOR");
		}
	},
	{
		name: "SHUTDOWN",
		arity: -1,
		noscript: true,
		handler: () => {
			throw unsupported("SHUTDOWN");
		}
	},
	{
		name: "SLOWLOG",
		arity: -2,
		noscript: true,
		handler: () => {
			throw unsupported("SLOWLOG");
		}
	},
	{
		name: "MEMORY",
		arity: -2,
		handler: () => {
			throw unsupported("MEMORY");
		}
	},
	{
		name: "LATENCY",
		arity: -2,
		handler: () => {
			throw unsupported("LATENCY");
		}
	},
	{
		name: "ACL",
		arity: -2,
		noscript: true,
		handler: () => {
			throw unsupported("ACL");
		}
	},
	{
		name: "CLUSTER",
		arity: -2,
		handler: () => {
			throw new RedisError("ERR This instance has cluster support disabled");
		}
	},
	{
		name: "FUNCTION",
		arity: -2,
		noscript: true,
		handler: () => {
			throw unsupported("FUNCTION");
		}
	},
	{
		name: "FCALL",
		arity: -3,
		noscript: true,
		handler: () => {
			throw unsupported("FCALL");
		}
	},
	{
		name: "FCALL_RO",
		arity: -3,
		noscript: true,
		handler: () => {
			throw unsupported("FCALL_RO");
		}
	}
];
//#endregion
//#region src/engine/commands/util.ts
const lookup = (ctx, key, type) => {
	const entry = ctx.db.get(key, ctx.now);
	if (!entry) return;
	if (entry.type !== type) throw wrongType();
	return entry;
};
const lookupOrCreate = (ctx, key, type, create) => {
	const existing = lookup(ctx, key, type);
	if (existing) return existing;
	const entry = create();
	ctx.db.set(key, entry);
	return entry;
};
const expectArg = (args, index) => {
	const value = args[index];
	if (value === void 0) throw syntaxError();
	return value;
};
const normalizeRange = (start, end, length) => {
	if (start < 0) start = length + start;
	if (end < 0) end = length + end;
	if (start < 0) start = 0;
	if (end >= length) end = length - 1;
	return [start, end];
};
const scanSlice = (items, cursor, count) => {
	const offset = parseInteger(cursor, () => new RedisError("ERR invalid cursor"));
	const slice = items.slice(offset, offset + count);
	const end = offset + count;
	return {
		next: end >= items.length ? "0" : String(end),
		items: slice
	};
};
const parseScanOptions = (args, allowType = false) => {
	let match;
	let count = 10;
	let type;
	for (let i = 0; i < args.length; i += 2) {
		const option = expectArg(args, i).toUpperCase();
		const value = expectArg(args, i + 1);
		if (option === "MATCH") match = value;
		else if (option === "COUNT") {
			count = parseInteger(value);
			if (count < 1) throw syntaxError();
		} else if (option === "TYPE" && allowType) type = value.toLowerCase();
		else throw syntaxError();
	}
	return {
		match,
		count,
		type
	};
};
const randomIndex = (length) => Math.floor(Math.random() * length);
const shuffle = (items) => {
	for (let i = items.length - 1; i > 0; i--) {
		const j = randomIndex(i + 1);
		const tmp = items[i];
		items[i] = items[j];
		items[j] = tmp;
	}
	return items;
};
//#endregion
//#region src/engine/commands/connection.ts
const describeClient = (ctx, conn) => {
	const age = Math.floor((ctx.now - conn.createdAt) / 1e3);
	return [
		`id=${conn.id}`,
		"addr=127.0.0.1:0",
		`laddr=127.0.0.1:${ctx.engine.port}`,
		"fd=0",
		`name=${conn.name ?? ""}`,
		`age=${age}`,
		"idle=0",
		`flags=${ctx.engine.isSubscribed(conn) ? "P" : conn.multi ? "x" : "N"}`,
		`db=${conn.db}`,
		`sub=${conn.subscriptions.channels.size}`,
		`psub=${conn.subscriptions.patterns.size}`,
		`ssub=${conn.subscriptions.shards.size}`,
		`multi=${conn.multi ? conn.multi.queue.length : -1}`,
		"qbuf=0 qbuf-free=0 argv-mem=0 multi-mem=0 rbs=0 rbp=0 obl=0 oll=0 omem=0 tot-mem=0 events=r",
		`cmd=client|list user=default redir=-1 resp=${conn.protocol}`,
		`lib-name=${conn.lib.name ?? ""}`,
		`lib-ver=${conn.lib.version ?? ""}`
	].join(" ");
};
const validName = (name) => {
	for (let i = 0; i < name.length; i++) {
		const code = name.charCodeAt(i);
		if (code <= 32 || code === 127) return false;
	}
	return true;
};
const client = (ctx, args) => {
	const sub = args[0].toUpperCase();
	switch (sub) {
		case "ID": return int(ctx.conn.id);
		case "GETNAME": return bulk(ctx.conn.name);
		case "SETNAME": {
			const name = expectArg(args, 1);
			if (!validName(name)) throw new RedisError("ERR Client names cannot contain spaces, newlines or special characters.");
			ctx.conn.name = name === "" ? null : name;
			return OK;
		}
		case "SETINFO": {
			const attr = expectArg(args, 1).toUpperCase();
			const value = expectArg(args, 2);
			if (!validName(value)) throw new RedisError(`ERR ${attr.toLowerCase()} cannot contain spaces, newlines or special characters.`);
			if (attr === "LIB-NAME") ctx.conn.lib.name = value;
			else if (attr === "LIB-VER") ctx.conn.lib.version = value;
			else throw new RedisError(`ERR Unrecognized option '${args[1]}'`);
			return OK;
		}
		case "LIST": return bulk([...ctx.engine.clients].map((c) => describeClient(ctx, c)).join("\n") + "\n");
		case "INFO": return bulk(describeClient(ctx, ctx.conn) + "\n");
		case "KILL":
		case "PAUSE":
		case "UNPAUSE":
		case "REPLY":
		case "TRACKING":
		case "CACHING":
		case "NO-EVICT":
		case "NO-TOUCH":
		case "UNBLOCK":
		case "GETREDIR":
		case "HELP": throw unsupported(`CLIENT ${sub}`);
		default: throw unknownSubcommand(args[0], "client");
	}
};
const resetConnection = (ctx) => {
	ctx.engine.unsubscribeAll(ctx.conn);
	ctx.conn.watches = [];
	ctx.conn.multi = null;
	ctx.conn.db = 0;
	ctx.conn.name = null;
	ctx.conn.protocol = 2;
};
const hello = (ctx, args) => {
	if (args.length > 0) {
		const version = parseInteger(args[0], () => new RedisError("ERR Protocol version is not an integer or out of range"));
		if (version !== 2 && version !== 3) throw new RedisError("NOPROTO unsupported protocol version");
		for (let i = 1; i < args.length; i++) {
			const option = args[i].toUpperCase();
			if (option === "AUTH") {
				expectArg(args, i + 1);
				expectArg(args, i + 2);
				i += 2;
			} else if (option === "SETNAME") {
				const name = expectArg(args, ++i);
				if (!validName(name)) throw new RedisError("ERR Client names cannot contain spaces, newlines or special characters.");
				ctx.conn.name = name;
			} else throw syntaxError();
		}
		ctx.conn.protocol = version;
	}
	return map([
		[bulk("server"), bulk("redis")],
		[bulk("version"), bulk(REDIS_VERSION$1)],
		[bulk("proto"), int(ctx.conn.protocol)],
		[bulk("id"), int(ctx.conn.id)],
		[bulk("mode"), bulk("standalone")],
		[bulk("role"), bulk("master")],
		[bulk("modules"), array([])]
	]);
};
const commands$9 = [
	{
		name: "PING",
		arity: -1,
		handler: (ctx, args) => {
			if (args.length > 1) throw new RedisError("ERR wrong number of arguments for 'ping' command");
			if (ctx.conn.protocol === 2 && ctx.engine.isSubscribed(ctx.conn)) return array([bulk("pong"), bulk(args[0] ?? "")]);
			return args[0] === void 0 ? status("PONG") : bulk(args[0]);
		}
	},
	{
		name: "ECHO",
		arity: 2,
		handler: (_, args) => bulk(args[0])
	},
	{
		name: "HELLO",
		arity: -1,
		noscript: true,
		handler: hello
	},
	{
		name: "SELECT",
		arity: 2,
		handler: (ctx, args) => {
			const index = parseInteger(args[0], () => new RedisError("ERR value is not an integer or out of range"));
			if (index < 0 || index >= ctx.engine.databases.length) throw new RedisError("ERR DB index is out of range");
			ctx.conn.db = index;
			return OK;
		}
	},
	{
		name: "AUTH",
		arity: -2,
		noscript: true,
		handler: () => OK
	},
	{
		name: "CLIENT",
		arity: -2,
		noscript: true,
		handler: client
	},
	{
		name: "QUIT",
		arity: -1,
		noscript: true,
		handler: (ctx) => {
			ctx.conn.quit = true;
			return OK;
		}
	},
	{
		name: "RESET",
		arity: 1,
		noscript: true,
		handler: (ctx) => {
			resetConnection(ctx);
			return status("RESET");
		}
	},
	{
		name: "READONLY",
		arity: 1,
		handler: () => OK
	},
	{
		name: "READWRITE",
		arity: 1,
		handler: () => OK
	}
];
//#endregion
//#region src/engine/store.ts
const newHash = () => ({
	type: "hash",
	value: /* @__PURE__ */ new Map(),
	expires: /* @__PURE__ */ new Map()
});
var Database = class {
	index;
	entries = /* @__PURE__ */ new Map();
	expires = /* @__PURE__ */ new Map();
	versions = /* @__PURE__ */ new Map();
	generation = 0;
	constructor(index) {
		this.index = index;
	}
	get size() {
		return this.entries.size;
	}
	get expireCount() {
		return this.expires.size;
	}
	get(key, now) {
		const expiry = this.expires.get(key);
		if (expiry !== void 0 && expiry <= now) {
			this.delete(key);
			return;
		}
		const entry = this.entries.get(key);
		if (entry?.type === "hash" && entry.expires.size > 0) {
			for (const [field, at] of entry.expires) if (at <= now) {
				entry.expires.delete(field);
				entry.value.delete(field);
				this.touch(key);
			}
			if (entry.value.size === 0) {
				this.delete(key);
				return;
			}
		}
		return entry;
	}
	set(key, entry) {
		this.entries.set(key, entry);
		this.expires.delete(key);
		this.touch(key);
	}
	cleanup(key, entry) {
		this.touch(key);
		if (entry.type === "list" && entry.value.length === 0 || entry.type === "set" && entry.value.size === 0 || entry.type === "zset" && entry.value.size === 0 || entry.type === "hash" && entry.value.size === 0) this.delete(key);
	}
	delete(key) {
		const existed = this.entries.delete(key);
		this.expires.delete(key);
		if (existed) this.touch(key);
		return existed;
	}
	touch(key) {
		this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
	}
	version(key) {
		return this.versions.get(key) ?? 0;
	}
	expireAt(key) {
		return this.expires.get(key);
	}
	setExpire(key, at) {
		this.expires.set(key, at);
		this.touch(key);
	}
	persist(key) {
		const had = this.expires.delete(key);
		if (had) this.touch(key);
		return had;
	}
	keys() {
		return [...this.entries.keys()];
	}
	flush() {
		this.entries.clear();
		this.expires.clear();
		this.versions.clear();
		this.generation++;
	}
	swapWith(other) {
		const entries = this.entries;
		const expires = this.expires;
		this.entries = other.entries;
		this.expires = other.expires;
		other.entries = entries;
		other.expires = expires;
		this.versions.clear();
		other.versions.clear();
		this.generation++;
		other.generation++;
	}
	sweep(now, limit = 200) {
		let removed = 0;
		for (const [key, at] of this.expires) {
			if (at <= now) {
				this.delete(key);
				removed++;
			}
			if (removed >= limit) break;
		}
		for (const [key, entry] of this.entries) if (entry.type === "hash" && entry.expires.size > 0) this.get(key, now);
	}
};
//#endregion
//#region src/engine/commands/hash.ts
const getHash = (ctx, key) => lookup(ctx, key, "hash");
const getOrCreateHash = (ctx, key) => lookupOrCreate(ctx, key, "hash", newHash);
const setField = (hash, field, value) => {
	const isNew = !hash.value.has(field);
	hash.value.set(field, value);
	hash.expires.delete(field);
	return isNew;
};
const hincrBy = (ctx, key, field, delta) => {
	const hash = getOrCreateHash(ctx, key);
	const current = hash.value.get(field);
	const next = (current === void 0 ? 0n : parseInt64Field(current)) + delta;
	if (next > 9223372036854775807n || next < -9223372036854775808n) throw new RedisError("ERR increment or decrement would overflow");
	hash.value.set(field, next.toString());
	ctx.db.touch(key);
	return int(next);
};
const parseInt64Field = (value) => {
	try {
		return parseInt64(value);
	} catch {
		throw new RedisError("ERR hash value is not an integer");
	}
};
const parseFieldArgs = (args, from) => {
	let i = from;
	let condition = null;
	const option = args[i]?.toUpperCase();
	if (option === "NX" || option === "XX" || option === "GT" || option === "LT") {
		condition = option;
		i++;
	}
	if (args[i]?.toUpperCase() !== "FIELDS") throw new RedisError("ERR Mandatory argument FIELDS is missing or not at the right position");
	const count = parseInteger(expectArg(args, i + 1), () => new RedisError("ERR Parameter `numFields` should be greater than 0"));
	const fields = args.slice(i + 2);
	if (count <= 0) throw new RedisError("ERR Parameter `numFields` should be greater than 0");
	if (fields.length !== count) throw new RedisError("ERR The `numFields` parameter must match the number of arguments");
	return {
		fields,
		condition
	};
};
const hexpire = (ctx, args, unit, relative) => {
	const key = args[0];
	const n = parseInteger(args[1], () => new RedisError("ERR invalid expire time, must be >= 0"));
	if (n < 0) throw new RedisError("ERR invalid expire time, must be >= 0");
	const ms = unit === "seconds" ? n * 1e3 : n;
	const at = relative ? ctx.now + ms : ms;
	const { fields, condition } = parseFieldArgs(args, 2);
	const hash = getHash(ctx, key);
	if (!hash) return ints(fields.map(() => -2));
	const result = fields.map((field) => {
		if (!hash.value.has(field)) return -2;
		const current = hash.expires.get(field);
		if (condition === "NX" && current !== void 0) return 0;
		if (condition === "XX" && current === void 0) return 0;
		if (condition === "GT" && (current === void 0 || at <= current)) return 0;
		if (condition === "LT" && current !== void 0 && at >= current) return 0;
		if (at <= ctx.now) {
			hash.value.delete(field);
			hash.expires.delete(field);
			return 2;
		}
		hash.expires.set(field, at);
		return 1;
	});
	ctx.db.cleanup(key, hash);
	return ints(result);
};
const httl = (ctx, args, unit, absolute) => {
	const { fields } = parseFieldArgs(args, 1);
	const hash = getHash(ctx, args[0]);
	if (!hash) return ints(fields.map(() => -2));
	return ints(fields.map((field) => {
		if (!hash.value.has(field)) return -2;
		const at = hash.expires.get(field);
		if (at === void 0) return -1;
		const value = absolute ? at : at - ctx.now;
		return unit === "seconds" ? Math.floor(value / 1e3) : value;
	}));
};
const hrandfield = (ctx, args) => {
	const hash = getHash(ctx, args[0]);
	if (args.length === 1) {
		if (!hash) return NIL;
		const fields = [...hash.value.keys()];
		return bulk(fields[randomIndex(fields.length)]);
	}
	const count = parseInteger(args[1]);
	const withValues = args[2]?.toUpperCase() === "WITHVALUES";
	if (args.length > 3 || args.length === 3 && !withValues) throw syntaxError();
	if (!hash) return array([]);
	const fields = [...hash.value.keys()];
	let picked;
	if (count >= 0) picked = shuffle(fields).slice(0, count);
	else picked = Array.from({ length: -count }, () => fields[randomIndex(fields.length)]);
	if (!withValues) return bulks(picked);
	return pairs(picked.map((field) => [bulk(field), bulk(hash.value.get(field))]));
};
const commands$8 = [
	{
		name: "HSET",
		arity: -4,
		write: true,
		handler: (ctx, args) => {
			if ((args.length - 1) % 2 !== 0) throw new RedisError("ERR wrong number of arguments for 'hset' command");
			const hash = getOrCreateHash(ctx, args[0]);
			let added = 0;
			for (let i = 1; i < args.length; i += 2) if (setField(hash, args[i], args[i + 1])) added++;
			ctx.db.touch(args[0]);
			return int(added);
		}
	},
	{
		name: "HMSET",
		arity: -4,
		write: true,
		handler: (ctx, args) => {
			if ((args.length - 1) % 2 !== 0) throw new RedisError("ERR wrong number of arguments for 'hmset' command");
			const hash = getOrCreateHash(ctx, args[0]);
			for (let i = 1; i < args.length; i += 2) setField(hash, args[i], args[i + 1]);
			ctx.db.touch(args[0]);
			return OK;
		}
	},
	{
		name: "HSETNX",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const hash = getOrCreateHash(ctx, args[0]);
			if (hash.value.has(args[1])) return int(0);
			setField(hash, args[1], args[2]);
			ctx.db.touch(args[0]);
			return int(1);
		}
	},
	{
		name: "HGET",
		arity: 3,
		handler: (ctx, args) => bulk(getHash(ctx, args[0])?.value.get(args[1]) ?? null)
	},
	{
		name: "HMGET",
		arity: -3,
		handler: (ctx, args) => {
			const hash = getHash(ctx, args[0]);
			return array(args.slice(1).map((field) => bulk(hash?.value.get(field) ?? null)));
		}
	},
	{
		name: "HGETALL",
		arity: 2,
		handler: (ctx, args) => {
			const hash = getHash(ctx, args[0]);
			return map(hash ? [...hash.value].map(([k, v]) => [bulk(k), bulk(v)]) : []);
		}
	},
	{
		name: "HDEL",
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			const hash = getHash(ctx, args[0]);
			if (!hash) return int(0);
			let removed = 0;
			for (const field of args.slice(1)) if (hash.value.delete(field)) {
				hash.expires.delete(field);
				removed++;
			}
			ctx.db.cleanup(args[0], hash);
			return int(removed);
		}
	},
	{
		name: "HEXISTS",
		arity: 3,
		handler: (ctx, args) => bool(getHash(ctx, args[0])?.value.has(args[1]) ?? false)
	},
	{
		name: "HLEN",
		arity: 2,
		handler: (ctx, args) => int(getHash(ctx, args[0])?.value.size ?? 0)
	},
	{
		name: "HSTRLEN",
		arity: 3,
		handler: (ctx, args) => int(getHash(ctx, args[0])?.value.get(args[1])?.length ?? 0)
	},
	{
		name: "HKEYS",
		arity: 2,
		handler: (ctx, args) => bulks([...getHash(ctx, args[0])?.value.keys() ?? []])
	},
	{
		name: "HVALS",
		arity: 2,
		handler: (ctx, args) => bulks([...getHash(ctx, args[0])?.value.values() ?? []])
	},
	{
		name: "HINCRBY",
		arity: 4,
		write: true,
		handler: (ctx, args) => hincrBy(ctx, args[0], args[1], parseInt64(args[2]))
	},
	{
		name: "HINCRBYFLOAT",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const hash = getOrCreateHash(ctx, args[0]);
			const current = hash.value.get(args[1]);
			const next = (current === void 0 ? 0 : parseFloatArg(current, () => new RedisError("ERR hash value is not a float"))) + parseFloatArg(args[2]);
			if (!Number.isFinite(next)) throw new RedisError("ERR increment would produce NaN or Infinity");
			const text = formatLongDouble(next);
			hash.value.set(args[1], text);
			ctx.db.touch(args[0]);
			return bulk(text);
		}
	},
	{
		name: "HRANDFIELD",
		arity: -2,
		handler: hrandfield
	},
	{
		name: "HSCAN",
		arity: -3,
		handler: (ctx, args) => {
			const { match, count } = parseScanOptions(args.slice(2));
			const hash = getHash(ctx, args[0]);
			const entries = hash ? [...hash.value] : [];
			const { next, items } = entries.length <= 128 ? {
				next: "0",
				items: entries
			} : scanSlice(entries, args[1], count);
			const filtered = match === void 0 ? items : items.filter(([k]) => globMatch(match, k));
			return array([bulk(next), array(filtered.flatMap(([k, v]) => [bulk(k), bulk(v)]))]);
		}
	},
	{
		name: "HEXPIRE",
		arity: -6,
		write: true,
		handler: (ctx, args) => hexpire(ctx, args, "seconds", true)
	},
	{
		name: "HPEXPIRE",
		arity: -6,
		write: true,
		handler: (ctx, args) => hexpire(ctx, args, "ms", true)
	},
	{
		name: "HEXPIREAT",
		arity: -6,
		write: true,
		handler: (ctx, args) => hexpire(ctx, args, "seconds", false)
	},
	{
		name: "HPEXPIREAT",
		arity: -6,
		write: true,
		handler: (ctx, args) => hexpire(ctx, args, "ms", false)
	},
	{
		name: "HTTL",
		arity: -5,
		handler: (ctx, args) => httl(ctx, args, "seconds", false)
	},
	{
		name: "HPTTL",
		arity: -5,
		handler: (ctx, args) => httl(ctx, args, "ms", false)
	},
	{
		name: "HEXPIRETIME",
		arity: -5,
		handler: (ctx, args) => httl(ctx, args, "seconds", true)
	},
	{
		name: "HPEXPIRETIME",
		arity: -5,
		handler: (ctx, args) => httl(ctx, args, "ms", true)
	},
	{
		name: "HPERSIST",
		arity: -5,
		write: true,
		handler: (ctx, args) => {
			const { fields } = parseFieldArgs(args, 1);
			const hash = getHash(ctx, args[0]);
			if (!hash) return ints(fields.map(() => -2));
			const result = fields.map((field) => {
				if (!hash.value.has(field)) return -2;
				return hash.expires.delete(field) ? 1 : -1;
			});
			ctx.db.touch(args[0]);
			return ints(result);
		}
	}
];
//#endregion
//#region src/engine/zset.ts
const compareMembers = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const compareEntries = (a, b) => {
	if (a.score !== b.score) return a.score < b.score ? -1 : 1;
	return compareMembers(a.member, b.member);
};
var SortedSet = class {
	scores = /* @__PURE__ */ new Map();
	list = [];
	get size() {
		return this.list.length;
	}
	has(member) {
		return this.scores.has(member);
	}
	score(member) {
		return this.scores.get(member);
	}
	entries() {
		return this.list;
	}
	at(index) {
		return this.list[index];
	}
	add(member, score) {
		const existing = this.scores.get(member);
		if (existing !== void 0) {
			if (existing === score) return false;
			this.list.splice(this.indexOf(member, existing), 1);
		}
		this.scores.set(member, score);
		const entry = {
			member,
			score
		};
		this.list.splice(this.lowerBoundEntry(entry), 0, entry);
		return existing === void 0;
	}
	remove(member) {
		const score = this.scores.get(member);
		if (score === void 0) return false;
		this.list.splice(this.indexOf(member, score), 1);
		this.scores.delete(member);
		return true;
	}
	rank(member) {
		const score = this.scores.get(member);
		if (score === void 0) return;
		return this.indexOf(member, score);
	}
	indexOf(member, score) {
		return this.lowerBoundEntry({
			member,
			score
		});
	}
	lowerBoundEntry(entry) {
		let lo = 0;
		let hi = this.list.length;
		while (lo < hi) {
			const mid = lo + hi >>> 1;
			if (compareEntries(this.list[mid], entry) < 0) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}
	scoreLowerBound(min, exclusive) {
		let lo = 0;
		let hi = this.list.length;
		while (lo < hi) {
			const mid = lo + hi >>> 1;
			const score = this.list[mid].score;
			if (exclusive ? score <= min : score < min) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}
	scoreUpperBound(max, exclusive) {
		let lo = 0;
		let hi = this.list.length;
		while (lo < hi) {
			const mid = lo + hi >>> 1;
			const score = this.list[mid].score;
			if (exclusive ? score < max : score <= max) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}
	lexLowerBound(min, exclusive) {
		let lo = 0;
		let hi = this.list.length;
		while (lo < hi) {
			const mid = lo + hi >>> 1;
			const cmp = compareMembers(this.list[mid].member, min);
			if (exclusive ? cmp <= 0 : cmp < 0) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}
	lexUpperBound(max, exclusive) {
		let lo = 0;
		let hi = this.list.length;
		while (lo < hi) {
			const mid = lo + hi >>> 1;
			const cmp = compareMembers(this.list[mid].member, max);
			if (exclusive ? cmp < 0 : cmp <= 0) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}
};
//#endregion
//#region src/engine/commands/key.ts
const del = (ctx, args) => {
	let count = 0;
	for (const key of args) if (ctx.db.get(key, ctx.now) && ctx.db.delete(key)) count++;
	return int(count);
};
const cloneEntry = (entry) => {
	switch (entry.type) {
		case "string": return {
			type: "string",
			value: entry.value
		};
		case "list": return {
			type: "list",
			value: [...entry.value]
		};
		case "set": return {
			type: "set",
			value: new Set(entry.value)
		};
		case "hash": {
			const hash = newHash();
			for (const [k, v] of entry.value) hash.value.set(k, v);
			for (const [k, v] of entry.expires) hash.expires.set(k, v);
			return hash;
		}
		case "zset": {
			const zset = new SortedSet();
			for (const e of entry.value.entries()) zset.add(e.member, e.score);
			return {
				type: "zset",
				value: zset
			};
		}
	}
};
const parseExpireOptions = (args) => {
	const options = {
		nx: false,
		xx: false,
		gt: false,
		lt: false
	};
	for (const arg of args) {
		const flag = arg.toUpperCase();
		if (flag === "NX") options.nx = true;
		else if (flag === "XX") options.xx = true;
		else if (flag === "GT") options.gt = true;
		else if (flag === "LT") options.lt = true;
		else throw new RedisError(`ERR Unsupported option ${arg}`);
	}
	if (options.nx && (options.xx || options.gt || options.lt)) throw new RedisError("ERR NX and XX, GT or LT options at the same time are not compatible");
	if (options.gt && options.lt) throw new RedisError("ERR GT and LT options at the same time are not compatible");
	return options;
};
const applyExpire = (ctx, key, at, options) => {
	if (!ctx.db.get(key, ctx.now)) return int(0);
	const current = ctx.db.expireAt(key);
	if (options.nx && current !== void 0) return int(0);
	if (options.xx && current === void 0) return int(0);
	if (options.gt && (current === void 0 || at <= current)) return int(0);
	if (options.lt && current !== void 0 && at >= current) return int(0);
	if (at <= ctx.now) ctx.db.delete(key);
	else ctx.db.setExpire(key, at);
	return int(1);
};
const expireTime = (value, unit, relative, now) => {
	const n = parseInteger(value);
	const ms = unit === "seconds" ? n * 1e3 : n;
	if (!Number.isSafeInteger(ms) || relative && !Number.isSafeInteger(now + ms)) throw new RedisError("ERR invalid expire time in 'expire' command");
	return relative ? now + ms : ms;
};
const ttlReply = (ctx, key, unit, absolute) => {
	if (!ctx.db.get(key, ctx.now)) return int(-2);
	const at = ctx.db.expireAt(key);
	if (at === void 0) return int(-1);
	const value = absolute ? at : at - ctx.now;
	return int(unit === "seconds" ? Math.floor(value / 1e3) : value);
};
const rename = (ctx, from, to, onlyIfMissing) => {
	const entry = ctx.db.get(from, ctx.now);
	if (!entry) throw new RedisError("ERR no such key");
	if (onlyIfMissing && ctx.db.get(to, ctx.now)) return int(0);
	if (from === to) return onlyIfMissing ? int(0) : OK;
	const expiry = ctx.db.expireAt(from);
	ctx.db.delete(from);
	ctx.db.set(to, entry);
	if (expiry !== void 0) ctx.db.setExpire(to, expiry);
	return onlyIfMissing ? int(1) : OK;
};
const commands$7 = [
	{
		name: "DEL",
		arity: -2,
		write: true,
		handler: del
	},
	{
		name: "UNLINK",
		arity: -2,
		write: true,
		handler: del
	},
	{
		name: "EXISTS",
		arity: -2,
		handler: (ctx, args) => int(args.filter((key) => ctx.db.get(key, ctx.now)).length)
	},
	{
		name: "TYPE",
		arity: 2,
		handler: (ctx, args) => ({
			type: "status",
			value: ctx.db.get(args[0], ctx.now)?.type ?? "none"
		})
	},
	{
		name: "TOUCH",
		arity: -2,
		handler: (ctx, args) => int(args.filter((key) => ctx.db.get(key, ctx.now)).length)
	},
	{
		name: "KEYS",
		arity: 2,
		handler: (ctx, args) => {
			const pattern = args[0];
			return bulks(ctx.db.keys().filter((key) => ctx.db.get(key, ctx.now) && globMatch(pattern, key)));
		}
	},
	{
		name: "SCAN",
		arity: -2,
		handler: (ctx, args) => {
			const { match, count, type } = parseScanOptions(args.slice(1), true);
			const keys = ctx.db.keys().filter((key) => {
				const entry = ctx.db.get(key, ctx.now);
				return entry && (type === void 0 || entry.type === type);
			});
			const { next, items } = scanSlice(keys, args[0], count);
			return array([bulk(next), bulks(match === void 0 ? items : items.filter((k) => globMatch(match, k)))]);
		}
	},
	{
		name: "RANDOMKEY",
		arity: 1,
		handler: (ctx) => {
			const keys = ctx.db.keys().filter((key) => ctx.db.get(key, ctx.now));
			return keys.length === 0 ? NIL : bulk(keys[randomIndex(keys.length)]);
		}
	},
	{
		name: "RENAME",
		arity: 3,
		write: true,
		handler: (ctx, args) => rename(ctx, args[0], args[1], false)
	},
	{
		name: "RENAMENX",
		arity: 3,
		write: true,
		handler: (ctx, args) => rename(ctx, args[0], args[1], true)
	},
	{
		name: "EXPIRE",
		arity: -3,
		write: true,
		handler: (ctx, args) => applyExpire(ctx, args[0], expireTime(args[1], "seconds", true, ctx.now), parseExpireOptions(args.slice(2)))
	},
	{
		name: "PEXPIRE",
		arity: -3,
		write: true,
		handler: (ctx, args) => applyExpire(ctx, args[0], expireTime(args[1], "ms", true, ctx.now), parseExpireOptions(args.slice(2)))
	},
	{
		name: "EXPIREAT",
		arity: -3,
		write: true,
		handler: (ctx, args) => applyExpire(ctx, args[0], expireTime(args[1], "seconds", false, ctx.now), parseExpireOptions(args.slice(2)))
	},
	{
		name: "PEXPIREAT",
		arity: -3,
		write: true,
		handler: (ctx, args) => applyExpire(ctx, args[0], expireTime(args[1], "ms", false, ctx.now), parseExpireOptions(args.slice(2)))
	},
	{
		name: "TTL",
		arity: 2,
		handler: (ctx, args) => ttlReply(ctx, args[0], "seconds", false)
	},
	{
		name: "PTTL",
		arity: 2,
		handler: (ctx, args) => ttlReply(ctx, args[0], "ms", false)
	},
	{
		name: "EXPIRETIME",
		arity: 2,
		handler: (ctx, args) => ttlReply(ctx, args[0], "seconds", true)
	},
	{
		name: "PEXPIRETIME",
		arity: 2,
		handler: (ctx, args) => ttlReply(ctx, args[0], "ms", true)
	},
	{
		name: "PERSIST",
		arity: 2,
		write: true,
		handler: (ctx, args) => bool(ctx.db.get(args[0], ctx.now) !== void 0 && ctx.db.persist(args[0]))
	},
	{
		name: "COPY",
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			const source = args[0];
			const destination = args[1];
			let replace = false;
			let target = ctx.db;
			for (let i = 2; i < args.length; i++) {
				const option = args[i].toUpperCase();
				if (option === "REPLACE") replace = true;
				else if (option === "DB") {
					const index = parseInteger(expectArg(args, ++i));
					const db = ctx.engine.databases[index];
					if (!db) throw new RedisError("ERR DB index is out of range");
					target = db;
				} else throw syntaxError();
			}
			const entry = ctx.db.get(source, ctx.now);
			if (!entry) return int(0);
			if (target === ctx.db && source === destination) throw new RedisError("ERR source and destination objects are the same");
			if (target.get(destination, ctx.now)) {
				if (!replace) return int(0);
				target.delete(destination);
			}
			const expiry = ctx.db.expireAt(source);
			target.set(destination, cloneEntry(entry));
			if (expiry !== void 0) target.setExpire(destination, expiry);
			return int(1);
		}
	},
	{
		name: "MOVE",
		arity: 3,
		write: true,
		handler: (ctx, args) => {
			const key = args[0];
			const target = ctx.engine.databases[parseInteger(args[1])];
			if (!target) throw new RedisError("ERR DB index is out of range");
			if (target === ctx.db) throw new RedisError("ERR source and destination objects are the same");
			const entry = ctx.db.get(key, ctx.now);
			if (!entry || target.get(key, ctx.now)) return int(0);
			const expiry = ctx.db.expireAt(key);
			ctx.db.delete(key);
			target.set(key, entry);
			if (expiry !== void 0) target.setExpire(key, expiry);
			return int(1);
		}
	},
	{
		name: "OBJECT",
		arity: -2,
		handler: (ctx, args) => {
			const sub = args[0].toUpperCase();
			if (sub === "ENCODING") {
				const entry = ctx.db.get(expectArg(args, 1), ctx.now);
				if (!entry) return NIL;
				return bulk({
					string: "raw",
					list: "listpack",
					set: "hashtable",
					zset: "skiplist",
					hash: "hashtable"
				}[entry.type]);
			}
			if (sub === "HELP" || sub === "REFCOUNT" || sub === "IDLETIME" || sub === "FREQ") throw unsupported(`OBJECT ${sub}`);
			throw new RedisError(`ERR unknown subcommand '${args[0]}'. Try OBJECT HELP.`);
		}
	},
	{
		name: "DUMP",
		arity: 2,
		handler: () => {
			throw unsupported("DUMP");
		}
	},
	{
		name: "RESTORE",
		arity: -4,
		write: true,
		handler: () => {
			throw unsupported("RESTORE");
		}
	},
	{
		name: "MIGRATE",
		arity: -6,
		write: true,
		handler: () => {
			throw unsupported("MIGRATE");
		}
	},
	{
		name: "SORT",
		arity: -2,
		write: true,
		handler: () => {
			throw unsupported("SORT");
		}
	},
	{
		name: "SORT_RO",
		arity: -2,
		handler: () => {
			throw unsupported("SORT_RO");
		}
	},
	{
		name: "WAIT",
		arity: 3,
		handler: () => int(0)
	}
];
//#endregion
//#region src/engine/commands/list.ts
const getList = (ctx, key) => lookup(ctx, key, "list");
const getOrCreateList = (ctx, key) => lookupOrCreate(ctx, key, "list", () => ({
	type: "list",
	value: []
}));
const push = (ctx, args, side, onlyExisting) => {
	const key = args[0];
	const list = onlyExisting ? getList(ctx, key) : getOrCreateList(ctx, key);
	if (!list) return int(0);
	for (const value of args.slice(1)) if (side === "left") list.value.unshift(value);
	else list.value.push(value);
	ctx.db.touch(key);
	return int(list.value.length);
};
const pop = (ctx, args, side) => {
	const key = args[0];
	const list = getList(ctx, key);
	const count = args[1] === void 0 ? void 0 : parseInteger(args[1]);
	if (count !== void 0 && count < 0) throw new RedisError("ERR value is out of range, must be positive");
	if (!list) return count === void 0 ? NIL : NIL_ARRAY;
	const popped = popMany(list, side, count ?? 1);
	ctx.db.cleanup(key, list);
	return count === void 0 ? bulk(popped[0]) : bulks(popped);
};
const popMany = (list, side, count) => {
	const n = Math.min(count, list.value.length);
	return side === "left" ? list.value.splice(0, n) : list.value.splice(list.value.length - n, n).toReversed();
};
const parseSide = (value) => {
	const side = value.toUpperCase();
	if (side === "LEFT") return "left";
	if (side === "RIGHT") return "right";
	throw syntaxError();
};
const move = (ctx, source, destination, from, to) => {
	const list = getList(ctx, source);
	if (!list) return NIL;
	const value = from === "left" ? list.value.shift() : list.value.pop();
	const target = source === destination ? list : getOrCreateList(ctx, destination);
	if (to === "left") target.value.unshift(value);
	else target.value.push(value);
	ctx.db.cleanup(source, list);
	ctx.db.touch(destination);
	return bulk(value);
};
const blocking = (name) => ({
	name,
	arity: -3,
	write: true,
	handler: () => {
		throw unsupported(`blocking list commands (${name})`);
	}
});
const commands$6 = [
	{
		name: "LPUSH",
		arity: -3,
		write: true,
		handler: (ctx, args) => push(ctx, args, "left", false)
	},
	{
		name: "RPUSH",
		arity: -3,
		write: true,
		handler: (ctx, args) => push(ctx, args, "right", false)
	},
	{
		name: "LPUSHX",
		arity: -3,
		write: true,
		handler: (ctx, args) => push(ctx, args, "left", true)
	},
	{
		name: "RPUSHX",
		arity: -3,
		write: true,
		handler: (ctx, args) => push(ctx, args, "right", true)
	},
	{
		name: "LPOP",
		arity: -2,
		write: true,
		handler: (ctx, args) => pop(ctx, args, "left")
	},
	{
		name: "RPOP",
		arity: -2,
		write: true,
		handler: (ctx, args) => pop(ctx, args, "right")
	},
	{
		name: "LLEN",
		arity: 2,
		handler: (ctx, args) => int(getList(ctx, args[0])?.value.length ?? 0)
	},
	{
		name: "LRANGE",
		arity: 4,
		handler: (ctx, args) => {
			const list = getList(ctx, args[0]);
			if (!list) return array([]);
			const [start, end] = normalizeRange(parseInteger(args[1]), parseInteger(args[2]), list.value.length);
			return bulks(start > end ? [] : list.value.slice(start, end + 1));
		}
	},
	{
		name: "LINDEX",
		arity: 3,
		handler: (ctx, args) => {
			const list = getList(ctx, args[0]);
			let index = parseInteger(args[1]);
			if (!list) return NIL;
			if (index < 0) index += list.value.length;
			return bulk(list.value[index] ?? null);
		}
	},
	{
		name: "LSET",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const list = getList(ctx, args[0]);
			let index = parseInteger(args[1]);
			if (!list) throw new RedisError("ERR no such key");
			if (index < 0) index += list.value.length;
			if (index < 0 || index >= list.value.length) throw new RedisError("ERR index out of range");
			list.value[index] = args[2];
			ctx.db.touch(args[0]);
			return OK;
		}
	},
	{
		name: "LINSERT",
		arity: 5,
		write: true,
		handler: (ctx, args) => {
			const where = args[1].toUpperCase();
			if (where !== "BEFORE" && where !== "AFTER") throw syntaxError();
			const list = getList(ctx, args[0]);
			if (!list) return int(0);
			const index = list.value.indexOf(args[2]);
			if (index === -1) return int(-1);
			list.value.splice(where === "BEFORE" ? index : index + 1, 0, args[3]);
			ctx.db.touch(args[0]);
			return int(list.value.length);
		}
	},
	{
		name: "LREM",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const list = getList(ctx, args[0]);
			const count = parseInteger(args[1]);
			const value = args[2];
			if (!list) return int(0);
			let removed = 0;
			const limit = count === 0 ? Infinity : Math.abs(count);
			if (count >= 0) for (let i = 0; i < list.value.length && removed < limit;) if (list.value[i] === value) {
				list.value.splice(i, 1);
				removed++;
			} else i++;
			else for (let i = list.value.length - 1; i >= 0 && removed < limit; i--) if (list.value[i] === value) {
				list.value.splice(i, 1);
				removed++;
			}
			ctx.db.cleanup(args[0], list);
			return int(removed);
		}
	},
	{
		name: "LTRIM",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const list = getList(ctx, args[0]);
			if (!list) return OK;
			const [start, end] = normalizeRange(parseInteger(args[1]), parseInteger(args[2]), list.value.length);
			list.value = start > end ? [] : list.value.slice(start, end + 1);
			ctx.db.cleanup(args[0], list);
			return OK;
		}
	},
	{
		name: "LPOS",
		arity: -3,
		handler: (ctx, args) => {
			const value = args[1];
			let rank = 1;
			let count;
			let maxlen = 0;
			for (let i = 2; i < args.length; i++) {
				const option = args[i].toUpperCase();
				const param = expectArg(args, ++i);
				if (option === "RANK") {
					rank = parseInteger(param);
					if (rank === 0) throw new RedisError("ERR RANK can't be zero: use 1 to start from the first match, 2 from the second ... or use negative to start from the end of the list");
				} else if (option === "COUNT") {
					count = parseInteger(param);
					if (count < 0) throw new RedisError("ERR COUNT can't be negative");
				} else if (option === "MAXLEN") {
					maxlen = parseInteger(param);
					if (maxlen < 0) throw new RedisError("ERR MAXLEN can't be negative");
				} else throw syntaxError();
			}
			const list = getList(ctx, args[0]);
			if (!list) return count === void 0 ? NIL : array([]);
			const items = list.value;
			const matches = [];
			const limit = count === void 0 ? 1 : count === 0 ? Infinity : count;
			let skip = Math.abs(rank) - 1;
			let scanned = 0;
			const consider = (i) => {
				if (items[i] === value) {
					if (skip > 0) skip--;
					else matches.push(i);
				}
			};
			if (rank > 0) for (let i = 0; i < items.length && matches.length < limit; i++, scanned++) {
				if (maxlen && scanned >= maxlen) break;
				consider(i);
			}
			else for (let i = items.length - 1; i >= 0 && matches.length < limit; i--, scanned++) {
				if (maxlen && scanned >= maxlen) break;
				consider(i);
			}
			if (count === void 0) return matches.length === 0 ? NIL : int(matches[0]);
			return array(matches.map((i) => int(i)));
		}
	},
	{
		name: "LMOVE",
		arity: 5,
		write: true,
		handler: (ctx, args) => move(ctx, args[0], args[1], parseSide(args[2]), parseSide(args[3]))
	},
	{
		name: "RPOPLPUSH",
		arity: 3,
		write: true,
		handler: (ctx, args) => move(ctx, args[0], args[1], "right", "left")
	},
	{
		name: "LMPOP",
		arity: -4,
		write: true,
		handler: (ctx, args) => {
			const numkeys = parseInteger(args[0]);
			if (numkeys <= 0) throw new RedisError("ERR numkeys should be greater than 0");
			const keys = args.slice(1, 1 + numkeys);
			if (keys.length !== numkeys) throw syntaxError();
			const side = parseSide(expectArg(args, 1 + numkeys));
			let count = 1;
			if (args.length > 2 + numkeys) {
				if (args[2 + numkeys].toUpperCase() !== "COUNT" || args.length !== 4 + numkeys) throw syntaxError();
				count = parseInteger(args[3 + numkeys]);
				if (count <= 0) throw new RedisError("ERR count should be greater than 0");
			}
			for (const key of keys) {
				const list = getList(ctx, key);
				if (list) {
					const popped = popMany(list, side, count);
					ctx.db.cleanup(key, list);
					return array([bulk(key), bulks(popped)]);
				}
			}
			return NIL_ARRAY;
		}
	},
	blocking("BLPOP"),
	blocking("BRPOP"),
	blocking("BLMOVE"),
	blocking("BRPOPLPUSH"),
	blocking("BLMPOP")
];
//#endregion
//#region src/engine/commands/pubsub.ts
const labels = {
	channels: ["subscribe", "unsubscribe"],
	patterns: ["psubscribe", "punsubscribe"],
	shards: ["ssubscribe", "sunsubscribe"]
};
const countFor = (ctx, conn, kind) => kind === "shards" ? conn.subscriptions.shards.size : ctx.engine.subscriptionCount(conn);
const subscribe = (kind) => (ctx, args) => {
	for (const name of args) {
		ctx.engine.subscribe(ctx.conn, name, kind);
		ctx.conn.push(push$1([
			bulk(labels[kind][0]),
			bulk(name),
			int(countFor(ctx, ctx.conn, kind))
		]));
	}
	return NONE;
};
const unsubscribe = (kind) => (ctx, args) => {
	const names = args.length > 0 ? args : [...ctx.conn.subscriptions[kind]];
	if (names.length === 0) {
		ctx.conn.push(push$1([
			bulk(labels[kind][1]),
			bulk(null),
			int(countFor(ctx, ctx.conn, kind))
		]));
		return NONE;
	}
	for (const name of names) {
		ctx.engine.unsubscribe(ctx.conn, name, kind);
		ctx.conn.push(push$1([
			bulk(labels[kind][1]),
			bulk(name),
			int(countFor(ctx, ctx.conn, kind))
		]));
	}
	return NONE;
};
const pubsub = (ctx, args) => {
	const sub = args[0].toUpperCase();
	const rest = args.slice(1);
	switch (sub) {
		case "CHANNELS":
		case "SHARDCHANNELS": {
			if (rest.length > 1) throw new RedisError(`ERR wrong number of arguments for 'pubsub|${sub.toLowerCase()}' command`);
			const pattern = rest[0];
			const index = sub === "CHANNELS" ? ctx.engine.channels : ctx.engine.shards;
			return bulks([...index.keys()].filter((name) => pattern === void 0 || globMatch(pattern, name)));
		}
		case "NUMSUB":
		case "SHARDNUMSUB": {
			const index = sub === "NUMSUB" ? ctx.engine.channels : ctx.engine.shards;
			return map(rest.map((name) => [bulk(name), int(index.get(name)?.size ?? 0)]));
		}
		case "NUMPAT":
			if (rest.length > 0) throw new RedisError("ERR wrong number of arguments for 'pubsub|numpat' command");
			return int(ctx.engine.patterns.size);
		case "HELP": throw new RedisError("ERR the local redis server does not support PUBSUB HELP");
		default: throw unknownSubcommand(args[0], "pubsub");
	}
};
const commands$5 = [
	{
		name: "SUBSCRIBE",
		arity: -2,
		noscript: true,
		handler: subscribe("channels")
	},
	{
		name: "UNSUBSCRIBE",
		arity: -1,
		noscript: true,
		handler: unsubscribe("channels")
	},
	{
		name: "PSUBSCRIBE",
		arity: -2,
		noscript: true,
		handler: subscribe("patterns")
	},
	{
		name: "PUNSUBSCRIBE",
		arity: -1,
		noscript: true,
		handler: unsubscribe("patterns")
	},
	{
		name: "SSUBSCRIBE",
		arity: -2,
		noscript: true,
		handler: subscribe("shards")
	},
	{
		name: "SUNSUBSCRIBE",
		arity: -1,
		noscript: true,
		handler: unsubscribe("shards")
	},
	{
		name: "PUBLISH",
		arity: 3,
		handler: (ctx, args) => int(ctx.engine.publish(args[0], args[1]))
	},
	{
		name: "SPUBLISH",
		arity: 3,
		handler: (ctx, args) => int(ctx.engine.spublish(args[0], args[1]))
	},
	{
		name: "PUBSUB",
		arity: -2,
		handler: pubsub
	}
];
//#endregion
//#region src/engine/commands/script.ts
const parseEvalArgs = (args) => {
	const numkeys = parseInteger(args[1]);
	if (numkeys < 0) throw new RedisError("ERR Number of keys can't be negative");
	if (numkeys > args.length - 2) throw new RedisError("ERR Number of keys can't be greater than number of args");
	return {
		keys: args.slice(2, 2 + numkeys),
		argv: args.slice(2 + numkeys)
	};
};
const evalCommand = (bySha, readOnly) => (ctx, args) => {
	const { keys, argv } = parseEvalArgs(args);
	const lua = ctx.engine.lua;
	const sha = bySha ? args[0].toLowerCase() : lua.load(args[0]);
	return lua.run(sha, keys, argv, ctx.conn, readOnly);
};
const script = (ctx, args) => {
	const sub = args[0].toUpperCase();
	const lua = ctx.engine.lua;
	switch (sub) {
		case "LOAD":
			if (args.length !== 2) throw new RedisError("ERR wrong number of arguments for 'script|load' command");
			return bulk(lua.load(args[1]));
		case "EXISTS":
			if (args.length < 2) throw new RedisError("ERR wrong number of arguments for 'script|exists' command");
			return ints(args.slice(1).map((sha) => lua.exists(sha.toLowerCase()) ? 1 : 0));
		case "FLUSH": {
			const mode = args[1]?.toUpperCase();
			if (args.length > 2 || mode !== void 0 && mode !== "ASYNC" && mode !== "SYNC") throw syntaxError();
			lua.flush();
			return OK;
		}
		case "KILL":
		case "DEBUG":
		case "HELP": throw unsupported(`SCRIPT ${sub}`);
		default: throw unknownSubcommand(args[0], "script");
	}
};
const commands$4 = [
	{
		name: "EVAL",
		arity: -3,
		noscript: true,
		write: true,
		handler: evalCommand(false, false)
	},
	{
		name: "EVALSHA",
		arity: -3,
		noscript: true,
		write: true,
		handler: evalCommand(true, false)
	},
	{
		name: "EVAL_RO",
		arity: -3,
		noscript: true,
		handler: evalCommand(false, true)
	},
	{
		name: "EVALSHA_RO",
		arity: -3,
		noscript: true,
		handler: evalCommand(true, true)
	},
	{
		name: "SCRIPT",
		arity: -2,
		noscript: true,
		handler: script
	}
];
//#endregion
//#region src/engine/commands/set.ts
const getSet = (ctx, key) => lookup(ctx, key, "set");
const getOrCreateSet = (ctx, key) => lookupOrCreate(ctx, key, "set", () => ({
	type: "set",
	value: /* @__PURE__ */ new Set()
}));
const members = (ctx, key) => getSet(ctx, key)?.value ?? /* @__PURE__ */ new Set();
const combine$1 = (ctx, keys, op) => {
	const sets = keys.map((key) => members(ctx, key));
	const first = sets[0] ?? /* @__PURE__ */ new Set();
	if (op === "union") {
		const result = /* @__PURE__ */ new Set();
		for (const set of sets) for (const m of set) result.add(m);
		return result;
	}
	const result = /* @__PURE__ */ new Set();
	for (const m of first) if (op === "inter" ? sets.every((s) => s.has(m)) : !sets.slice(1).some((s) => s.has(m))) result.add(m);
	return result;
};
const store = (ctx, destination, result) => {
	ctx.db.delete(destination);
	if (result.size > 0) ctx.db.set(destination, {
		type: "set",
		value: result
	});
	return int(result.size);
};
const randomMembers = (set, count) => {
	const list = [...set];
	if (count >= 0) return shuffle(list).slice(0, count);
	return Array.from({ length: -count }, () => list[randomIndex(list.length)]);
};
const commands$3 = [
	{
		name: "SADD",
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			const set = getOrCreateSet(ctx, args[0]);
			let added = 0;
			for (const member of args.slice(1)) if (!set.value.has(member)) {
				set.value.add(member);
				added++;
			}
			ctx.db.touch(args[0]);
			return int(added);
		}
	},
	{
		name: "SREM",
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			const set = getSet(ctx, args[0]);
			if (!set) return int(0);
			let removed = 0;
			for (const member of args.slice(1)) if (set.value.delete(member)) removed++;
			ctx.db.cleanup(args[0], set);
			return int(removed);
		}
	},
	{
		name: "SMEMBERS",
		arity: 2,
		handler: (ctx, args) => set$1([...members(ctx, args[0])].map((m) => bulk(m)))
	},
	{
		name: "SISMEMBER",
		arity: 3,
		handler: (ctx, args) => bool(members(ctx, args[0]).has(args[1]))
	},
	{
		name: "SMISMEMBER",
		arity: -3,
		handler: (ctx, args) => {
			const set = members(ctx, args[0]);
			return array(args.slice(1).map((m) => bool(set.has(m))));
		}
	},
	{
		name: "SCARD",
		arity: 2,
		handler: (ctx, args) => int(members(ctx, args[0]).size)
	},
	{
		name: "SPOP",
		arity: -2,
		write: true,
		handler: (ctx, args) => {
			if (args.length > 2) throw syntaxError();
			const set = getSet(ctx, args[0]);
			const count = args[1] === void 0 ? void 0 : parseInteger(args[1]);
			if (count !== void 0 && count < 0) throw new RedisError("ERR value is out of range, must be positive");
			if (!set) return count === void 0 ? NIL : array([]);
			const picked = randomMembers(set.value, count ?? 1);
			for (const m of picked) set.value.delete(m);
			ctx.db.cleanup(args[0], set);
			return count === void 0 ? bulk(picked[0] ?? null) : bulks(picked);
		}
	},
	{
		name: "SRANDMEMBER",
		arity: -2,
		handler: (ctx, args) => {
			if (args.length > 2) throw syntaxError();
			const set = getSet(ctx, args[0]);
			const count = args[1] === void 0 ? void 0 : parseInteger(args[1]);
			if (!set) return count === void 0 ? NIL : array([]);
			const picked = randomMembers(set.value, count ?? 1);
			return count === void 0 ? bulk(picked[0] ?? null) : bulks(picked);
		}
	},
	{
		name: "SMOVE",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const source = getSet(ctx, args[0]);
			const destination = getSet(ctx, args[1]);
			const member = args[2];
			if (!source || !source.value.has(member)) return int(0);
			if (args[0] === args[1]) return int(1);
			source.value.delete(member);
			ctx.db.cleanup(args[0], source);
			(destination ?? getOrCreateSet(ctx, args[1])).value.add(member);
			ctx.db.touch(args[1]);
			return int(1);
		}
	},
	{
		name: "SDIFF",
		arity: -2,
		handler: (ctx, args) => set$1([...combine$1(ctx, args, "diff")].map((m) => bulk(m)))
	},
	{
		name: "SINTER",
		arity: -2,
		handler: (ctx, args) => set$1([...combine$1(ctx, args, "inter")].map((m) => bulk(m)))
	},
	{
		name: "SUNION",
		arity: -2,
		handler: (ctx, args) => set$1([...combine$1(ctx, args, "union")].map((m) => bulk(m)))
	},
	{
		name: "SDIFFSTORE",
		arity: -3,
		write: true,
		handler: (ctx, args) => store(ctx, args[0], combine$1(ctx, args.slice(1), "diff"))
	},
	{
		name: "SINTERSTORE",
		arity: -3,
		write: true,
		handler: (ctx, args) => store(ctx, args[0], combine$1(ctx, args.slice(1), "inter"))
	},
	{
		name: "SUNIONSTORE",
		arity: -3,
		write: true,
		handler: (ctx, args) => store(ctx, args[0], combine$1(ctx, args.slice(1), "union"))
	},
	{
		name: "SINTERCARD",
		arity: -3,
		handler: (ctx, args) => {
			const numkeys = parseInteger(args[0]);
			if (numkeys <= 0) throw new RedisError("ERR numkeys should be greater than 0");
			const keys = args.slice(1, 1 + numkeys);
			if (keys.length !== numkeys) throw new RedisError("ERR Number of keys can't be greater than number of args");
			let limit = 0;
			if (args.length > 1 + numkeys) {
				if (args[1 + numkeys].toUpperCase() !== "LIMIT" || args.length !== 3 + numkeys) throw syntaxError();
				limit = parseInteger(expectArg(args, 2 + numkeys));
				if (limit < 0) throw new RedisError("ERR LIMIT can't be negative");
			}
			const size = combine$1(ctx, keys, "inter").size;
			return int(limit === 0 ? size : Math.min(size, limit));
		}
	},
	{
		name: "SSCAN",
		arity: -3,
		handler: (ctx, args) => {
			const { match, count } = parseScanOptions(args.slice(2));
			const list = [...members(ctx, args[0])];
			const { next, items } = list.length <= 128 ? {
				next: "0",
				items: list
			} : scanSlice(list, args[1], count);
			return array([bulk(next), bulks(match === void 0 ? items : items.filter((m) => globMatch(match, m)))]);
		}
	}
];
//#endregion
//#region src/engine/commands/string.ts
const getString = (ctx, key) => lookup(ctx, key, "string")?.value;
const setString = (ctx, key, value, expireAt) => {
	ctx.db.set(key, {
		type: "string",
		value
	});
	if (expireAt !== void 0) ctx.db.setExpire(key, expireAt);
};
const parseExpiry = (value, unit, relative, now, command) => {
	const n = parseInteger(value, () => new RedisError(`ERR invalid expire time in '${command}' command`));
	const ms = unit === "seconds" ? n * 1e3 : n;
	if (ms <= 0 || !Number.isSafeInteger(ms)) throw new RedisError(`ERR invalid expire time in '${command}' command`);
	return relative ? now + ms : ms;
};
const set = (ctx, args) => {
	const key = args[0];
	const value = args[1];
	let expireAt;
	let keepTtl = false;
	let nx = false;
	let xx = false;
	let get = false;
	for (let i = 2; i < args.length; i++) {
		const option = args[i].toUpperCase();
		if (option === "NX" && !xx) nx = true;
		else if (option === "XX" && !nx) xx = true;
		else if (option === "GET") get = true;
		else if (option === "KEEPTTL" && expireAt === void 0) keepTtl = true;
		else if ((option === "EX" || option === "PX" || option === "EXAT" || option === "PXAT") && !keepTtl && expireAt === void 0) {
			const unit = option.startsWith("EX") ? "seconds" : "ms";
			expireAt = parseExpiry(expectArg(args, ++i), unit, !option.endsWith("AT"), ctx.now, "set");
		} else throw syntaxError();
	}
	const previous = get ? getString(ctx, key) : void 0;
	const exists = ctx.db.get(key, ctx.now) !== void 0;
	if (nx && exists || xx && !exists) return get ? bulk(previous ?? null) : NIL;
	const currentExpiry = keepTtl ? ctx.db.expireAt(key) : void 0;
	setString(ctx, key, value, expireAt ?? currentExpiry);
	return get ? bulk(previous ?? null) : OK;
};
const incrBy = (ctx, key, delta) => {
	const current = getString(ctx, key);
	const next = (current === void 0 ? 0n : parseInt64(current)) + delta;
	if (next > 9223372036854775807n || next < -9223372036854775808n) throw new RedisError("ERR increment or decrement would overflow");
	setString(ctx, key, next.toString(), ctx.db.expireAt(key));
	return int(next);
};
const getRange = (value, start, end) => {
	if (value.length === 0) return "";
	const [from, to] = normalizeRange(start, end, value.length);
	if (from > to) return "";
	return value.slice(from, to + 1);
};
const commands$2 = [
	{
		name: "GET",
		arity: 2,
		handler: (ctx, args) => bulk(getString(ctx, args[0]) ?? null)
	},
	{
		name: "SET",
		arity: -3,
		write: true,
		handler: set
	},
	{
		name: "SETNX",
		arity: 3,
		write: true,
		handler: (ctx, args) => {
			if (ctx.db.get(args[0], ctx.now)) return int(0);
			setString(ctx, args[0], args[1]);
			return int(1);
		}
	},
	{
		name: "SETEX",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			setString(ctx, args[0], args[2], parseExpiry(args[1], "seconds", true, ctx.now, "setex"));
			return OK;
		}
	},
	{
		name: "PSETEX",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			setString(ctx, args[0], args[2], parseExpiry(args[1], "ms", true, ctx.now, "psetex"));
			return OK;
		}
	},
	{
		name: "GETSET",
		arity: 3,
		write: true,
		handler: (ctx, args) => {
			const previous = getString(ctx, args[0]);
			setString(ctx, args[0], args[1]);
			return bulk(previous ?? null);
		}
	},
	{
		name: "GETDEL",
		arity: 2,
		write: true,
		handler: (ctx, args) => {
			const previous = getString(ctx, args[0]);
			if (previous !== void 0) ctx.db.delete(args[0]);
			return bulk(previous ?? null);
		}
	},
	{
		name: "GETEX",
		arity: -2,
		write: true,
		handler: (ctx, args) => {
			const key = args[0];
			const value = getString(ctx, key);
			let expireAt;
			let persist = false;
			for (let i = 1; i < args.length; i++) {
				const option = args[i].toUpperCase();
				if (option === "PERSIST" && expireAt === void 0) persist = true;
				else if ((option === "EX" || option === "PX" || option === "EXAT" || option === "PXAT") && !persist && expireAt === void 0) {
					const unit = option.startsWith("EX") ? "seconds" : "ms";
					expireAt = parseExpiry(expectArg(args, ++i), unit, !option.endsWith("AT"), ctx.now, "getex");
				} else throw syntaxError();
			}
			if (value === void 0) return NIL;
			if (persist) ctx.db.persist(key);
			else if (expireAt !== void 0) ctx.db.setExpire(key, expireAt);
			return bulk(value);
		}
	},
	{
		name: "MGET",
		arity: -2,
		handler: (ctx, args) => ({
			type: "array",
			value: args.map((key) => {
				const entry = ctx.db.get(key, ctx.now);
				return bulk(entry?.type === "string" ? entry.value : null);
			})
		})
	},
	{
		name: "MSET",
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			if (args.length % 2 !== 0) throw new RedisError("ERR wrong number of arguments for 'mset' command");
			for (let i = 0; i < args.length; i += 2) setString(ctx, args[i], args[i + 1]);
			return OK;
		}
	},
	{
		name: "MSETNX",
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			if (args.length % 2 !== 0) throw new RedisError("ERR wrong number of arguments for 'msetnx' command");
			for (let i = 0; i < args.length; i += 2) if (ctx.db.get(args[i], ctx.now)) return int(0);
			for (let i = 0; i < args.length; i += 2) setString(ctx, args[i], args[i + 1]);
			return int(1);
		}
	},
	{
		name: "INCR",
		arity: 2,
		write: true,
		handler: (ctx, args) => incrBy(ctx, args[0], 1n)
	},
	{
		name: "DECR",
		arity: 2,
		write: true,
		handler: (ctx, args) => incrBy(ctx, args[0], -1n)
	},
	{
		name: "INCRBY",
		arity: 3,
		write: true,
		handler: (ctx, args) => incrBy(ctx, args[0], parseInt64(args[1]))
	},
	{
		name: "DECRBY",
		arity: 3,
		write: true,
		handler: (ctx, args) => incrBy(ctx, args[0], -parseInt64(args[1]))
	},
	{
		name: "INCRBYFLOAT",
		arity: 3,
		write: true,
		handler: (ctx, args) => {
			const key = args[0];
			const current = getString(ctx, key);
			const next = (current === void 0 ? 0 : parseFloatArg(current)) + parseFloatArg(args[1]);
			if (!Number.isFinite(next)) throw new RedisError("ERR increment would produce NaN or Infinity");
			const text = formatLongDouble(next);
			setString(ctx, key, text, ctx.db.expireAt(key));
			return bulk(text);
		}
	},
	{
		name: "APPEND",
		arity: 3,
		write: true,
		handler: (ctx, args) => {
			const key = args[0];
			const value = (getString(ctx, key) ?? "") + args[1];
			setString(ctx, key, value, ctx.db.expireAt(key));
			return int(value.length);
		}
	},
	{
		name: "STRLEN",
		arity: 2,
		handler: (ctx, args) => int(getString(ctx, args[0])?.length ?? 0)
	},
	{
		name: "GETRANGE",
		arity: 4,
		handler: (ctx, args) => bulk(getRange(getString(ctx, args[0]) ?? "", parseInteger(args[1]), parseInteger(args[2])))
	},
	{
		name: "SUBSTR",
		arity: 4,
		handler: (ctx, args) => bulk(getRange(getString(ctx, args[0]) ?? "", parseInteger(args[1]), parseInteger(args[2])))
	},
	{
		name: "SETRANGE",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const key = args[0];
			const offset = parseInteger(args[1]);
			const patch = args[2];
			if (offset < 0) throw new RedisError("ERR offset is out of range");
			if (offset + patch.length > 536870912) throw new RedisError("ERR string exceeds maximum allowed size (proto-max-bulk-len)");
			const current = getString(ctx, key) ?? "";
			if (patch.length === 0) return int(current.length);
			const padded = current.length < offset ? current + "\0".repeat(offset - current.length) : current;
			const value = padded.slice(0, offset) + patch + padded.slice(offset + patch.length);
			setString(ctx, key, value, ctx.db.expireAt(key));
			return int(value.length);
		}
	},
	{
		name: "LCS",
		arity: -3,
		handler: () => {
			throw new RedisError("ERR the local redis server does not support LCS");
		}
	},
	{
		name: "SETBIT",
		arity: 4,
		write: true,
		handler: () => {
			throw new RedisError("ERR the local redis server does not support bitmap commands");
		}
	},
	{
		name: "GETBIT",
		arity: 3,
		handler: () => {
			throw new RedisError("ERR the local redis server does not support bitmap commands");
		}
	}
];
//#endregion
//#region src/engine/commands/transaction.ts
const unwatch = (ctx) => {
	ctx.conn.watches = [];
};
const isDirty = (ctx) => ctx.conn.watches.some((watch) => {
	const db = ctx.engine.databases[watch.db];
	if (!db) return true;
	db.get(watch.key, ctx.now);
	return db.generation !== watch.generation || db.version(watch.key) !== watch.version;
});
const commands$1 = [
	{
		name: "MULTI",
		arity: 1,
		noscript: true,
		handler: (ctx) => {
			if (ctx.conn.multi) throw new RedisError("ERR MULTI calls can not be nested");
			ctx.conn.multi = {
				queue: [],
				failed: false
			};
			return OK;
		}
	},
	{
		name: "EXEC",
		arity: 1,
		noscript: true,
		handler: (ctx) => {
			const multi = ctx.conn.multi;
			if (!multi) throw new RedisError("ERR EXEC without MULTI");
			ctx.conn.multi = null;
			if (multi.failed) {
				unwatch(ctx);
				throw new RedisError("EXECABORT Transaction discarded because of previous errors.");
			}
			if (isDirty(ctx)) {
				unwatch(ctx);
				return NIL_ARRAY;
			}
			unwatch(ctx);
			const replies = multi.queue.map((argv) => {
				try {
					return ctx.engine.call(argv, ctx.conn);
				} catch (err) {
					if (err instanceof RedisError) return error(err.message);
					throw err;
				}
			});
			return array(replies);
		}
	},
	{
		name: "DISCARD",
		arity: 1,
		noscript: true,
		handler: (ctx) => {
			if (!ctx.conn.multi) throw new RedisError("ERR DISCARD without MULTI");
			ctx.conn.multi = null;
			unwatch(ctx);
			return OK;
		}
	},
	{
		name: "WATCH",
		arity: -2,
		noscript: true,
		handler: (ctx, args) => {
			if (ctx.conn.multi) throw new RedisError("ERR WATCH inside MULTI is not allowed");
			for (const key of args) {
				ctx.db.get(key, ctx.now);
				ctx.conn.watches.push({
					db: ctx.conn.db,
					key,
					version: ctx.db.version(key),
					generation: ctx.db.generation
				});
			}
			return OK;
		}
	},
	{
		name: "UNWATCH",
		arity: 1,
		noscript: true,
		handler: (ctx) => {
			unwatch(ctx);
			return OK;
		}
	}
];
//#endregion
//#region src/engine/commands/zset.ts
const getZSet = (ctx, key) => lookup(ctx, key, "zset");
const getOrCreateZSet = (ctx, key) => lookupOrCreate(ctx, key, "zset", () => ({
	type: "zset",
	value: new SortedSet()
}));
const parseScore = (value) => {
	const score = parseFloatArg(value);
	if (Number.isNaN(score)) throw new RedisError("ERR value is not a valid float");
	return score;
};
const entriesReply = (entries, withScores) => {
	if (!withScores) return bulks(entries.map((e) => e.member));
	return pairs(entries.map((e) => [bulk(e.member), double(e.score)]));
};
const parseScoreBound = (value) => {
	const error = () => new RedisError("ERR min or max is not a float");
	if (value.startsWith("(")) return {
		value: parseFloatArg(value.slice(1), error),
		exclusive: true
	};
	return {
		value: parseFloatArg(value, error),
		exclusive: false
	};
};
const parseLexBound = (value) => {
	if (value === "-") return {
		value: "",
		exclusive: false,
		open: "min"
	};
	if (value === "+") return {
		value: "",
		exclusive: false,
		open: "max"
	};
	if (value.startsWith("(")) return {
		value: value.slice(1),
		exclusive: true,
		open: null
	};
	if (value.startsWith("[")) return {
		value: value.slice(1),
		exclusive: false,
		open: null
	};
	throw new RedisError("ERR min or max not valid string range item");
};
const rangeByScore = (zset, min, max) => {
	const from = zset.scoreLowerBound(min.value, min.exclusive);
	const to = zset.scoreUpperBound(max.value, max.exclusive);
	return from >= to ? [] : zset.entries().slice(from, to);
};
const rangeByLex = (zset, min, max) => {
	const from = min.open === "min" ? 0 : min.open === "max" ? zset.size : zset.lexLowerBound(min.value, min.exclusive);
	const to = max.open === "max" ? zset.size : max.open === "min" ? 0 : zset.lexUpperBound(max.value, max.exclusive);
	return from >= to ? [] : zset.entries().slice(from, to);
};
const rangeByRank = (zset, start, stop) => {
	const [from, to] = normalizeRange(start, stop, zset.size);
	return from > to ? [] : zset.entries().slice(from, to + 1);
};
const evaluateRange = (zset, start, stop, options) => {
	if (!zset) return [];
	let entries;
	if (options.by === "rank") {
		const list = options.rev ? zset.entries().toReversed() : [...zset.entries()];
		const [from, to] = normalizeRange(parseInteger(start), parseInteger(stop), list.length);
		entries = from > to ? [] : list.slice(from, to + 1);
	} else if (options.by === "score") {
		const min = parseScoreBound(options.rev ? stop : start);
		const max = parseScoreBound(options.rev ? start : stop);
		entries = rangeByScore(zset, min, max);
		if (options.rev) entries = entries.toReversed();
	} else {
		const min = parseLexBound(options.rev ? stop : start);
		const max = parseLexBound(options.rev ? start : stop);
		entries = rangeByLex(zset, min, max);
		if (options.rev) entries = entries.toReversed();
	}
	if (options.limit) {
		const [offset, count] = options.limit;
		if (offset < 0) return [];
		entries = count < 0 ? entries.slice(offset) : entries.slice(offset, offset + count);
	}
	return entries;
};
const parseRangeArgs = (args, defaults, allowed) => {
	const options = {
		by: "rank",
		rev: false,
		limit: null,
		withScores: false,
		...defaults
	};
	for (let i = 0; i < args.length; i++) {
		const option = args[i].toUpperCase();
		if (option === "BYSCORE" && allowed.by) options.by = "score";
		else if (option === "BYLEX" && allowed.by) options.by = "lex";
		else if (option === "REV" && allowed.rev) options.rev = true;
		else if (option === "WITHSCORES" && allowed.withScores) options.withScores = true;
		else if (option === "LIMIT" && allowed.limit) {
			options.limit = [parseInteger(expectArg(args, i + 1)), parseInteger(expectArg(args, i + 2))];
			i += 2;
		} else throw syntaxError();
	}
	if (options.limit && options.by === "rank") throw new RedisError("ERR syntax error, LIMIT is only supported in combination with either BYSCORE or BYLEX");
	if (options.withScores && options.by === "lex") throw new RedisError("ERR syntax error, WITHSCORES not supported in combination with BYLEX");
	return options;
};
const zadd = (ctx, args) => {
	const key = args[0];
	let i = 1;
	let nx = false;
	let xx = false;
	let gt = false;
	let lt = false;
	let ch = false;
	let incr = false;
	for (; i < args.length; i++) {
		const option = args[i].toUpperCase();
		if (option === "NX") nx = true;
		else if (option === "XX") xx = true;
		else if (option === "GT") gt = true;
		else if (option === "LT") lt = true;
		else if (option === "CH") ch = true;
		else if (option === "INCR") incr = true;
		else break;
	}
	const rest = args.slice(i);
	if (rest.length === 0 || rest.length % 2 !== 0) throw syntaxError();
	if (nx && xx) throw new RedisError("ERR XX and NX options at the same time are not compatible");
	if (gt && lt || (gt || lt) && nx) throw new RedisError("ERR GT, LT, and/or NX options at the same time are not compatible");
	if (incr && rest.length !== 2) throw new RedisError("ERR INCR option supports a single increment-element pair");
	const pairs = [];
	for (let j = 0; j < rest.length; j += 2) pairs.push([parseScore(rest[j]), rest[j + 1]]);
	const existing = getZSet(ctx, key);
	if (!existing && xx) return incr ? NIL : int(0);
	const zset = existing ?? getOrCreateZSet(ctx, key);
	let added = 0;
	let changed = 0;
	let incrResult = null;
	for (const [score, member] of pairs) {
		const current = zset.value.score(member);
		if (current === void 0 && xx) continue;
		if (current !== void 0 && nx) continue;
		let next = score;
		if (incr && current !== void 0) {
			next = current + score;
			if (Number.isNaN(next)) throw new RedisError("ERR resulting score is not a number (NaN)");
		}
		if (current !== void 0 && (gt && next <= current || lt && next >= current)) continue;
		if (zset.value.add(member, next)) added++;
		else if (current !== next) changed++;
		incrResult = next;
	}
	ctx.db.cleanup(key, zset);
	if (incr) return incrResult === null ? NIL : double(incrResult);
	return int(ch ? added + changed : added);
};
const parseSetOperation = (args, withStoreDestination, allowWithScores) => {
	let index = 0;
	const destination = withStoreDestination ? args[index++] : null;
	const numkeys = parseInteger(expectArg(args, index++));
	if (numkeys <= 0) throw new RedisError("ERR at least 1 input key is needed for this command");
	const keys = args.slice(index, index + numkeys);
	if (keys.length !== numkeys) throw syntaxError();
	index += numkeys;
	let weights = keys.map(() => 1);
	let aggregate = "sum";
	let withScores = false;
	while (index < args.length) {
		const option = args[index].toUpperCase();
		if (option === "WEIGHTS") {
			weights = keys.map((_, i) => parseFloatArg(expectArg(args, index + 1 + i), () => new RedisError("ERR weight value is not a float")));
			index += 1 + keys.length;
		} else if (option === "AGGREGATE") {
			const value = expectArg(args, index + 1).toLowerCase();
			if (value !== "sum" && value !== "min" && value !== "max") throw syntaxError();
			aggregate = value;
			index += 2;
		} else if (option === "WITHSCORES" && allowWithScores) {
			withScores = true;
			index++;
		} else throw syntaxError();
	}
	return {
		destination,
		keys,
		weights,
		aggregate,
		withScores
	};
};
const readScored = (ctx, key) => {
	const entry = ctx.db.get(key, ctx.now);
	if (!entry) return;
	if (entry.type === "zset") return new Map(entry.value.entries().map((e) => [e.member, e.score]));
	if (entry.type === "set") return new Map([...entry.value].map((m) => [m, 1]));
	throw new RedisError("WRONGTYPE Operation against a key holding the wrong kind of value");
};
const aggregateScores = (a, b, mode) => {
	if (mode === "min") return Math.min(a, b);
	if (mode === "max") return Math.max(a, b);
	const sum = a + b;
	return Number.isNaN(sum) ? 0 : sum;
};
const combine = (ctx, op, keys, weights, aggregate) => {
	const inputs = keys.map((key) => readScored(ctx, key) ?? /* @__PURE__ */ new Map());
	const result = new SortedSet();
	const weighted = (score, weight) => {
		const value = score * weight;
		return Number.isNaN(value) ? 0 : value;
	};
	if (op === "diff") {
		const first = inputs[0];
		for (const [member, score] of first) if (!inputs.slice(1).some((set) => set.has(member))) result.add(member, score);
		return result;
	}
	if (op === "union") {
		const scores = /* @__PURE__ */ new Map();
		inputs.forEach((set, i) => {
			for (const [member, score] of set) {
				const value = weighted(score, weights[i]);
				const current = scores.get(member);
				scores.set(member, current === void 0 ? value : aggregateScores(current, value, aggregate));
			}
		});
		for (const [member, score] of scores) result.add(member, score);
		return result;
	}
	const first = inputs[0];
	for (const [member, score] of first) {
		if (!inputs.every((set) => set.has(member))) continue;
		let total = weighted(score, weights[0]);
		for (let i = 1; i < inputs.length; i++) total = aggregateScores(total, weighted(inputs[i].get(member), weights[i]), aggregate);
		result.add(member, total);
	}
	return result;
};
const storeZSet = (ctx, destination, zset) => {
	ctx.db.delete(destination);
	if (zset.size > 0) ctx.db.set(destination, {
		type: "zset",
		value: zset
	});
	return int(zset.size);
};
const setOperation = (op, store) => ({
	name: `Z${op.toUpperCase()}${store ? "STORE" : ""}`,
	arity: store ? -4 : -3,
	write: store,
	handler: (ctx, args) => {
		const { destination, keys, weights, aggregate, withScores } = parseSetOperation(args, store, !store);
		if (op === "diff" && (args.includes("WEIGHTS") || args.includes("AGGREGATE"))) throw syntaxError();
		const result = combine(ctx, op, keys, weights, aggregate);
		if (store) return storeZSet(ctx, destination, result);
		return entriesReply([...result.entries()], withScores);
	}
});
const popExtreme = (ctx, args, side) => {
	if (args.length > 2) throw syntaxError();
	const key = args[0];
	const count = args[1] === void 0 ? void 0 : parseInteger(args[1]);
	if (count !== void 0 && count < 0) throw new RedisError("ERR value is out of range, must be positive");
	const zset = getZSet(ctx, key);
	if (!zset) return array([]);
	const n = Math.min(count ?? 1, zset.value.size);
	const popped = [];
	for (let i = 0; i < n; i++) {
		const entry = side === "min" ? zset.value.at(0) : zset.value.at(zset.value.size - 1);
		zset.value.remove(entry.member);
		popped.push(entry);
	}
	ctx.db.cleanup(key, zset);
	if (count === void 0) return array(popped.flatMap((e) => [bulk(e.member), double(e.score)]));
	return entriesReply(popped, true);
};
const removeRange = (ctx, key, entries) => {
	const zset = getZSet(ctx, key);
	if (!zset) return int(0);
	for (const entry of entries) zset.value.remove(entry.member);
	ctx.db.cleanup(key, zset);
	return int(entries.length);
};
const rank = (ctx, args, reverse) => {
	const withScore = args[2]?.toUpperCase() === "WITHSCORE";
	if (args.length > 3 || args.length === 3 && !withScore) throw syntaxError();
	const zset = getZSet(ctx, args[0]);
	const position = zset?.value.rank(args[1]);
	if (!zset || position === void 0) return withScore ? array(null) : NIL;
	const value = reverse ? zset.value.size - 1 - position : position;
	if (!withScore) return int(value);
	return array([int(value), double(zset.value.score(args[1]))]);
};
const commands = [
	{
		name: "ZADD",
		arity: -4,
		write: true,
		handler: zadd
	},
	{
		name: "ZREM",
		arity: -3,
		write: true,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]);
			if (!zset) return int(0);
			let removed = 0;
			for (const member of args.slice(1)) if (zset.value.remove(member)) removed++;
			ctx.db.cleanup(args[0], zset);
			return int(removed);
		}
	},
	{
		name: "ZSCORE",
		arity: 3,
		handler: (ctx, args) => {
			const score = getZSet(ctx, args[0])?.value.score(args[1]);
			return score === void 0 ? NIL : double(score);
		}
	},
	{
		name: "ZMSCORE",
		arity: -3,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]);
			return array(args.slice(1).map((member) => {
				const score = zset?.value.score(member);
				return score === void 0 ? NIL : double(score);
			}));
		}
	},
	{
		name: "ZCARD",
		arity: 2,
		handler: (ctx, args) => int(getZSet(ctx, args[0])?.value.size ?? 0)
	},
	{
		name: "ZCOUNT",
		arity: 4,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]);
			return int(zset ? rangeByScore(zset.value, parseScoreBound(args[1]), parseScoreBound(args[2])).length : 0);
		}
	},
	{
		name: "ZLEXCOUNT",
		arity: 4,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]);
			return int(zset ? rangeByLex(zset.value, parseLexBound(args[1]), parseLexBound(args[2])).length : 0);
		}
	},
	{
		name: "ZINCRBY",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const key = args[0];
			const delta = parseScore(args[1]);
			const zset = getOrCreateZSet(ctx, key);
			const next = (zset.value.score(args[2]) ?? 0) + delta;
			if (Number.isNaN(next)) throw new RedisError("ERR resulting score is not a number (NaN)");
			zset.value.add(args[2], next);
			ctx.db.touch(key);
			return double(next);
		}
	},
	{
		name: "ZRANK",
		arity: -3,
		handler: (ctx, args) => rank(ctx, args, false)
	},
	{
		name: "ZREVRANK",
		arity: -3,
		handler: (ctx, args) => rank(ctx, args, true)
	},
	{
		name: "ZRANGE",
		arity: -4,
		handler: (ctx, args) => {
			const options = parseRangeArgs(args.slice(3), {}, {
				by: true,
				rev: true,
				limit: true,
				withScores: true
			});
			return entriesReply(evaluateRange(getZSet(ctx, args[0])?.value, args[1], args[2], options), options.withScores);
		}
	},
	{
		name: "ZREVRANGE",
		arity: -4,
		handler: (ctx, args) => {
			const options = parseRangeArgs(args.slice(3), { rev: true }, {
				by: false,
				rev: false,
				limit: false,
				withScores: true
			});
			return entriesReply(evaluateRange(getZSet(ctx, args[0])?.value, args[1], args[2], options), options.withScores);
		}
	},
	{
		name: "ZRANGEBYSCORE",
		arity: -4,
		handler: (ctx, args) => {
			const options = parseRangeArgs(args.slice(3), { by: "score" }, {
				by: false,
				rev: false,
				limit: true,
				withScores: true
			});
			return entriesReply(evaluateRange(getZSet(ctx, args[0])?.value, args[1], args[2], options), options.withScores);
		}
	},
	{
		name: "ZREVRANGEBYSCORE",
		arity: -4,
		handler: (ctx, args) => {
			const options = parseRangeArgs(args.slice(3), {
				by: "score",
				rev: true
			}, {
				by: false,
				rev: false,
				limit: true,
				withScores: true
			});
			return entriesReply(evaluateRange(getZSet(ctx, args[0])?.value, args[1], args[2], options), options.withScores);
		}
	},
	{
		name: "ZRANGEBYLEX",
		arity: -4,
		handler: (ctx, args) => {
			const options = parseRangeArgs(args.slice(3), { by: "lex" }, {
				by: false,
				rev: false,
				limit: true,
				withScores: false
			});
			return entriesReply(evaluateRange(getZSet(ctx, args[0])?.value, args[1], args[2], options), false);
		}
	},
	{
		name: "ZREVRANGEBYLEX",
		arity: -4,
		handler: (ctx, args) => {
			const options = parseRangeArgs(args.slice(3), {
				by: "lex",
				rev: true
			}, {
				by: false,
				rev: false,
				limit: true,
				withScores: false
			});
			return entriesReply(evaluateRange(getZSet(ctx, args[0])?.value, args[1], args[2], options), false);
		}
	},
	{
		name: "ZRANGESTORE",
		arity: -5,
		write: true,
		handler: (ctx, args) => {
			const options = parseRangeArgs(args.slice(4), {}, {
				by: true,
				rev: true,
				limit: true,
				withScores: false
			});
			const entries = evaluateRange(getZSet(ctx, args[1])?.value, args[2], args[3], options);
			const result = new SortedSet();
			for (const entry of entries) result.add(entry.member, entry.score);
			return storeZSet(ctx, args[0], result);
		}
	},
	{
		name: "ZPOPMIN",
		arity: -2,
		write: true,
		handler: (ctx, args) => popExtreme(ctx, args, "min")
	},
	{
		name: "ZPOPMAX",
		arity: -2,
		write: true,
		handler: (ctx, args) => popExtreme(ctx, args, "max")
	},
	{
		name: "ZRANDMEMBER",
		arity: -2,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]);
			if (args.length === 1) {
				if (!zset) return NIL;
				return bulk(zset.value.at(randomIndex(zset.value.size)).member);
			}
			const count = parseInteger(args[1]);
			const withScores = args[2]?.toUpperCase() === "WITHSCORES";
			if (args.length > 3 || args.length === 3 && !withScores) throw syntaxError();
			if (!zset) return array([]);
			const entries = [...zset.value.entries()];
			const picked = count >= 0 ? shuffle(entries).slice(0, count) : Array.from({ length: -count }, () => entries[randomIndex(entries.length)]);
			return entriesReply(picked, withScores);
		}
	},
	setOperation("union", false),
	setOperation("inter", false),
	setOperation("diff", false),
	setOperation("union", true),
	setOperation("inter", true),
	setOperation("diff", true),
	{
		name: "ZINTERCARD",
		arity: -3,
		handler: (ctx, args) => {
			const numkeys = parseInteger(args[0]);
			if (numkeys <= 0) throw new RedisError("ERR numkeys should be greater than 0");
			const keys = args.slice(1, 1 + numkeys);
			if (keys.length !== numkeys) throw new RedisError("ERR Number of keys can't be greater than number of args");
			let limit = 0;
			if (args.length > 1 + numkeys) {
				if (args[1 + numkeys].toUpperCase() !== "LIMIT" || args.length !== 3 + numkeys) throw syntaxError();
				limit = parseInteger(expectArg(args, 2 + numkeys));
				if (limit < 0) throw new RedisError("ERR LIMIT can't be negative");
			}
			const size = combine(ctx, "inter", keys, keys.map(() => 1), "sum").size;
			return int(limit === 0 ? size : Math.min(size, limit));
		}
	},
	{
		name: "ZREMRANGEBYRANK",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]);
			return removeRange(ctx, args[0], zset ? rangeByRank(zset.value, parseInteger(args[1]), parseInteger(args[2])) : []);
		}
	},
	{
		name: "ZREMRANGEBYSCORE",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]);
			return removeRange(ctx, args[0], zset ? rangeByScore(zset.value, parseScoreBound(args[1]), parseScoreBound(args[2])) : []);
		}
	},
	{
		name: "ZREMRANGEBYLEX",
		arity: 4,
		write: true,
		handler: (ctx, args) => {
			const zset = getZSet(ctx, args[0]);
			return removeRange(ctx, args[0], zset ? rangeByLex(zset.value, parseLexBound(args[1]), parseLexBound(args[2])) : []);
		}
	},
	{
		name: "ZSCAN",
		arity: -3,
		handler: (ctx, args) => {
			const { match, count } = parseScanOptions(args.slice(2));
			const entries = [...getZSet(ctx, args[0])?.value.entries() ?? []];
			const { next, items } = entries.length <= 128 ? {
				next: "0",
				items: entries
			} : scanSlice(entries, args[1], count);
			const filtered = match === void 0 ? items : items.filter((e) => globMatch(match, e.member));
			return array([bulk(next), bulks(filtered.flatMap((e) => [e.member, formatDouble(e.score)]))]);
		}
	},
	{
		name: "ZMPOP",
		arity: -4,
		write: true,
		handler: () => {
			throw new RedisError("ERR the local redis server does not support ZMPOP");
		}
	},
	{
		name: "BZPOPMIN",
		arity: -3,
		write: true,
		handler: () => {
			throw new RedisError("ERR the local redis server does not support blocking sorted set commands");
		}
	},
	{
		name: "BZPOPMAX",
		arity: -3,
		write: true,
		handler: () => {
			throw new RedisError("ERR the local redis server does not support blocking sorted set commands");
		}
	}
];
//#endregion
//#region src/engine/lua.ts
const toBytes = (value) => Buffer.from(value, "latin1");
const fromBytes = (value) => value === null ? "" : Buffer.from(value.buffer, value.byteOffset, value.length).toString("latin1");
const luaString = (value) => to_luastring(value);
const REDIS_VERSION = "7.2.4";
const REDIS_VERSION_NUM = 459268;
const ERROR_HANDLER = `
local dbg = ...
return function(err)
	local i = dbg.getinfo(2, 'nSl')
	if i and i.what == 'C' then
		i = dbg.getinfo(3, 'nSl')
	end
	if type(err) ~= 'table' then
		err = { err = 'ERR ' .. tostring(err) }
	end
	if i and err['source'] == nil then
		err['source'] = i.source
		err['line'] = i.currentline
	end
	return err
end
`;
const PROTECT_GLOBALS = `
local mt = {}
mt.__newindex = function(t, n, v)
	error("Script attempted to create global variable '" .. tostring(n) .. "'", 2)
end
mt.__index = function(t, n)
	error("Script attempted to access nonexistent global variable '" .. tostring(n) .. "'", 2)
end
setmetatable(_G, mt)
`;
const NULL = { cjson: "null" };
var LuaRuntime = class LuaRuntime {
	engine;
	L;
	scripts = /* @__PURE__ */ new Map();
	errorHandlerRef;
	current = null;
	constructor(engine) {
		this.engine = engine;
		const L = lauxlib.luaL_newstate();
		this.L = L;
		for (const [name, open] of [
			["_G", lualib.luaopen_base],
			["string", lualib.luaopen_string],
			["table", lualib.luaopen_table],
			["math", lualib.luaopen_math]
		]) {
			lauxlib.luaL_requiref(L, luaString(name), open, 1);
			lua.lua_pop(L, 1);
		}
		for (const name of [
			"dofile",
			"loadfile",
			"load",
			"require",
			"collectgarbage",
			"print"
		]) {
			lua.lua_pushnil(L);
			lua.lua_setglobal(L, luaString(name));
		}
		lua.lua_atnativeerror(L, (L) => {
			const err = lua.lua_touserdata(L, 1);
			lua.lua_pushstring(L, luaString(err instanceof Error ? err.message : String(err)));
			return 1;
		});
		this.registerRedisLibrary();
		this.registerCjsonLibrary();
		lauxlib.luaL_requiref(L, luaString("debug"), lualib.luaopen_debug, 0);
		this.compile(ERROR_HANDLER, "redis_error_handler");
		lua.lua_pushvalue(L, -2);
		lua.lua_call(L, 1, 1);
		this.errorHandlerRef = lauxlib.luaL_ref(L, lua.LUA_REGISTRYINDEX);
		lua.lua_pop(L, 1);
		this.compile(PROTECT_GLOBALS, "protect_globals");
		lua.lua_call(L, 0, 0);
	}
	static sha1(body) {
		return createHash("sha1").update(Buffer.from(body, "latin1")).digest("hex");
	}
	exists(sha) {
		return this.scripts.has(sha);
	}
	load(body) {
		const sha = LuaRuntime.sha1(body);
		if (!this.scripts.has(sha)) {
			this.compile(body, "@user_script");
			const ref = lauxlib.luaL_ref(this.L, lua.LUA_REGISTRYINDEX);
			this.scripts.set(sha, {
				body,
				ref
			});
		}
		return sha;
	}
	flush() {
		for (const script of this.scripts.values()) lauxlib.luaL_unref(this.L, lua.LUA_REGISTRYINDEX, script.ref);
		this.scripts.clear();
	}
	run(sha, keys, argv, conn, readOnly) {
		const script = this.scripts.get(sha);
		if (!script) throw new RedisError("NOSCRIPT No matching script. Please use EVAL.");
		if (this.current) throw new RedisError("ERR This Redis command is not allowed from script");
		const L = this.L;
		const base = lua.lua_gettop(L);
		this.setGlobalArray("KEYS", keys);
		this.setGlobalArray("ARGV", argv);
		lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, this.errorHandlerRef);
		lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, script.ref);
		this.current = {
			...conn,
			multi: null,
			watches: [],
			subscriptions: {
				channels: /* @__PURE__ */ new Set(),
				patterns: /* @__PURE__ */ new Set(),
				shards: /* @__PURE__ */ new Set()
			},
			push: () => {},
			script: { readOnly }
		};
		try {
			if (lua.lua_pcall(L, 0, 1, base + 1) !== lua.LUA_OK) throw new RedisError(this.errorMessage(-1, sha));
			return this.toReply(-1);
		} finally {
			this.current = null;
			lua.lua_settop(L, base);
		}
	}
	compile(body, name) {
		const bytes = toBytes(body);
		if (lauxlib.luaL_loadbuffer(this.L, bytes, bytes.length, luaString(name)) !== lua.LUA_OK) {
			const message = fromBytes(lua.lua_tolstring(this.L, -1));
			lua.lua_pop(this.L, 1);
			throw new RedisError(`ERR Error compiling script (new function): ${message}`);
		}
	}
	setGlobalArray(name, values) {
		const L = this.L;
		lua.lua_pushglobaltable(L);
		lua.lua_pushstring(L, luaString(name));
		lua.lua_newtable(L);
		values.forEach((value, i) => {
			lua.lua_pushstring(L, toBytes(value));
			lua.lua_rawseti(L, -2, i + 1);
		});
		lua.lua_rawset(L, -3);
		lua.lua_pop(L, 1);
	}
	errorMessage(index, sha) {
		const L = this.L;
		const abs = lua.lua_absindex(L, index);
		if (lua.lua_type(L, abs) !== lua.LUA_TTABLE) {
			const text = lua.lua_tolstring(L, abs);
			return `ERR Error running script ${sha}: ${text === null ? "execution failure" : fromBytes(text)}`;
		}
		const field = (name) => {
			lua.lua_getfield(L, abs, luaString(name));
			const value = lua.lua_tolstring(L, -1);
			lua.lua_pop(L, 1);
			return value === null ? null : fromBytes(value);
		};
		const message = (field("err") ?? "ERR execution failure").replace(/\r?\n/g, " ");
		const source = field("source");
		const line = field("line");
		if (source && line) return `${message} script: ${sha}, on ${source}:${line}.`;
		return message;
	}
	pushReply(reply) {
		const L = this.L;
		reply = toResp2(reply);
		switch (reply.type) {
			case "status":
				lua.lua_newtable(L);
				lua.lua_pushstring(L, toBytes(reply.value));
				lua.lua_setfield(L, -2, luaString("ok"));
				break;
			case "error":
				lua.lua_newtable(L);
				lua.lua_pushstring(L, toBytes(reply.value));
				lua.lua_setfield(L, -2, luaString("err"));
				break;
			case "int": {
				const n = Number(reply.value);
				if (Number.isInteger(n) && n >= -2147483648 && n <= 2147483647) lua.lua_pushinteger(L, n);
				else lua.lua_pushnumber(L, n);
				break;
			}
			case "bulk":
				if (reply.value === null) lua.lua_pushboolean(L, false);
				else lua.lua_pushstring(L, toBytes(reply.value));
				break;
			case "array":
				if (reply.value === null) lua.lua_pushboolean(L, false);
				else {
					lua.lua_newtable(L);
					reply.value.forEach((item, i) => {
						this.pushReply(item);
						lua.lua_rawseti(L, -2, i + 1);
					});
				}
				break;
			default: lua.lua_pushboolean(L, false);
		}
	}
	toReply(index) {
		const L = this.L;
		const abs = lua.lua_absindex(L, index);
		const type = lua.lua_type(L, abs);
		if (type === lua.LUA_TSTRING) return bulk(fromBytes(lua.lua_tolstring(L, abs)));
		if (type === lua.LUA_TBOOLEAN) return lua.lua_toboolean(L, abs) ? int(1) : NIL;
		if (type === lua.LUA_TNUMBER) {
			const n = Math.trunc(lua.lua_tonumber(L, abs));
			return int(Number.isSafeInteger(n) ? n : BigInt(n));
		}
		if (type !== lua.LUA_TTABLE) return NIL;
		lua.lua_getfield(L, abs, luaString("err"));
		if (lua.lua_type(L, -1) === lua.LUA_TSTRING) {
			const message = fromBytes(lua.lua_tolstring(L, -1)).replace(/\r?\n/g, " ");
			lua.lua_pop(L, 1);
			return error(message);
		}
		lua.lua_pop(L, 1);
		lua.lua_getfield(L, abs, luaString("ok"));
		if (lua.lua_type(L, -1) === lua.LUA_TSTRING) {
			const message = fromBytes(lua.lua_tolstring(L, -1)).replace(/\r?\n/g, " ");
			lua.lua_pop(L, 1);
			return status(message);
		}
		lua.lua_pop(L, 1);
		const items = [];
		for (let i = 1;; i++) {
			lua.lua_rawgeti(L, abs, i);
			if (lua.lua_type(L, -1) === lua.LUA_TNIL) {
				lua.lua_pop(L, 1);
				break;
			}
			items.push(this.toReply(-1));
			lua.lua_pop(L, 1);
		}
		return {
			type: "array",
			value: items
		};
	}
	raiseError(message) {
		const L = this.L;
		lua.lua_newtable(L);
		lua.lua_pushstring(L, toBytes(message));
		lua.lua_setfield(L, -2, luaString("err"));
		lauxlib.luaL_where(L, 1);
		const where = fromBytes(lua.lua_tolstring(L, -1));
		lua.lua_pop(L, 1);
		const line = /:(\d+):/.exec(where)?.[1];
		if (line) {
			lua.lua_pushstring(L, luaString("@user_script"));
			lua.lua_setfield(L, -2, luaString("source"));
			lua.lua_pushstring(L, luaString(line));
			lua.lua_setfield(L, -2, luaString("line"));
		}
		return lua.lua_error(L);
	}
	call(raise) {
		const L = this.L;
		const n = lua.lua_gettop(L);
		const fail = (message) => {
			if (raise) return this.raiseError(message);
			this.pushReply(error(message));
			return 1;
		};
		if (n === 0) return fail("ERR Please specify at least one argument for this redis lib call");
		const argv = [];
		for (let i = 1; i <= n; i++) {
			const type = lua.lua_type(L, i);
			if (type === lua.LUA_TNUMBER) argv.push(formatLuaNumber(L, i));
			else if (type === lua.LUA_TSTRING) argv.push(fromBytes(lua.lua_tolstring(L, i)));
			else return fail("ERR Lua redis lib command arguments must be strings or integers");
		}
		let reply;
		try {
			reply = this.engine.call(argv, this.current);
		} catch (err) {
			if (err instanceof RedisError) return fail(err.message);
			throw err;
		}
		this.pushReply(reply);
		return 1;
	}
	registerRedisLibrary() {
		const L = this.L;
		lua.lua_newtable(L);
		const register = (name, fn) => {
			lua.lua_pushjsfunction(L, fn);
			lua.lua_setfield(L, -2, luaString(name));
		};
		register("call", () => this.call(true));
		register("pcall", () => this.call(false));
		register("sha1hex", (L) => {
			if (lua.lua_gettop(L) !== 1) return this.raiseError("ERR wrong number of arguments");
			const text = lua.lua_tolstring(L, 1);
			lua.lua_pushstring(L, luaString(LuaRuntime.sha1(fromBytes(text))));
			return 1;
		});
		register("error_reply", (L) => {
			const text = lua.lua_tolstring(L, 1);
			if (lua.lua_type(L, 1) !== lua.LUA_TSTRING || text === null) return this.raiseError("ERR wrong number or type of arguments");
			this.pushReply(error(fromBytes(text)));
			return 1;
		});
		register("status_reply", (L) => {
			const text = lua.lua_tolstring(L, 1);
			if (lua.lua_type(L, 1) !== lua.LUA_TSTRING || text === null) return this.raiseError("ERR wrong number or type of arguments");
			this.pushReply(status(fromBytes(text)));
			return 1;
		});
		register("log", (L) => {
			if (lua.lua_gettop(L) < 2) return this.raiseError("ERR redis.log() requires two arguments or more.");
			if (lua.lua_type(L, 1) !== lua.LUA_TNUMBER) return this.raiseError("ERR First argument must be a number (log level).");
			return 0;
		});
		register("replicate_commands", (L) => {
			lua.lua_pushboolean(L, 1);
			return 1;
		});
		register("setresp", (L) => {
			if (lua.lua_tonumber(L, 1) === 2) return 0;
			return this.raiseError("ERR the local redis server does not support RESP3 replies to scripts");
		});
		for (const [name, value] of [
			["LOG_DEBUG", 0],
			["LOG_VERBOSE", 1],
			["LOG_NOTICE", 2],
			["LOG_WARNING", 3],
			["REDIS_VERSION_NUM", REDIS_VERSION_NUM]
		]) {
			lua.lua_pushinteger(L, value);
			lua.lua_setfield(L, -2, luaString(name));
		}
		lua.lua_pushstring(L, luaString(REDIS_VERSION));
		lua.lua_setfield(L, -2, luaString("REDIS_VERSION"));
		lua.lua_setglobal(L, luaString("redis"));
	}
	registerCjsonLibrary() {
		const L = this.L;
		lua.lua_newtable(L);
		lua.lua_pushjsfunction(L, (L) => {
			if (lua.lua_gettop(L) !== 1) return this.raiseError("ERR bad argument #1 to encode (expected one argument)");
			const json = JSON.stringify(this.toJson(1, 0));
			lua.lua_pushstring(L, Buffer.from(json, "utf8"));
			return 1;
		});
		lua.lua_setfield(L, -2, luaString("encode"));
		lua.lua_pushjsfunction(L, (L) => {
			const text = lua.lua_tolstring(L, 1);
			if (lua.lua_type(L, 1) !== lua.LUA_TSTRING || text === null) return this.raiseError("ERR bad argument #1 to decode (string expected)");
			let value;
			try {
				value = JSON.parse(Buffer.from(text.buffer, text.byteOffset, text.length).toString("utf8"));
			} catch (err) {
				return this.raiseError(`ERR cjson.decode: ${err instanceof Error ? err.message : String(err)}`);
			}
			this.pushJson(value);
			return 1;
		});
		lua.lua_setfield(L, -2, luaString("decode"));
		lua.lua_pushlightuserdata(L, NULL);
		lua.lua_setfield(L, -2, luaString("null"));
		lua.lua_setglobal(L, luaString("cjson"));
	}
	pushJson(value) {
		const L = this.L;
		if (value === null || value === void 0) lua.lua_pushlightuserdata(L, NULL);
		else if (typeof value === "boolean") lua.lua_pushboolean(L, value);
		else if (typeof value === "number") {
			if (Number.isInteger(value) && value >= -2147483648 && value <= 2147483647) lua.lua_pushinteger(L, value);
			else lua.lua_pushnumber(L, value);
		} else if (typeof value === "string") lua.lua_pushstring(L, Buffer.from(value, "utf8"));
		else if (Array.isArray(value)) {
			lua.lua_newtable(L);
			value.forEach((item, i) => {
				this.pushJson(item);
				lua.lua_rawseti(L, -2, i + 1);
			});
		} else {
			lua.lua_newtable(L);
			for (const [key, item] of Object.entries(value)) {
				lua.lua_pushstring(L, Buffer.from(key, "utf8"));
				this.pushJson(item);
				lua.lua_rawset(L, -3);
			}
		}
	}
	toJson(index, depth) {
		const L = this.L;
		const abs = lua.lua_absindex(L, index);
		const type = lua.lua_type(L, abs);
		if (depth > 1e3) return this.raiseError("ERR Cannot serialise, excessive nesting (1001)");
		if (type === lua.LUA_TNIL || type === lua.LUA_TLIGHTUSERDATA) return null;
		if (type === lua.LUA_TBOOLEAN) return lua.lua_toboolean(L, abs);
		if (type === lua.LUA_TNUMBER) {
			const n = lua.lua_tonumber(L, abs);
			if (!Number.isFinite(n)) return this.raiseError("ERR Cannot serialise number: must not be NaN or Inf");
			return lua.lua_isinteger(L, abs) ? n : Number(formatG(n, 14));
		}
		if (type === lua.LUA_TSTRING) {
			const bytes = lua.lua_tolstring(L, abs);
			return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length).toString("utf8");
		}
		if (type !== lua.LUA_TTABLE) return this.raiseError(`ERR Cannot serialise ${type === lua.LUA_TFUNCTION ? "function" : "userdata"}: type not supported`);
		const object = {};
		const array = [];
		let isArray = true;
		let max = 0;
		lua.lua_pushnil(L);
		while (lua.lua_next(L, abs) !== 0) {
			const value = this.toJson(-1, depth + 1);
			if (lua.lua_type(L, -2) === lua.LUA_TNUMBER) {
				const key = lua.lua_tonumber(L, -2);
				if (Number.isInteger(key) && key > 0) {
					array[key - 1] = value;
					max = Math.max(max, key);
				} else isArray = false;
				object[formatLuaNumber(L, -2)] = value;
			} else {
				isArray = false;
				const key = lua.lua_tolstring(L, -2);
				object[Buffer.from(key.buffer, key.byteOffset, key.length).toString("utf8")] = value;
			}
			lua.lua_pop(L, 1);
		}
		if (isArray && max > 0) return Array.from({ length: max }, (_, i) => array[i] ?? null);
		return object;
	}
};
const formatLuaNumber = (L, index) => {
	if (lua.lua_isinteger(L, index)) return String(lua.lua_tointeger(L, index));
	const n = lua.lua_tonumber(L, index);
	return Number.isInteger(n) ? String(n) : formatG(n, 14);
};
//#endregion
//#region src/engine/engine.ts
const MULTI_PASSTHROUGH = /* @__PURE__ */ new Set([
	"EXEC",
	"DISCARD",
	"MULTI",
	"WATCH",
	"QUIT",
	"RESET"
]);
const SUBSCRIBED_ALLOWED = /* @__PURE__ */ new Set([
	"SUBSCRIBE",
	"UNSUBSCRIBE",
	"PSUBSCRIBE",
	"PUNSUBSCRIBE",
	"SSUBSCRIBE",
	"SUNSUBSCRIBE",
	"PING",
	"QUIT",
	"RESET"
]);
const toByteString = (value) => typeof value === "string" ? value : value.toString("latin1");
var RedisEngine = class {
	databases;
	clients = /* @__PURE__ */ new Set();
	channels = /* @__PURE__ */ new Map();
	patterns = /* @__PURE__ */ new Map();
	shards = /* @__PURE__ */ new Map();
	startedAt;
	port = 0;
	runId = Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
	stats = {
		connections: 0,
		commands: 0
	};
	commands = /* @__PURE__ */ new Map();
	nextClientId = 1;
	clock;
	sweeper;
	luaRuntime;
	defaultConnection;
	constructor(options = {}) {
		this.clock = options.now ?? Date.now;
		this.startedAt = this.clock();
		this.databases = Array.from({ length: options.databases ?? 16 }, (_, i) => new Database(i));
		for (const list of [
			commands$9,
			commands$10,
			commands$7,
			commands$2,
			commands$8,
			commands$6,
			commands$3,
			commands,
			commands$5,
			commands$1,
			commands$4
		]) for (const def of list) this.commands.set(def.name, def);
	}
	get now() {
		return this.clock();
	}
	get lua() {
		if (!this.luaRuntime) this.luaRuntime = new LuaRuntime(this);
		return this.luaRuntime;
	}
	commandNames() {
		return [...this.commands.keys()];
	}
	createConnection(push = () => {}) {
		const conn = {
			id: this.nextClientId++,
			createdAt: this.now,
			protocol: 2,
			db: 0,
			name: null,
			lib: {
				name: null,
				version: null
			},
			multi: null,
			watches: [],
			subscriptions: {
				channels: /* @__PURE__ */ new Set(),
				patterns: /* @__PURE__ */ new Set(),
				shards: /* @__PURE__ */ new Set()
			},
			push,
			quit: false,
			script: null
		};
		this.clients.add(conn);
		return conn;
	}
	releaseConnection(conn) {
		this.unsubscribeAll(conn);
		conn.watches = [];
		conn.multi = null;
		this.clients.delete(conn);
	}
	execute(args, conn) {
		if (!conn) conn = this.defaultConnection ??= this.createConnection();
		const argv = args.map(toByteString);
		const name = (argv[0] ?? "").toUpperCase();
		if (conn.multi && !MULTI_PASSTHROUGH.has(name)) {
			const def = this.commands.get(name);
			if (!def) {
				conn.multi.failed = true;
				return error(this.unknownCommandMessage(argv));
			}
			if (!this.checkArity(def, argv.length)) {
				conn.multi.failed = true;
				return error(arityError(def.name).message);
			}
			conn.multi.queue.push(argv);
			return status("QUEUED");
		}
		if (conn.protocol === 2 && this.isSubscribed(conn) && !SUBSCRIBED_ALLOWED.has(name)) return error(`ERR Can't execute '${name.toLowerCase()}': only (P|S)SUBSCRIBE / (P|S)UNSUBSCRIBE / PING / QUIT / RESET are allowed in this context`);
		try {
			return this.call(argv, conn);
		} catch (err) {
			if (err instanceof RedisError) return error(err.message);
			return error(`ERR internal error: ${err instanceof Error ? err.message : String(err)}`);
		}
	}
	call(argv, conn) {
		const name = (argv[0] ?? "").toUpperCase();
		const def = this.commands.get(name);
		if (!def) throw new RedisError(this.unknownCommandMessage(argv));
		if (!this.checkArity(def, argv.length)) throw arityError(def.name);
		if (conn.script) {
			if (def.noscript) throw new RedisError("ERR This Redis command is not allowed from script");
			if (conn.script.readOnly && def.write) throw new RedisError("ERR Write commands are not allowed from read-only scripts.");
		}
		const db = this.databases[conn.db];
		if (!db) throw new RedisError("ERR DB index is out of range");
		return def.handler({
			engine: this,
			conn,
			db,
			now: this.now
		}, argv.slice(1));
	}
	checkArity(def, count) {
		return def.arity < 0 ? count >= -def.arity : count === def.arity;
	}
	unknownCommandMessage(argv) {
		const rest = argv.slice(1).map((a) => `'${a}' `).join("");
		return `ERR unknown command '${argv[0] ?? ""}', with args beginning with: ${rest}`;
	}
	isSubscribed(conn) {
		const s = conn.subscriptions;
		return s.channels.size > 0 || s.patterns.size > 0 || s.shards.size > 0;
	}
	subscriptionCount(conn) {
		return conn.subscriptions.channels.size + conn.subscriptions.patterns.size;
	}
	subscribe(conn, name, kind) {
		conn.subscriptions[kind].add(name);
		const index = kind === "channels" ? this.channels : kind === "patterns" ? this.patterns : this.shards;
		let set = index.get(name);
		if (!set) {
			set = /* @__PURE__ */ new Set();
			index.set(name, set);
		}
		set.add(conn);
	}
	unsubscribe(conn, name, kind) {
		const had = conn.subscriptions[kind].delete(name);
		const index = kind === "channels" ? this.channels : kind === "patterns" ? this.patterns : this.shards;
		const set = index.get(name);
		if (set) {
			set.delete(conn);
			if (set.size === 0) index.delete(name);
		}
		return had;
	}
	unsubscribeAll(conn) {
		for (const kind of [
			"channels",
			"patterns",
			"shards"
		]) for (const name of [...conn.subscriptions[kind]]) this.unsubscribe(conn, name, kind);
	}
	publish(channel, message) {
		let count = 0;
		for (const conn of this.channels.get(channel) ?? []) {
			conn.push(push$1([
				bulk("message"),
				bulk(channel),
				bulk(message)
			]));
			count++;
		}
		for (const [pattern, conns] of this.patterns) if (globMatch(pattern, channel)) for (const conn of conns) {
			conn.push(push$1([
				bulk("pmessage"),
				bulk(pattern),
				bulk(channel),
				bulk(message)
			]));
			count++;
		}
		return count;
	}
	spublish(channel, message) {
		let count = 0;
		for (const conn of this.shards.get(channel) ?? []) {
			conn.push(push$1([
				bulk("smessage"),
				bulk(channel),
				bulk(message)
			]));
			count++;
		}
		return count;
	}
	flushAll() {
		for (const db of this.databases) db.flush();
	}
	startSweeper(interval = 100) {
		if (this.sweeper) return;
		this.sweeper = setInterval(() => {
			const now = this.now;
			for (const db of this.databases) db.sweep(now);
		}, interval);
		this.sweeper.unref?.();
	}
	stopSweeper() {
		if (this.sweeper) {
			clearInterval(this.sweeper);
			this.sweeper = void 0;
		}
	}
	keyspace() {
		return this.databases.filter((db) => db.size > 0).map((db) => ({
			index: db.index,
			keys: db.size,
			expires: db.expireCount
		}));
	}
};
//#endregion
//#region src/resp.ts
var ProtocolError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "ProtocolError";
	}
};
const CR = 13;
const LF = 10;
const findLine = (buffer, from) => {
	const index = buffer.indexOf(LF, from);
	if (index === -1) return -1;
	return index;
};
const splitInline = (line) => {
	const args = [];
	let i = 0;
	while (i < line.length) {
		while (i < line.length && /\s/.test(line[i])) i++;
		if (i >= line.length) break;
		const quote = line[i];
		if (quote === "\"" || quote === "'") {
			let value = "";
			i++;
			for (;;) {
				const c = line[i];
				if (c === void 0) throw new ProtocolError("unbalanced quotes in request");
				if (c === "\\" && quote === "\"" && i + 1 < line.length) {
					const next = line[i + 1];
					value += {
						n: "\n",
						r: "\r",
						t: "	",
						b: "\b",
						a: "\x07"
					}[next] ?? next;
					i += 2;
					continue;
				}
				if (c === quote) {
					i++;
					break;
				}
				value += c;
				i++;
			}
			args.push(value);
			continue;
		}
		let value = "";
		while (i < line.length && !/\s/.test(line[i])) {
			value += line[i];
			i++;
		}
		args.push(value);
	}
	return args;
};
var RespParser = class {
	buffer = Buffer.alloc(0);
	push(chunk) {
		this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
		const commands = [];
		let pos = 0;
		while (pos < this.buffer.length) {
			const result = this.buffer[pos] === 42 ? this.parseMultiBulk(pos) : this.parseInline(pos);
			if (!result) break;
			if (result.args.length > 0) commands.push(result.args);
			pos = result.end;
		}
		this.buffer = pos === 0 ? this.buffer : this.buffer.subarray(pos);
		return commands;
	}
	readLine(pos) {
		const lf = findLine(this.buffer, pos);
		if (lf === -1) return null;
		const cr = lf > pos && this.buffer[lf - 1] === CR ? lf - 1 : lf;
		return {
			text: this.buffer.toString("latin1", pos, cr),
			end: lf + 1
		};
	}
	parseInline(pos) {
		const line = this.readLine(pos);
		if (!line) return null;
		return {
			args: splitInline(line.text),
			end: line.end
		};
	}
	parseMultiBulk(pos) {
		const header = this.readLine(pos);
		if (!header) return null;
		const count = Number(header.text.slice(1));
		if (!Number.isInteger(count) || count > 1048576) throw new ProtocolError("invalid multibulk length");
		let cursor = header.end;
		const args = [];
		for (let i = 0; i < count; i++) {
			if (cursor >= this.buffer.length) return null;
			if (this.buffer[cursor] !== 36) throw new ProtocolError(`expected '$', got '${String.fromCharCode(this.buffer[cursor])}'`);
			const line = this.readLine(cursor);
			if (!line) return null;
			const length = Number(line.text.slice(1));
			if (!Number.isInteger(length) || length < 0 || length > 536870912) throw new ProtocolError("invalid bulk length");
			const start = line.end;
			const end = start + length;
			if (end + 2 > this.buffer.length) return null;
			args.push(this.buffer.toString("latin1", start, end));
			cursor = end + 2;
		}
		return {
			args,
			end: cursor
		};
	}
};
const sanitize = (text) => text.replace(/[\r\n]+/g, " ");
const encodeList = (items, protocol) => items.map((item) => encodeReply(item, protocol)).join("");
const encodePairs = (items, protocol) => items.map(([k, v]) => encodeReply(k, protocol) + encodeReply(v, protocol)).join("");
const encodeReply = (reply, protocol = 2) => {
	switch (reply.type) {
		case "status": return `+${sanitize(reply.value)}\r\n`;
		case "error": return `-${sanitize(reply.value)}\r\n`;
		case "int": return `:${reply.value}\r\n`;
		case "bulk":
			if (reply.value === null) return protocol === 3 ? "_\r\n" : "$-1\r\n";
			return `$${reply.value.length}\r\n${reply.value}\r\n`;
		case "array":
			if (reply.value === null) return protocol === 3 ? "_\r\n" : "*-1\r\n";
			return `*${reply.value.length}\r\n${encodeList(reply.value, protocol)}`;
		case "double": return protocol === 3 ? `,${formatDouble(reply.value)}\r\n` : encodeReply(toResp2(reply), protocol);
		case "map": return protocol === 3 ? `%${reply.value.length}\r\n${encodePairs(reply.value, protocol)}` : `*${reply.value.length * 2}\r\n${encodePairs(reply.value, protocol)}`;
		case "pairs": return protocol === 3 ? `*${reply.value.length}\r\n${reply.value.map(([k, v]) => `*2\r\n${encodeReply(k, 3)}${encodeReply(v, 3)}`).join("")}` : `*${reply.value.length * 2}\r\n${encodePairs(reply.value, protocol)}`;
		case "set": return `${protocol === 3 ? "~" : "*"}${reply.value.length}\r\n${encodeList(reply.value, protocol)}`;
		case "push": return `${protocol === 3 ? ">" : "*"}${reply.value.length}\r\n${encodeList(reply.value, protocol)}`;
		case "verbatim": return protocol === 3 ? `=${reply.value.length + 4}\r\ntxt:${reply.value}\r\n` : `$${reply.value.length}\r\n${reply.value}\r\n`;
		case "none": return "";
	}
};
//#endregion
//#region src/real-server.ts
var RealRedisServer = class {
	host;
	options;
	process;
	boundPort = 0;
	stopping = false;
	constructor(options = {}) {
		this.host = options.host ?? "127.0.0.1";
		this.options = options;
	}
	get port() {
		return this.boundPort;
	}
	async listen(port = this.options.port ?? 0) {
		if (this.process) throw new Error(`Redis server is already listening on port: ${this.boundPort}`);
		const { RedisMemoryServer } = await import("redis-memory-server");
		const args = [...this.options.args ?? []];
		if (this.options.databases !== void 0) args.push("--databases", String(this.options.databases));
		this.stopping = false;
		this.process = await RedisMemoryServer.create({
			instance: {
				port: port || void 0,
				args
			},
			binary: { version: this.options.version ?? "7.2.4" }
		});
		this.boundPort = await this.process.getPort();
	}
	onExit(handler) {
		this.process?.instanceInfoSync?.childProcess?.once("exit", (code, signal) => {
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
	async close() {
		if (!this.process) return;
		this.stopping = true;
		await this.process.stop();
		this.process = void 0;
		this.boundPort = 0;
	}
	async flushAll() {
		if (!this.process) return;
		await new Promise((resolve, reject) => {
			const socket = new Socket();
			socket.once("error", reject);
			socket.connect(this.boundPort, this.host, () => socket.write("FLUSHALL\r\n"));
			socket.once("data", (data) => {
				socket.destroy();
				data.toString().startsWith("+OK") ? resolve() : reject(new Error(data.toString().trim()));
			});
		});
	}
};
//#endregion
//#region src/server.ts
var MemoryRedisServer = class {
	host;
	engine;
	defaultPort;
	server;
	sockets = /* @__PURE__ */ new Set();
	boundPort = 0;
	constructor(options = {}) {
		this.host = options.host ?? "127.0.0.1";
		this.defaultPort = options.port ?? 0;
		this.engine = new RedisEngine({ databases: options.databases });
	}
	get port() {
		return this.boundPort;
	}
	async listen(port = this.defaultPort) {
		if (this.server) throw new Error(`Redis server is already listening on port: ${this.boundPort}`);
		const server = createServer((socket) => this.handle(socket));
		this.server = server;
		await new Promise((resolve, reject) => {
			const onError = (err) => {
				this.server = void 0;
				reject(err);
			};
			server.once("error", onError);
			server.listen(port, this.host, () => {
				server.off("error", onError);
				resolve();
			});
		});
		const address = server.address();
		this.boundPort = typeof address === "object" && address ? address.port : port;
		this.engine.port = this.boundPort;
		this.engine.startSweeper();
	}
	async close() {
		const server = this.server;
		if (!server) return;
		this.server = void 0;
		this.engine.stopSweeper();
		for (const socket of this.sockets) socket.destroy();
		this.sockets.clear();
		await new Promise((resolve) => server.close(() => resolve()));
		this.boundPort = 0;
		this.engine.port = 0;
	}
	flushAll() {
		this.engine.flushAll();
	}
	handle(socket) {
		this.sockets.add(socket);
		socket.setNoDelay(true);
		const parser = new RespParser();
		let pending = [];
		let processing = false;
		const write = (data) => {
			if (data === "") return;
			if (processing) pending.push(data);
			else if (!socket.destroyed) socket.write(Buffer.from(data, "latin1"));
		};
		const conn = this.engine.createConnection((reply) => write(encodeReply(reply, conn.protocol)));
		this.engine.stats.connections++;
		socket.on("data", (chunk) => {
			let commands;
			try {
				commands = parser.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "latin1"));
			} catch (err) {
				const message = err instanceof ProtocolError ? err.message : "invalid request";
				socket.write(Buffer.from(`-ERR Protocol error: ${message}\r\n`, "latin1"));
				socket.destroy();
				return;
			}
			processing = true;
			for (const args of commands) {
				this.engine.stats.commands++;
				write(encodeReply(this.engine.execute(args, conn), conn.protocol));
				if (conn.quit) break;
			}
			processing = false;
			const out = pending.join("");
			pending = [];
			if (out !== "" && !socket.destroyed) socket.write(Buffer.from(out, "latin1"));
			if (conn.quit) socket.end();
		});
		socket.on("close", () => {
			this.engine.releaseConnection(conn);
			this.sockets.delete(socket);
		});
		socket.on("error", () => {});
	}
};
//#endregion
//#region src/redis-server.ts
var RedisServer = class {
	engine;
	host;
	memory;
	real;
	constructor(options = {}) {
		this.engine = options.engine ?? "memory";
		this.host = options.host ?? "127.0.0.1";
		if (this.engine === "redis") this.real = new RealRedisServer(options);
		else this.memory = new MemoryRedisServer(options);
	}
	get port() {
		return this.memory?.port ?? this.real?.port ?? 0;
	}
	async listen(port) {
		await (this.memory ? this.memory.listen(port) : this.real.listen(port));
	}
	async close() {
		await (this.memory ? this.memory.close() : this.real.close());
	}
	flushAll() {
		if (this.memory) {
			this.memory.flushAll();
			return Promise.resolve();
		}
		return this.real.flushAll();
	}
	onExit(handler) {
		this.real?.onExit(handler);
	}
	onOutput(handler) {
		this.real?.onOutput(handler);
	}
};
//#endregion
export { MemoryRedisServer, ProtocolError, RealRedisServer, RedisEngine, RedisError, RedisServer, RespParser, encodeReply, globMatch, toResp2 };
