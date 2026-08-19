import { requestPort } from "@heat/request-port";
import { mkdir, rm, stat } from "fs/promises";
import path, { join, resolve } from "path";
import findCacheDir from "find-cache-dir";
import decompress from "decompress";
import { spawn } from "child_process";
import { sleepAwait } from "sleep-await";
import { FileMigrationProvider, Kysely, Migrator, MysqlDialect, sql } from "kysely";
import { createPool } from "mysql2";
import { promises } from "fs";
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
	return resolve(findCacheDir({
		name: "@awsless/mysql",
		cwd: process.cwd()
	}) || "");
};
const exists = async (path) => {
	try {
		await stat(path);
	} catch (error) {
		console.log(error);
		return false;
	}
	return true;
};
const download = async (version) => {
	const path = getDownloadPath();
	const name = `mysql-${version}`;
	const file = join(path, name);
	if (await exists(file)) return file;
	console.log(`Downloading MySQL ${version}`);
	const url = `https://downloads.mysql.com/archives/get/p/23/file/${getFileName(version)}`;
	const data = await (await fetch(url, { method: "GET" })).arrayBuffer();
	const buffer = Buffer.from(data);
	await mkdir(path, {
		recursive: true,
		mode: "0777"
	});
	await decompress(buffer, path, {
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
const launch = async ({ path, host, port, version, debug = false }) => {
	const cacheDir = join(path, "cache", String(port));
	await rm(cacheDir, {
		recursive: true,
		force: true
	});
	await mkdir(cacheDir, { recursive: true });
	const binary = join(path, "bin/mysqld");
	await (await spawnProcess({
		debug,
		binary,
		args: [
			"--initialize-insecure",
			"--explicit_defaults_for_timestamp",
			`--basedir=${path}`,
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
		cleanup: async () => await rm(cacheDir, {
			recursive: true,
			force: true,
			maxRetries: 100,
			retryDelay: 50
		})
	});
};
const spawnProcess = ({ debug = false, binary, args, assertStarted, cleanup }) => {
	return new Promise(async (resolve, reject) => {
		const child = spawn(binary, args);
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
	return new Kysely({ dialect: new MysqlDialect({ pool: createPool({
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
		await sleepAwait(100 * count);
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
			await sql`CREATE DATABASE ${sql.raw(database)}`.execute(client);
		});
	}));
	const results = await Promise.all(Object.entries(migrations).map(async ([database, migrationFolder]) => {
		return command({
			database,
			...options
		}, async (client) => {
			const { error, results } = await new Migrator({
				db: client,
				provider: new FileMigrationProvider({
					fs: promises,
					path,
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
		const [port, release] = await requestPort();
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
export { command, migrate, mockMysql, mysqlClient };
