// src/client.ts
import { Client } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws";
import { fromEnv } from "@aws-sdk/credential-providers";
var client;
var searchClient = () => {
  if (!client) {
    client = new Client({
      node: "https://" + process.env.SEARCH_DOMAIN,
      ...AwsSigv4Signer({
        region: process.env.AWS_REGION,
        service: "es",
        getCredentials: fromEnv()
        // getCredentials: () => {
        // 	const credentialsProvider = defaultProvider();
        // 	return credentialsProvider();
        // },
      })
    });
  }
  return client;
};
var mockClient = (host, port) => {
  client = new Client({ node: `http://${host}:${port}` });
};

// src/mock.ts
import { requestPort } from "@heat/request-port";

// src/server/download.ts
import { stat, mkdir } from "fs/promises";
import { resolve, join } from "path";
import findCacheDir from "find-cache-dir";
import decompress from "decompress";
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
    const child = spawn(binary, parseSettings(version.settings({ host, port, cache })));
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

// src/server/wait.ts
import { sleepAwait } from "sleep-await";
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
    await sleepAwait(100 * count);
  }
  throw new Error("ElasticSearch server is unavailable");
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
var define = (index, schema) => {
  return {
    index,
    schema
  };
};

// src/ops/index-item.ts
var indexItem = async (table, id, item, { client: client2 = searchClient(), refresh = true } = {}) => {
  await client2.index({
    index: table.index,
    id,
    refresh,
    body: table.schema.encode(item)
  });
};

// src/ops/delete-item.ts
var deleteItem = async (table, id, { client: client2 = searchClient(), refresh = true } = {}) => {
  await client2.delete({
    index: table.index,
    id,
    refresh
  });
};

// src/ops/update-item.ts
var updateItem = async (table, id, item, { client: client2 = searchClient(), refresh = true } = {}) => {
  await client2.update({
    index: table.index,
    id,
    body: {
      doc: table.schema.encode(item),
      doc_as_upsert: true
    },
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
var search = async (table, { query: query2, aggs, limit = 10, cursor, sort }) => {
  const client2 = searchClient();
  const result = await client2.search({
    index: table.index,
    body: {
      size: limit + 1,
      search_after: decodeCursor(cursor),
      query: query2,
      aggs,
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
    items: items.map((item) => table.schema.decode(item._source))
  };
};

// src/ops/query.ts
var query = async (table, { query: query2 }) => {
  const client2 = await searchClient();
  const result = await client2.transport.request({
    method: "POST",
    path: "_plugins/_sql?format=json",
    body: { query: query2 }
  });
  const { hits } = result.body.hits;
  return hits.map((item) => table.schema.decode(item._source));
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
import { BigFloat } from "@awsless/big-float";
var bigfloat = () => new Struct(
  (value) => new BigFloat(value).toString(),
  (value) => new BigFloat(value),
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
        if (typeof schema[key] === "undefined") {
          throw new TypeError(`No '${key}' property present on schema.`);
        }
        encoded[key] = schema[key].encode(input[key]);
      }
      return encoded;
    },
    (encoded) => {
      const output = {};
      for (const key in encoded) {
        if (typeof schema[key] === "undefined") {
          throw new TypeError(`No '${key}' property present on schema.`);
        }
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
  { type: "keyword" }
);

// src/structs/uuid.ts
var uuid = () => new Struct(
  (value) => value,
  (value) => value,
  { type: "keyword" }
);
export {
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
  query,
  search,
  searchClient,
  set,
  string,
  updateItem,
  uuid
};
