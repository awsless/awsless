"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  command: () => command,
  migrate: () => migrate,
  mockMysql: () => mockMysql,
  mysqlClient: () => mysqlClient
});
module.exports = __toCommonJS(src_exports);

// src/mock.ts
var import_request_port = require("@heat/request-port");

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
var import_promises = require("fs/promises");
var import_path = require("path");
var import_find_cache_dir = __toESM(require("find-cache-dir"), 1);
var import_decompress = __toESM(require("decompress"), 1);
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
  return (0, import_path.resolve)(
    (0, import_find_cache_dir.default)({
      name: "@awsless/mysql",
      cwd: process.cwd()
    }) || ""
  );
};
var exists = async (path2) => {
  try {
    await (0, import_promises.stat)(path2);
  } catch (error) {
    console.log(error);
    return false;
  }
  return true;
};
var download = async (version) => {
  const path2 = getDownloadPath();
  const name = `mysql-${version}`;
  const file = (0, import_path.join)(path2, name);
  if (await exists(file)) {
    return file;
  }
  console.log(`Downloading MySQL ${version}`);
  const url = `https://downloads.mysql.com/archives/get/p/23/file/${getFileName(version)}`;
  const response = await fetch(url, { method: "GET" });
  const data = await response.arrayBuffer();
  const buffer = Buffer.from(data);
  await (0, import_promises.mkdir)(path2, { recursive: true, mode: "0777" });
  await (0, import_decompress.default)(buffer, path2, {
    map: (file2) => {
      file2.path = `${name}/${file2.path}`;
      return file2;
    },
    strip: 1
  });
  return file;
};

// src/server/launch.ts
var import_child_process = require("child_process");
var import_promises2 = require("fs/promises");
var import_path2 = require("path");
var launch = async ({
  path: path2,
  host,
  port,
  version,
  debug = false
}) => {
  const cacheDir = (0, import_path2.join)(path2, "cache", String(port));
  await (0, import_promises2.rm)(cacheDir, { recursive: true, force: true });
  await (0, import_promises2.mkdir)(cacheDir, { recursive: true });
  const binary = (0, import_path2.join)(path2, "bin/mysqld");
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
    cleanup: async () => await (0, import_promises2.rm)(cacheDir, {
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
    const child = (0, import_child_process.spawn)(binary, args);
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
var import_sleep_await = require("sleep-await");

// src/client.ts
var import_kysely = require("kysely");
var import_mysql2 = require("mysql2");
var optionOverrides = {};
var overrideOptions = (options) => {
  optionOverrides = options;
};
var mysqlClient = (options) => {
  return new import_kysely.Kysely({
    dialect: new import_kysely.MysqlDialect({
      pool: (0, import_mysql2.createPool)({
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
    await (0, import_sleep_await.sleepAwait)(100 * count);
  }
  throw new Error("MySQL server is unavailable.");
};

// src/commands.ts
var import_kysely2 = require("kysely");
var import_fs = require("fs");
var import_path3 = __toESM(require("path"), 1);
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
        await import_kysely2.sql`CREATE DATABASE ${import_kysely2.sql.raw(database)}`.execute(client);
      });
    })
  );
  const results = await Promise.all(
    Object.entries(migrations).map(async ([database, migrationFolder]) => {
      return command({ database, ...options }, async (client) => {
        const migrator = new import_kysely2.Migrator({
          db: client,
          provider: new import_kysely2.FileMigrationProvider({
            fs: import_fs.promises,
            path: import_path3.default,
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
    const [port, release] = await (0, import_request_port.requestPort)();
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  command,
  migrate,
  mockMysql,
  mysqlClient
});
