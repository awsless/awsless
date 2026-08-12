// src/client.ts
import { fromEnv } from "@aws-sdk/credential-providers";
import { Client } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws";
import { Agent } from "https";
var mock;
var searchClient = (options = {}, service = "es") => {
  if (mock) {
    return mock;
  }
  const node = options.node ?? "https://" + process.env.SEARCH_DOMAIN;
  return new Client({
    node,
    // Fail fast inside a lambda instead of the 30s default, & skip
    // socket reuse since frozen sandboxes hold dead sockets.
    // Both can be overridden through the options. The local dev &
    // test servers run plain http, where an https agent won't fly.
    requestTimeout: 5e3,
    agent: String(node).startsWith("https") ? () => new Agent({
      keepAlive: false
    }) : void 0,
    ...AwsSigv4Signer({
      region: process.env.AWS_REGION,
      service,
      getCredentials: fromEnv()
    }),
    ...options
  });
};
var mockClient = (host, port) => {
  mock = new Client({ node: `http://${host}:${port}` });
};

// src/mock.ts
import { requestPort } from "@heat/request-port";

// src/server/download.ts
import { createHash } from "crypto";
import decompress from "decompress";
import findCacheDir from "find-cache-dir";
import { mkdir, rename, rm, stat } from "fs/promises";
import { join, resolve } from "path";
var getArchiveName = (version) => {
  const name = `opensearch-min-${version}`;
  switch (process.platform) {
    case "win32":
      return `${name}-windows-arm64.zip`;
    default:
      return `${name}-linux-x64.tar.gz`;
  }
};
var getDownloadUrl = (version) => {
  return `https://artifacts.opensearch.org/releases/core/opensearch/${version}/${getArchiveName(version)}`;
};
var getDownloadPath = () => {
  return resolve(
    findCacheDir({
      name: "@awsless/open-search",
      cwd: process.cwd()
    }) || ""
  );
};
var exists = async (path) => {
  try {
    await stat(path);
  } catch (error) {
    return false;
  }
  return true;
};
var download = async ({ version }) => {
  const path = join(getDownloadPath(), "min");
  const name = `opensearch-${version}`;
  const file = join(path, name);
  if (await exists(file)) {
    return file;
  }
  console.log(`Downloading OpenSearch ${version}`);
  const url = getDownloadUrl(version);
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Downloading OpenSearch failed with status ${response.status}: ${url}`);
  }
  const data = await response.arrayBuffer();
  const buffer = Buffer.from(data);
  const checksumResponse = await fetch(`${url}.sha512`, { method: "GET" });
  if (!checksumResponse.ok) {
    throw new Error(
      `Downloading the OpenSearch checksum failed with status ${checksumResponse.status}: ${url}.sha512`
    );
  }
  const checksum = (await checksumResponse.text()).split(/\s+/)[0];
  const digest = createHash("sha512").update(buffer).digest("hex");
  if (digest !== checksum) {
    throw new Error(`The OpenSearch archive doesn't match its published sha512 checksum: ${url}`);
  }
  const staging = join(path, `staging-${process.pid}`);
  await mkdir(staging, { recursive: true, mode: "0777" });
  await decompress(buffer, staging);
  try {
    await rename(join(staging, name), file);
  } catch (error) {
    if (!await exists(file)) {
      throw error;
    }
  }
  await rm(staging, { recursive: true, force: true });
  return file;
};

// src/server/launch.ts
import { spawn } from "child_process";
import { rm as rm2, stat as stat2 } from "fs/promises";
import { join as join3 } from "path";

// src/server/java.ts
import { execFile } from "child_process";
import { join as join2 } from "path";
import { promisify } from "util";
var exec = promisify(execFile);
var MINIMUM_JAVA_VERSION = 21;
var getJavaVersion = async (home) => {
  try {
    const result = await exec(join2(home, "bin/java"), ["-version"]);
    const match = `${result.stdout}${result.stderr}`.match(/version "(\d+)/);
    if (match) {
      return Number(match[1]);
    }
  } catch {
  }
  return void 0;
};
var getMacJavaHome = async () => {
  try {
    const result = await exec("/usr/libexec/java_home", ["-v", `${MINIMUM_JAVA_VERSION}+`]);
    return result.stdout.trim() || void 0;
  } catch {
  }
  return void 0;
};
var findJavaHome = async () => {
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
    if (!home) {
      continue;
    }
    const version = await getJavaVersion(home);
    if (version && version >= MINIMUM_JAVA_VERSION) {
      return home;
    }
  }
  return void 0;
};

