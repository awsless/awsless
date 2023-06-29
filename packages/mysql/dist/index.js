// src/mock.ts
import { requestPort } from "@heat/request-port";

// src/server/version.ts
var VERSION_8_0_32 = {
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
    // relative to datadir
    binlog_checksum: "CRC32",
    binlog_expire_logs_seconds: 0,
    max_binlog_size: "1M",
    innodb_buffer_pool_size: "128M",
    sql_mode: "NO_ENGINE_SUBSTITUTION,STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO"
  })
};

// src/server/download.ts
import { stat, mkdir } from "fs/promises";
import { resolve, join } from "path";
import findCacheDir from "find-cache-dir";
import decompress from "decompress";
var getFileName = (version) => {
  switch (process.platform) {
    case "win32":
      return `mysql-${version}-winx64.zip`;
    case "darwin":
      return `mysql-${version}-macos13-arm64.tar.gz`;
    default:
      return `mysql-${version}-linux-glibc2.12-x86_64.tar.xz`;
  }
};
var getDownloadPath = () => {
  return resolve(
    findCacheDir({
      name: "@awsless/mysql",
      cwd: process.cwd()
    }) || ""
  );
};
var exists = async (path2) => {
  try {
    await stat(path2);
  } catch (error) {
    console.log(error);
    return false;
  }
  return true;
};
var download = async (version) => {
  const path2 = getDownloadPath();
  const name = `mysql-${version}`;
  const file = join(path2, name);
  if (await exists(file)) {
    return file;
  }
  console.log(`Downloading MySQL ${version}`);
  const url = `https://downloads.mysql.com/archives/get/p/23/file/${getFileName(version)}`;
  const response = await fetch(url, { method: "GET" });
  const data = await response.arrayBuffer();
  const buffer = Buffer.from(data);
  await mkdir(path2, { recursive: true, mode: "0777" });
  await decompress(buffer, path2, {
    map: (file2) => {
      file2.path = `${name}/${file2.path}`;
      return file2;
    },
    strip: 1
  });
  return file;
};

// src/server/launch.ts
import { spawn } from "child_process";
import { rm, mkdir as mkdir2 } from "fs/promises";
import { join as join2 } from "path";
var launch = async ({
  path: path2,
  host,
  port,
  version,
  debug = false
}) => {
  const cacheDir = join2(path2, "cache", String(port));
  await rm(cacheDir, { recursive: true, force: true });
  await mkdir2(cacheDir, { recursive: true });
  const binary = join2(path2, "bin/mysqld");
  const killInit = await spawnProcess({
    debug,
    binary,
    args: [
      "--initialize-insecure",
      "--explicit_defaults_for_timestamp",
      `--basedir=${path2}`,
      `--datadir=${cacheDir}/data`
    ],
    assertStarted: (line) => line.includes("shutting down mysqld")
  });
  await killInit();
  return spawnProcess({
    debug,
    binary,
    args: [
      // `--bind-address=${host}`,
      // `--port=${port}`,
      // `--basedir=${path}`,
      // `--datadir=${cacheDir}/data`,
      "--explicit_defaults_for_timestamp",
      ...Object.entries(version.settings({ port, host, cacheDir })).map(
        ([key, value]) => `--${key}=${value}`
      )
    ],
    assertStarted: version.started,
    cleanup: async () => await rm(cacheDir, {
      recursive: true,
      force: true,
      maxRetries: 100,
      retryDelay: 50
    })
  });
};
var spawnProcess = ({
  debug = false,
  binary,
  args,
  assertStarted,
  cleanup
}) => {
  return new Promise(async (resolve2, reject) => {
    const child = spawn(binary, args);
    const onError = (error) => fail(error);
    const onMessage = (message) => {
      const line = message.toString("utf8").toLowerCase();
      if (debug) {
        console.log(line);
      }
      if (assertStarted(line)) {
        done();
      }
    };
    const kill = async () => {
      await new Promise(async (resolve3) => {
        if (cleanup)
          await cleanup();
        child.once(`exit`, () => {
          resolve3(void 0);
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
      resolve2(kill);
    };
    const fail = async (error) => {
      off();
      await kill();
      reject(new Error(error));
    };
    on();
  });
};

// src/server/wait.ts
import { sleepAwait } from "sleep-await";

// src/client.ts
import { Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
var optionOverrides = {};
var overrideOptions = (options) => {
  optionOverrides = options;
};
var mysqlClient = (options) => {
  return new Kysely({
    dialect: new MysqlDialect({
      pool: createPool({
        connectionLimit: 1,
        enableKeepAlive: false,
        waitForConnections: false,
        idleTimeout: 200,
        ...options,
        ...optionOverrides
      })
    })
  });
};

// src/server/wait.ts
var ping = async () => {
  const client = mysqlClient({});
  try {
    const result = await client.introspection.getTables();
    return result.length === 0;
  } catch (error) {
    console.log(error);
    return false;
  }
};
var wait = async (times = 10) => {
  for (let count = 0; count < times; count++) {
    if (await ping()) {
      return;
    }
    await sleepAwait(100 * count);
  }
  throw new Error("MySQL server is unavailable.");
};

// src/commands.ts
import { FileMigrationProvider, Migrator, sql } from "kysely";
import { promises as fs } from "fs";
import path from "path";
var command = async (options, callback) => {
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
var migrate = async (migrations, options) => {
  await Promise.all(
    Object.entries(migrations).map(async ([database]) => {
      await command(options, async (client) => {
        await sql`CREATE DATABASE ${sql.raw(database)}`.execute(client);
      });
    })
  );
  const results = await Promise.all(
    Object.entries(migrations).map(async ([database, migrationFolder]) => {
      return command({ database, ...options }, async (client) => {
        const migrator = new Migrator({
          db: client,
          provider: new FileMigrationProvider({
            fs,
            path,
            migrationFolder
          })
        });
        const { error, results: results2 } = await migrator.migrateToLatest();
        if (error) {
          throw error;
        }
        return results2;
      });
    })
  );
  const object = {};
  Object.entries(migrations).map(([database], i) => {
    object[database] = results[i];
  });
  return object;
};

// src/mock.ts
var mockMysql = ({ migrations, version = VERSION_8_0_32, debug = false } = {}) => {
  let kill;
  let releasePort;
  beforeAll && beforeAll(async () => {
    const [port, release] = await requestPort();
    releasePort = release;
    const host = "localhost";
    const path2 = await download(version.version);
    kill = await launch({
      path: path2,
      port,
      host,
      version,
      debug
    });
    overrideOptions({
      port,
      host,
      user: "root"
    });
    await wait();
    if (migrations) {
      await migrate(migrations, {});
    }
  });
  afterAll && afterAll(async () => {
    await kill();
    await releasePort();
  });
};
export {
  command,
  mockMysql,
  mysqlClient
};
