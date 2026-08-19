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
let _heat_request_port = require("@heat/request-port");
let fs_promises = require("fs/promises");
let path = require("path");
path = __toESM(path, 1);
let find_cache_dir = require("find-cache-dir");
find_cache_dir = __toESM(find_cache_dir, 1);
let decompress = require("decompress");
decompress = __toESM(decompress, 1);
let child_process = require("child_process");
let sleep_await = require("sleep-await");
let kysely = require("kysely");
let mysql2 = require("mysql2");
let fs = require("fs");
//#region src/server/version.ts
const VERSION_8_0_32 = {
	version: "8.0.32",
	started: (line) => line.includes("mysql community server - gpl"),
	settings: ({ port, cacheDir }) => ({
		port,
		basedir: "./",
		datadir: `${cacheDir}/data`,
		server_id: 1,
		default_time_zone: "+00:00",
		binlog_format: "row",
		log_bin: "mysql-bin.log",
		binlog_checksum: "CRC32",
		binlog_expire_logs_seconds: 0,
		max_binlog_size: "1M",
		innodb_buffer_pool_size: "128M",
		sql_mode: "NO_ENGINE_SUBSTITUTION,STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO"
	})
};
//#endregion
//#region src/server/download.ts
const getFileName = (version) => {
	switch (process.platform) {
		case "win32": return `mysql-${version}-winx64.zip`;
		case "darwin": return `mysql-${version}-macos13-arm64.tar.gz`;
		default: return `mysql-${version}-linux-glibc2.12-x86_64.tar.xz`;
	}
};
const getDownloadPath = () => {
	return (0, path.resolve)((0, find_cache_dir.default)({
		name: "@awsless/mysql",
		cwd: process.cwd()
	}) || "");
};
const exists = async (path$3) => {
	try {
		await (0, fs_promises.stat)(path$3);
	} catch (error) {
		console.log(error);
		return false;
	}
	return true;
};
const download = async (version) => {
	const path$4 = getDownloadPath();
	const name = `mysql-${version}`;
	const file = (0, path.join)(path$4, name);
	if (await exists(file)) return file;
	console.log(`Downloading MySQL ${version}`);
	const url = `https://downloads.mysql.com/archives/get/p/23/file/${getFileName(version)}`;
	const data = await (await fetch(url, { method: "GET" })).arrayBuffer();
	const buffer = Buffer.from(data);
	await (0, fs_promises.mkdir)(path$4, {
		recursive: true,
		mode: "0777"
	});
	await (0, decompress.default)(buffer, path$4, {
		map: (file) => {
			file.path = `${name}/${file.path}`;
			return file;
		},
		strip: 1
	});
	return file;
};
//#endregion
//#region src/server/launch.ts
const launch = async ({ path: path$2, host, port, version, debug = false }) => {
	const cacheDir = (0, path.join)(path$2, "cache", String(port));
	await (0, fs_promises.rm)(cacheDir, {
		recursive: true,
		force: true
	});
	await (0, fs_promises.mkdir)(cacheDir, { recursive: true });
	const binary = (0, path.join)(path$2, "bin/mysqld");
	await (await spawnProcess({
		debug,
		binary,
		args: [
			"--initialize-insecure",
			"--explicit_defaults_for_timestamp",
			`--basedir=${path$2}`,
			`--datadir=${cacheDir}/data`
		],
		assertStarted: (line) => line.includes("shutting down mysqld")
	}))();
	return spawnProcess({
		debug,
		binary,
		args: ["--explicit_defaults_for_timestamp", ...Object.entries(version.settings({
			port,
			host,
			cacheDir
		})).map(([key, value]) => `--${key}=${value}`)],
		assertStarted: version.started,
		cleanup: async () => await (0, fs_promises.rm)(cacheDir, {
			recursive: true,
			force: true,
			maxRetries: 100,
			retryDelay: 50
		})
	});
};
const spawnProcess = ({ debug = false, binary, args, assertStarted, cleanup }) => {
	return new Promise(async (resolve, reject) => {
		const child = (0, child_process.spawn)(binary, args);
		const onError = (error) => fail(error);
		const onMessage = (message) => {
			const line = message.toString("utf8").toLowerCase();
			if (debug) console.log(line);
			if (assertStarted(line)) done();
		};
		const kill = async () => {
			await new Promise(async (resolve) => {
				if (cleanup) await cleanup();
				child.once(`exit`, () => {
					resolve(void 0);
				});
				child.kill();
			});
		};
		process.on("beforeExit", async () => {
			off();
			await kill();
		});
		const off = () => {
			child.stderr.off("data", onMessage);
			child.stdout.off("data", onMessage);
			child.off("error", onError);
		};
		const on = () => {
			child.stderr.on("data", onMessage);
			child.stdout.on("data", onMessage);
			child.on("error", onError);
		};
		const done = async () => {
			off();
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
//#region src/client.ts
let optionOverrides = {};
const overrideOptions = (options) => {
	optionOverrides = options;
};
const mysqlClient = (options) => {
	return new kysely.Kysely({ dialect: new kysely.MysqlDialect({ pool: (0, mysql2.createPool)({
		connectionLimit: 1,
		enableKeepAlive: false,
		waitForConnections: false,
		idleTimeout: 200,
		...options,
		...optionOverrides
	}) }) });
};
//#endregion
//#region src/server/wait.ts
const ping = async () => {
	const client = mysqlClient({});
	try {
		return (await client.introspection.getTables()).length === 0;
	} catch (error) {
		console.log(error);
		return false;
	}
};
const wait = async (times = 10) => {
	for (let count = 0; count < times; count++) {
		if (await ping()) return;
		await (0, sleep_await.sleepAwait)(100 * count);
	}
	throw new Error("MySQL server is unavailable.");
};
//#endregion
//#region src/commands.ts
const command = async (options, callback) => {
	const client = mysqlClient(options);
	let result;
	try {
		result = await callback(client);
	} catch (error) {
		throw error;
	} finally {
		await client.destroy();
	}
	return result;
};
const migrate = async (migrations, options = {}) => {
	await Promise.all(Object.entries(migrations).map(async ([database]) => {
		await command(options, async (client) => {
			await kysely.sql`CREATE DATABASE ${kysely.sql.raw(database)}`.execute(client);
		});
	}));
	const results = await Promise.all(Object.entries(migrations).map(async ([database, migrationFolder]) => {
		return command({
			database,
			...options
		}, async (client) => {
			const { error, results } = await new kysely.Migrator({
				db: client,
				provider: new kysely.FileMigrationProvider({
					fs: fs.promises,
					path: path.default,
					migrationFolder
				})
			}).migrateToLatest();
			if (error) throw error;
			return results;
		});
	}));
	const object = {};
	Object.entries(migrations).map(([database], i) => {
		object[database] = results[i];
	});
	return object;
};
//#endregion
//#region src/mock.ts
const mockMysql = ({ migrations, version = VERSION_8_0_32, debug = false } = {}) => {
	let kill;
	let releasePort;
	beforeAll && beforeAll(async () => {
		const [port, release] = await (0, _heat_request_port.requestPort)();
		releasePort = release;
		const host = "localhost";
		const path = await download(version.version);
		kill = await launch({
			path,
			port,
			host,
			version,
			debug
		});
		overrideOptions({
			port,
			host,
			user: "root",
			password: void 0
		});
		await wait();
		if (migrations) await migrate(migrations);
	}, 6e4);
	afterAll && afterAll(async () => {
		await kill?.();
		await releasePort?.();
	});
};
//#endregion
exports.command = command;
exports.migrate = migrate;
exports.mockMysql = mockMysql;
exports.mysqlClient = mysqlClient;
