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
  array: () => array,
  bigfloat: () => bigfloat,
  bigint: () => bigint,
  boolean: () => boolean,
  date: () => date,
  define: () => define,
  deleteItem: () => deleteItem,
  enums: () => enums,
  indexItem: () => indexItem,
  migrate: () => migrate,
  mockOpenSearch: () => mockOpenSearch,
  number: () => number,
  object: () => object,
  search: () => search,
  searchClient: () => searchClient,
  set: () => set,
  string: () => string,
  uuid: () => uuid
});
module.exports = __toCommonJS(src_exports);

// src/client.ts
var import_opensearch = require("@opensearch-project/opensearch");
var import_aws_opensearch_connector = __toESM(require("aws-opensearch-connector"), 1);
var client;
var searchClient = async () => {
  if (!client) {
    client = new import_opensearch.Client({
      ...(0, import_aws_opensearch_connector.default)({
        region: process.env.AWS_REGION
        // credentials: await fromEnv()(),
      }),
      node: "https://" + process.env.SEARCH_DOMAIN
    });
  }
  return client;
};
var mockClient = (host, port) => {
  client = new import_opensearch.Client({ node: `http://${host}:${port}` });
};

// src/mock.ts
var import_request_port = require("@heat/request-port");

// src/server/download.ts
var import_promises = require("fs/promises");
var import_path = require("path");
var import_find_cache_dir = __toESM(require("find-cache-dir"), 1);
var import_decompress = __toESM(require("decompress"), 1);
var getArchiveName = (version) => {
  switch (process.platform) {
    case "win32":
      return `opensearch-${version}-windows-arm64.zip`;
    default:
      return `opensearch-${version}-linux-x64.tar.gz`;
  }
};
var getDownloadPath = () => {
  return (0, import_path.resolve)((0, import_find_cache_dir.default)({
    name: "@awsless/open-search",
    cwd: process.cwd()
  }) || "");
};
var exists = async (path) => {
  try {
    await (0, import_promises.stat)(path);
  } catch (error) {
    return false;
  }
  return true;
};
var download = async (version) => {
  const path = getDownloadPath();
  const name = `opensearch-${version}`;
  const file = (0, import_path.join)(path, name);
  if (await exists(file)) {
    return file;
  }
  console.log(`Downloading OpenSearch ${version}`);
  const url = `https://artifacts.opensearch.org/releases/bundle/opensearch/${version}/${getArchiveName(version)}`;
  const response = await fetch(url, { method: "GET" });
  const data = await response.arrayBuffer();
  const buffer = Buffer.from(data);
  await (0, import_promises.mkdir)(path, { recursive: true, mode: "0777" });
  await (0, import_decompress.default)(buffer, path);
  return file;
};

// src/server/launch.ts
var import_child_process = require("child_process");
var import_promises2 = require("fs/promises");
var import_path2 = require("path");
var exists2 = async (path) => {
  try {
    await (0, import_promises2.stat)(path);
  } catch (error) {
    return false;
  }
  return true;
};
var parseSettings = (settings) => {
  return Object.entries(settings).map(([key, value]) => {
    return ["-E", `${key}=${value}`];
  }).flat();
};
var launch = ({ path, host, port, version, debug }) => {
  return new Promise(async (resolve2, reject) => {
    const binary = (0, import_path2.join)(path, "bin/opensearch");
    const child = (0, import_child_process.spawn)(binary, parseSettings(version.settings({ host, port })));
    const onError = (error) => fail(error);
    const onStandardError = (error) => console.error(error.toString("utf8"));
    const onStandardOut = (message) => {
      const line = message.toString("utf8").toLowerCase();
      if (debug) {
        console.log(line);
      }
      if (version.started(line)) {
        done();
      }
    };
    const kill = () => {
      return new Promise((resolve3) => {
        child.once(`exit`, () => {
          resolve3();
        });
        child.kill();
      });
    };
    process.on("beforeExit", async () => {
      off();
      await kill();
      await cleanUp();
    });
    const cleanUp = async () => {
      const data = (0, import_path2.join)(path, `data/${port}`);
      if (await exists2(data)) {
        await (0, import_promises2.rm)(data, {
          recursive: true
        });
      }
    };
    const off = () => {
      child.stderr.off("data", onStandardError);
      child.stdout.off("data", onStandardOut);
      child.off("error", onError);
    };
    const on = () => {
      child.stderr.on("data", onStandardError);
      child.stdout.on("data", onStandardOut);
      child.on("error", onError);
    };
    const done = async () => {
      off();
      await cleanUp();
      resolve2(kill);
    };
    const fail = async (error) => {
      off();
      await kill();
      await cleanUp();
      reject(new Error(error));
    };
    await cleanUp();
    on();
  });
};

