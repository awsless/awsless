// src/client.ts
import { fromEnv } from "@aws-sdk/credential-providers";
import { Client } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws";
var mock;
var searchClient = (options = {}, service = "es") => {
  if (mock) {
    return mock;
  }
  return new Client({
    node: "https://" + process.env.SEARCH_DOMAIN,
    ...AwsSigv4Signer({
      region: process.env.AWS_REGION,
      service,
      getCredentials: fromEnv()
      // getCredentials: () => {
      // 	const credentialsProvider = defaultProvider();
      // 	return credentialsProvider();
      // },
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
import decompress from "decompress";
import findCacheDir from "find-cache-dir";
import { mkdir, stat } from "fs/promises";
import { join, resolve } from "path";
var getArchiveName = (version) => {
  switch (process.platform) {
    case "win32":
      return `opensearch-${version}-windows-arm64.zip`;
    default:
      return `opensearch-${version}-linux-x64.tar.gz`;
  }
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
var download = async (version) => {
  const path = getDownloadPath();
  const name = `opensearch-${version}`;
  const file = join(path, name);
  if (await exists(file)) {
    return file;
  }
  console.log(`Downloading OpenSearch ${version}`);
  const url = `https://artifacts.opensearch.org/releases/bundle/opensearch/${version}/${getArchiveName(version)}`;
  const response = await fetch(url, { method: "GET" });
  const data = await response.arrayBuffer();
  const buffer = Buffer.from(data);
  await mkdir(path, { recursive: true, mode: "0777" });
  await decompress(buffer, path);
  return file;
};

// src/server/launch.ts
import { spawn } from "child_process";
import { rm, stat as stat2 } from "fs/promises";
import { join as join2 } from "path";
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
    const cache = join2(path, "cache", String(port));
    const cleanUp = async () => {
      if (await exists2(cache)) {
        await rm(cache, {
          recursive: true
        });
      }
    };
    await cleanUp();
    const binary = join2(path, "opensearch-tar-install.sh");
    const child = spawn(
      // `export OPENSEARCH_JAVA_HOME=${join(path, 'jdk')}; ${binary}`,
      binary,
      parseSettings(version.settings({ host, port, cache }))
      // {
      // 	env: {
      // 		OPENSEARCH_JAVA_HOME: join(path, 'jdk'),
      // 	},
      // }
    );
    const onError = (error) => fail(error);
    const onMessage = (message) => {
      const line = message.toString("utf8").toLowerCase();
      if (debug) {
        console.log(line);
      }
      if (version.started(line)) {
        done();
      }
    };
    const kill = async () => {
      await new Promise((resolve3) => {
        child.once(`exit`, () => {
          resolve3(void 0);
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

// src/server/version.ts
var VERSION_2_8_0 = {
  version: "2.8.0",
  started: (line) => line.includes("started"),
  settings: ({ port, host, cache }) => ({
    "discovery.type": "single-node",
    "http.host": host,
    "http.port": port,
    "path.data": `${cache}/data`,
    "path.logs": `${cache}/logs`,
    "plugins.security.disabled": true
  })
};

// src/server/wait.ts
import { sleepAwait } from "sleep-await";
var ping = async () => {
  const client = await searchClient();
  try {
    const result = await client.cat.indices({ format: "json" });
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
    await sleepAwait(100 * count);
  }
  throw new Error("ElasticSearch server is unavailable");
};

// src/mock.ts
var mockOpenSearch = ({ version = VERSION_2_8_0, debug = false } = {}) => {
  beforeAll && beforeAll(async () => {
    const [port, release] = await requestPort();
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
var bulk = async (table, items, { refresh = true } = {}) => {
  const response = await table.client().bulk({
    index: table.index,
    refresh,
    body: items.map((entry) => {
      const body = [{ [entry.action]: { _id: entry.id } }];
      if (entry.action === "create" || entry.action === "index") {
        body.push(table.schema.encode(entry.item));
      } else if (entry.action === "update") {
        body.push({ doc: table.schema.encode(entry.item) });
      }
      return body;
    }).flat()
  });
  console.log(response);
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
var search = async (table, { query, aggs, limit = 10, cursor, sort, trackTotalHits }) => {
  const result = await table.client().search({
    index: table.index,
    body: {
      size: limit + 1,
      search_after: decodeCursor(cursor),
      track_total_hits: trackTotalHits,
      query,
      aggs,
      sort
    }
  });
  const { hits, total } = result.body.hits;
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
    found: total.value,
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
import { BigFloat } from "@awsless/big-float";
var bigfloat = (props = {}) => new Schema(
  (value) => new BigFloat(value).toString(),
  (value) => new BigFloat(value),
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
  array,
  bigfloat,
  bigint,
  boolean,
  bulk,
  createIndex,
  date,
  define,
  deleteIndex,
  deleteItem,
  indexItem,
  mockOpenSearch,
  number,
  object,
  search,
  searchClient,
  set,
  string,
  updateItem,
  uuid
};