// src/server/launch.ts
var exists2 = async (path) => {
  try {
    await stat2(path);
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
    const cache = join3(path, "cache", String(port));
    const cleanUp = async () => {
      if (await exists2(cache)) {
        await rm2(cache, {
          recursive: true
        });
      }
    };
    await cleanUp();
    const binary = join3(path, "bin/opensearch");
    const env = { ...process.env };
    if (process.platform === "darwin") {
      const javaHome = await findJavaHome();
      if (!javaHome) {
        reject(new Error('No local JDK 21+ found to run OpenSearch. Install one with "brew install openjdk".'));
        return;
      }
      env.OPENSEARCH_JAVA_HOME = javaHome;
    }
    const child = spawn(binary, parseSettings(version.settings({ host, port, cache })), { env });
    const output = [];
    const onError = (error) => fail(String(error));
    const onExit = (code) => {
      fail(`OpenSearch exited before starting (code ${code})
${output.join("")}`);
    };
    const onMessage = (message) => {
      const line = message.toString("utf8").toLowerCase();
      output.push(line);
      if (debug) {
        console.log(line);
      }
      if (version.started(line)) {
        done();
      }
    };
    const kill = async () => {
      if (child.exitCode === null && !child.killed) {
        await new Promise((resolve3) => {
          child.once(`exit`, () => {
            resolve3(void 0);
          });
          child.kill();
        });
      }
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

// src/server/version.ts
var VERSION_3_5_0_MIN = {
  version: "3.5.0",
  started: (line) => line.includes("o.o.n.node") && line.includes("started"),
  settings: ({ port, host, cache }) => ({
    "discovery.type": "single-node",
    "http.host": host,
    "http.port": port,
    "path.data": `${cache}/data`,
    "path.logs": `${cache}/logs`,
    // 3.x blocks index creation cluster-wide once the disk passes the
    // 90% watermark - percentage-based paranoia that breaks the local
    // server on any well-filled dev machine.
    "cluster.routing.allocation.disk.threshold_enabled": "false"
  })
};

// src/server/wait.ts
import { sleepAwait } from "sleep-await";
var ping = async () => {
  const client = await searchClient();
  try {
    const result = await client.cat.indices({ format: "json" });
    return result.statusCode === 200;
  } catch (error) {
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
  throw new Error("ElasticSearch server is unavailable");
};

// src/mock.ts
var mockOpenSearch = ({ version = VERSION_3_5_0_MIN, debug = false } = {}) => {
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
  }, 1e3 * 1e3);
};

// src/table.ts
var define = (index, schema, client) => {
  return {
    index,
    schema,
    client
  };
};

// src/ops/bulk.ts
var bulkDeleteItem = (table, id) => {
  return {
    action: "delete",
    table,
    id
  };
};
var bulkIndexItem = (table, id, item) => {
  return {
    action: "index",
    table,
    item,
    id
  };
};
var bulkCreateItem = (table, id, item) => {
  return {
    action: "create",
    table,
    item,
    id
  };
};
var bulkUpdateItem = (table, id, item) => {
  return {
    action: "update",
    table,
    item,
    id
  };
};
var bulk = async ({ items, client, refresh = true }) => {
  if (items.length === 0) {
    return;
  }
  const openSearchClient = client ?? items[0].table.client();
  const response = await openSearchClient.bulk({
    refresh,
    body: items.map((entry) => {
      const body = [
        {
          [entry.action]: {
            _id: entry.id,
            _index: entry.table.index
          }
        }
      ];
      if (entry.action === "create" || entry.action === "index") {
        body.push(entry.table.schema.encode(entry.item));
      } else if (entry.action === "update") {
        body.push({ doc: entry.table.schema.encode(entry.item) });
      }
      return body;
    }).flat()
  });
  if (response.body.errors) {
    throw new BulkError(findBulkItemErrors(response.body.items));
  }
};
var BulkError = class extends Error {
  constructor(items) {
    super("Bulk error");
    this.items = items;
  }
  items;
};
var BulkItemError = class extends Error {
  constructor(index, id, type, message) {
    super(message);
    this.index = index;
    this.id = id;
    this.type = type;
  }
  index;
  id;
  type;
};
var findBulkItemErrors = (items) => {
  const errors = [];
  for (const entry of items) {
    const item = entry.delete || entry.update || entry.create || entry.index;
    if (item.error) {
      errors.push(
        new BulkItemError(
          //
          item._index,
          item._id,
          item.error.type,
          item.error.reason
        )
      );
    }
  }
  return errors;
};

// src/ops/total.ts
var total = async (table) => {
  const result = await table.client().count({
    index: table.index
  });
  return result.body.count;
};

// src/ops/search.ts
var encodeCursor = (cursor) => {
  const json = JSON.stringify(cursor);
  return Buffer.from(json, "utf8").toString("base64");
};
var decodeCursor = (cursor) => {
  if (!cursor) return;
  try {
    const json = Buffer.from(cursor, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return;
  }
};
var search = async (table, { query, aggs, limit = 10, offset, cursor, sort, trackTotalHits }) => {
  const result = await table.client().search({
    index: table.index,
    // The caller passes raw query DSL as unknown, so the spec-typed
    // request body can only be satisfied with a cast.
    body: {
      from: offset,
      size: limit + 1,
      search_after: decodeCursor(cursor),
      track_total_hits: trackTotalHits,
      query,
      aggs,
      sort
    }
  });
  const { hits, total: total2 } = result.body.hits;
  let nextCursor;
  if (hits.length > limit) {
    const last = hits[limit - 1];
    if (last) {
      nextCursor = encodeCursor(last.sort);
    }
  }
  const items = hits.splice(0, limit);
  return {
    cursor: nextCursor,
    found: total2.value,
    count: items.length,
    items: items.map((item) => table.schema.decode(item._source))
  };
};

// src/ops/index-item.ts
var indexItem = async (table, id, item, { refresh = true } = {}) => {
  await table.client().index({
    index: table.index,
    id,
    refresh,
    body: table.schema.encode(item)
  });
};

// src/ops/delete-item.ts
var deleteItem = async (table, id, { refresh = true } = {}) => {
  await table.client().delete({
    index: table.index,
    id,
    refresh
  });
};

// src/ops/update-item.ts
var updateItem = async (table, id, item, { refresh = true } = {}) => {
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

// src/ops/create-index.ts
var createIndex = async (table) => {
  const result = await table.client().cat.indices({ format: "json" });
  const found = result.body.find((item) => {
    return item.index === table.index;
  });
  if (!found) {
    await table.client().indices.create({
      index: table.index
    });
  }
  await table.client().indices.putMapping({
    index: table.index,
    body: table.schema.mapping
  });
};

// src/ops/delete-index.ts
var deleteIndex = async (table) => {
  const result = await table.client().cat.indices({ format: "json" });
  const found = result.body.find((item) => {
    return item.index === table.index;
  });
  if (found) {
    await table.client().indices.delete({
      index: table.index
    });
  }
};

// src/schema/schema.ts
var Schema = class {
  constructor(encode, decode, mapping) {
    this.encode = encode;
    this.decode = decode;
    this.mapping = mapping;
  }
  encode;
  decode;
  mapping;
};

// src/schema/array.ts
var array = (struct) => {
  return new Schema(
    (input) => input.map((item) => struct.encode(item)),
    (encoded) => encoded.map((item) => struct.decode(item)),
    struct.mapping
  );
};

// src/schema/bigfloat.ts
import { BigFloat, parse } from "@awsless/big-float";
var bigfloat = (props = {}) => new Schema(
  (value) => new BigFloat(value).toString(),
  (value) => parse(value),
  { type: "double", ...props }
);

// src/schema/bigint.ts
var bigint = (props = {}) => new Schema(
  (value) => value.toString(),
  (value) => BigInt(value),
  { type: "long", ...props }
);

// src/schema/boolean.ts
var boolean = (props = {}) => new Schema(
  (value) => value,
  (value) => value,
  { type: "boolean", ...props }
);

// src/schema/date.ts
var date = (props = {}) => new Schema(
  (value) => value.toISOString(),
  (value) => new Date(value),
  { type: "date", ...props }
);

// src/schema/number.ts
var number = (props = {}) => new Schema(
  (value) => value.toString(),
  (value) => Number(value),
  { type: "double", ...props }
);

// src/schema/object.ts
var object = (entries) => {
  const properties = {};
  for (const key in entries) {
    properties[key] = entries[key].mapping;
  }
  return new Schema(
    (input) => {
      const encoded = {};
      for (const key in input) {
        const field = entries[key];
        if (typeof field === "undefined") {
          throw new TypeError(`No '${key}' property present on schema.`);
        }
        encoded[key] = field.encode(input[key]);
      }
      return encoded;
    },
    (encoded) => {
      const output = {};
      for (const key in encoded) {
        const field = entries[key];
        if (typeof field === "undefined") {
          throw new TypeError(`No '${key}' property present on schema.`);
        }
        output[key] = field.decode(encoded[key]);
      }
      return output;
    },
    { properties }
  );
};

// src/schema/set.ts
var set = (struct) => {
  return new Schema(
    (input) => [...input].map((item) => struct.encode(item)),
    (encoded) => new Set(encoded.map((item) => struct.decode(item))),
    struct.mapping
  );
};

// src/schema/string.ts
var string = (props = {}) => new Schema(
  (value) => value,
  (value) => value,
  { type: "keyword", ...props }
);

// src/schema/uuid.ts
var uuid = (props = {}) => new Schema(
  (value) => value,
  (value) => value,
  { type: "keyword", ...props }
);
export {
  BulkError,
  BulkItemError,
  VERSION_3_5_0_MIN,
  array,
  bigfloat,
  bigint,
  boolean,
  bulk,
  bulkCreateItem,
  bulkDeleteItem,
  bulkIndexItem,
  bulkUpdateItem,
  createIndex,
  date,
  define,
  deleteIndex,
  deleteItem,
  download,
  indexItem,
  launch,
  mockClient,
  mockOpenSearch,
  number,
  object,
  search,
  searchClient,
  set,
  string,
  total,
  updateItem,
  uuid,
  wait
};