// src/server/wait.ts
var import_sleep_await = require("sleep-await");
var ping = async () => {
  const client2 = await searchClient();
  try {
    const result = await client2.cat.indices({ format: "json" });
    return result.statusCode === 200 && result.body.length === 0;
  } catch (error) {
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
  throw new Error("ElasticSearch server is unavailable");
};

// src/server/version.ts
var VERSION_2_8_0 = {
  version: "2.8.0",
  started: (line) => line.includes("started"),
  settings: ({ port, host }) => ({
    // 'discovery.type': 'single-node',
    "http.host": host,
    "http.port": port,
    "path.data": `data/${port}/data`,
    "path.logs": `data/${port}/logs`,
    // 'plugins.performanceanalyzer.disabled': true,
    "plugins.security.disabled": true
  })
};

// src/mock.ts
var mockOpenSearch = ({ version = VERSION_2_8_0, debug = false } = {}) => {
  beforeAll && beforeAll(async () => {
    const [port, release] = await (0, import_request_port.requestPort)();
    const host = "localhost";
    const path = await download(version.version);
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
  }, 100 * 1e3);
};

// src/table.ts
var define = (index, schema) => {
  return {
    index,
    schema
  };
};

// src/ops/index-item.ts
var indexItem = async (table, id, item, { refresh = true } = {}) => {
  const client2 = await searchClient();
  await client2.index({
    index: table.index,
    id,
    refresh,
    body: table.schema.encode(item)
  });
};

// src/ops/delete-item.ts
var deleteItem = async (table, id, { refresh = true } = {}) => {
  const client2 = await searchClient();
  await client2.delete({
    index: table.index,
    id,
    refresh
  });
};

// src/ops/migrate.ts
var migrate = async (table) => {
  const client2 = await searchClient();
  const result = await client2.cat.indices({ format: "json" });
  const found = result.body.find((item) => {
    return item.index === table.index;
  });
  if (!found) {
    await client2.indices.create({
      index: table.index
    });
  }
  await client2.indices.putMapping({
    index: table.index,
    body: {
      ...table.schema.props
    }
  });
};

// src/ops/search.ts
var encodeCursor = (cursor) => {
  const json = JSON.stringify(cursor);
  return Buffer.from(json, "utf8").toString("base64");
};
var decodeCursor = (cursor) => {
  if (!cursor)
    return;
  try {
    const json = Buffer.from(cursor, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return;
  }
};
var search = async (table, { query, limit = 10, cursor, sort }) => {
  const client2 = await searchClient();
  const result = await client2.search({
    index: table.index,
    body: {
      size: limit + 1,
      search_after: decodeCursor(cursor),
      query,
      sort
    }
  });
  const { hits, total } = result.body.hits;
  let nextCursor;
  if (hits.length > limit) {
    nextCursor = encodeCursor(hits[limit - 1].sort);
  }
  const items = hits.splice(0, limit);
  return {
    cursor: nextCursor,
    found: total.value,
    count: items.length,
    items: items.map((item) => {
      return table.schema.decode(item._source);
    })
  };
};

// src/structs/struct.ts
var Struct = class {
  constructor(encode, decode, props) {
    this.encode = encode;
    this.decode = decode;
    this.props = props;
  }
};

// src/structs/array.ts
var array = (struct) => {
  return new Struct(
    (input) => input.map((item) => struct.encode(item)),
    (encoded) => encoded.map((item) => struct.decode(item)),
    struct.props
  );
};

// src/structs/bigfloat.ts
var import_big_float = require("@awsless/big-float");
var bigfloat = () => new Struct(
  (value) => new import_big_float.BigFloat(value).toString(),
  (value) => new import_big_float.BigFloat(value),
  { type: "double" }
);

// src/structs/bigint.ts
var bigint = () => new Struct(
  (value) => value.toString(),
  (value) => BigInt(value),
  { type: "long" }
);

// src/structs/boolean.ts
var boolean = () => new Struct(
  (value) => value,
  (value) => value,
  { type: "boolean" }
);

// src/structs/date.ts
var date = () => new Struct(
  (value) => value.toISOString(),
  (value) => new Date(value),
  { type: "date" }
);

// src/structs/enums.ts
var enums = () => new Struct(
  (value) => value,
  (value) => value,
  { type: "text" }
);

// src/structs/number.ts
var number = () => new Struct(
  (value) => value.toString(),
  (value) => Number(value),
  { type: "double" }
);

// src/structs/object.ts
var object = (schema) => {
  const properties = {};
  for (const key in schema) {
    properties[key] = schema[key].props;
  }
  return new Struct(
    (input) => {
      const encoded = {};
      for (const key in input) {
        encoded[key] = schema[key].encode(input[key]);
      }
      return encoded;
    },
    (encoded) => {
      const output = {};
      for (const key in encoded) {
        output[key] = schema[key].decode(encoded[key]);
      }
      return output;
    },
    { properties }
  );
};

// src/structs/set.ts
var set = (struct) => {
  return new Struct(
    (input) => [...input].map((item) => struct.encode(item)),
    (encoded) => new Set(encoded.map((item) => struct.decode(item))),
    struct.props
  );
};

// src/structs/string.ts
var string = () => new Struct(
  (value) => value,
  (value) => value,
  { type: "text" }
);

// src/structs/uuid.ts
var uuid = () => new Struct(
  (value) => value,
  (value) => value,
  { type: "text" }
);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  array,
  bigfloat,
  bigint,
  boolean,
  date,
  define,
  deleteItem,
  enums,
  indexItem,
  migrate,
  mockOpenSearch,
  number,
  object,
  search,
  searchClient,
  set,
  string,
  uuid
});