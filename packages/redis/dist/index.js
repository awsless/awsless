var __defProp = Object.defineProperty;
var __export = (target, all5) => {
  for (var name in all5)
    __defProp(target, name, { get: all5[name], enumerable: true });
};

// src/test/mock.ts
import { requestPort } from "@heat/request-port";

// src/client/ioredis.ts
import { Cluster, Redis } from "ioredis";
var optionOverrides = {};
var overrideOptions = (options) => {
  optionOverrides = options;
};
var createIoRedisClient = (options) => {
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
      // commandQueue: false,
      // offlineQueue: false,
      ...options,
      ...optionOverrides
    };
    if (!props.cluster) {
      return new Redis(props);
    } else {
      return new Cluster(
        [
          {
            host: props.host,
            port: props.port
          }
        ],
        {
          dnsLookup: (address, callback) => callback(null, address),
          slotsRefreshTimeout: 5e3,
          enableReadyCheck: false,
          clusterRetryStrategy(times) {
            if (times > 5) return null;
            return Math.min(times * 200, 2e3);
          },
          redisOptions: props
        }
      );
    }
  };
  let redis;
  const getLazyClient = () => {
    if (!redis) {
      redis = createClient();
    }
    return redis;
  };
  return {
    send: (name, args) => {
      return getLazyClient().call(
        name,
        args.filter((a) => typeof a !== "undefined")
      );
    },
    batch: (commands) => {
      const pipe = getLazyClient().pipeline();
      for (const command2 of commands) {
        pipe.call(
          command2.name,
          command2.args.filter((a) => typeof a !== "undefined")
        );
      }
      return pipe.exec();
    },
    transact: (commands) => {
      const pipe = getLazyClient().multi();
      for (const command2 of commands) {
        pipe.call(
          command2.name,
          command2.args.filter((a) => typeof a !== "undefined")
        );
      }
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

// src/test/server.ts
import { Redis as Redis2 } from "ioredis";
import { RedisMemoryServer } from "redis-memory-server";
var RedisServer = class {
  client;
  process;
  async start(port) {
    if (this.process) {
      throw new Error(`Redis server is already listening on port: ${await this.process.getPort()}`);
    }
    if (port && (port < 0 || port >= 65536)) {
      throw new RangeError(`Port should be >= 0 and < 65536. Received ${port}.`);
    }
    this.process = await RedisMemoryServer.create({
      instance: {
        port,
        args: []
      }
      // binary: { systemBinary: '/usr/local/bin/redis-server' },
    });
  }
  async kill() {
    if (this.process) {
      await this.client?.disconnect();
      await this.process.stop();
      this.process = void 0;
    }
  }
  async ping() {
    const client = await this.getClient();
    return await client.ping() === "PONG";
  }
  async getClient() {
    if (!this.client) {
      this.client = new Redis2({
        host: await this.process?.getHost(),
        port: await this.process?.getPort(),
        stringNumbers: true,
        keepAlive: 0,
        noDelay: true,
        enableReadyCheck: false,
        maxRetriesPerRequest: null
        // retryStrategy: (options) => {
        // 	return
        // },
      });
    }
    return this.client;
  }
};

// src/test/mock.ts
var mockRedis = () => {
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
  }, 30 * 1e3);
  afterAll && afterAll(async () => {
    await server.kill();
    await releasePort();
  }, 30 * 1e3);
};

// src/command/index.ts
var command_exports = {};
__export(command_exports, {
  array: () => array_exports,
  batch: () => batch,
  db: () => db_exports,
  key: () => key_exports,
  map: () => map_exports,
  script: () => script_exports,
  server: () => server_exports,
  set: () => set_exports,
  sortedSet: () => sorted_set_exports,
  string: () => string_exports,
  ttl: () => ttl_exports2
});

// src/command/string.ts
var string_exports = {};
__export(string_exports, {
  append: () => append,
  decr: () => decr,
  delete: () => del2,
  get: () => get,
  has: () => has2,
  incr: () => incr,
  set: () => set,
  substring: () => substring
});
import { mul, parse } from "@awsless/big-float";
import { Duration, toSafeMilliSeconds } from "@awsless/duration";

// src/command/key.ts
var key_exports = {};
__export(key_exports, {
  del: () => del,
  delete: () => del,
  has: () => has,
  rename: () => rename,
  type: () => type
});

// src/command/util.ts
var removeNull = (value) => {
  if (value === null) {
    return void 0;
  }
  return value;
};
var returnVoid = () => {
};
var returnEcho = (v) => v;
var returnBoolean = (v) => !!v;
var returnNumberBoolean = (v) => v === 1 || v === "1";
var returnInt = (v) => parseInt(v, 10);
var returnFloat = (v) => parseFloat(v);
var returnScanResult = ([cursor, items]) => {
  if (cursor === "0") {
    return {
      cursor: void 0,
      items
    };
  }
  return {
    cursor,
    items
  };
};
var buildScanArgs = ({ match, limit, cursor }) => {
  const args = [];
  args.push(cursor ?? 0);
  args.push("COUNT", limit ?? 10);
  if (match) {
    args.push("MATCH", match);
  }
  return args;
};
var command = (redis, name, args, resolve) => {
  let promise;
  return {
    name,
    args,
    resolve,
    then(onfulfilled, onrejected) {
      if (!promise) {
        promise = redis.send(name, args).then(resolve);
      }
      return promise.then(onfulfilled).catch(onrejected);
    }
  };
};
var iterable = (cursor, callback) => {
  return {
    [Symbol.asyncIterator]() {
      let done = false;
      return {
        async next() {
          if (done) {
            return { done: true };
          }
          const result = await callback(cursor);
          cursor = result.cursor;
          if (!result.cursor) {
            done = true;
          }
          if (Array.isArray(result.items) && result.items.length === 0) {
            return { done: true };
          }
          if ((result.items instanceof Set || result.items instanceof Map) && result.items.size === 0) {
            return { done: true };
          }
          return {
            value: result.items,
            done: false
          };
        }
      };
    }
  };
};

// src/command/key.ts
var has = (client, key) => {
  return command(client, "EXISTS", [key], returnNumberBoolean);
};
var del = (client, key) => {
  return command(client, "DEL", [key], returnBoolean);
};
var type = (client, key) => {
  return command(client, "TYPE", [key], returnEcho);
};
var rename = (client, from, to, options = {}) => {
  if (options.when === "not-exists") {
    return command(client, "RENAMENX", [from, to], returnNumberBoolean);
  }
  return command(client, "RENAME", [from, to], () => {
    return true;
  });
};

// src/command/string.ts
var get = (client, key) => {
  return command(client, "GET", [key], removeNull);
};
var set = (client, key, value, options = {}) => {
  const args = [key, value];
  if (options.when === "exists") {
    args.push("XX");
  }
  if (options.when === "not-exists") {
    args.push("NX");
  }
  if (options.ttl instanceof Date) {
    args.push("PXAT", options.ttl.getTime());
  }
  if (options.ttl instanceof Duration) {
    args.push("PX", toSafeMilliSeconds(options.ttl).toString());
  }
  if (options.ttl === "keep") {
    args.push("KEEPTTL");
  }
  return command(client, "SET", args, returnBoolean);
};
var has2 = has;
var incr = (client, key, value = 1) => {
  const num = parse(value).toString();
  return command(client, "INCRBYFLOAT", [key, num], returnEcho);
};
var decr = (client, key, value = 1) => {
  const num = mul(value, -1).toString();
  return command(client, "INCRBYFLOAT", [key, num], returnEcho);
};
var append = (client, key, value) => {
  return command(client, "APPEND", [key, value], returnInt);
};
var substring = (client, key, start, end = -1) => {
  return command(client, "GETRANGE", [key, start, end], returnEcho);
};
var del2 = del;

// src/command/map.ts
var map_exports = {};
__export(map_exports, {
  all: () => all,
  clear: () => clear,
  decr: () => decr2,
  delete: () => del3,
  get: () => get3,
  has: () => has3,
  incr: () => incr2,
  length: () => length,
  scan: () => scan,
  set: () => set3,
  ttl: () => ttl_exports
});
import { mul as mul2, parse as parse2 } from "@awsless/big-float";
import chunk from "chunk";

// src/command/map/ttl.ts
var ttl_exports = {};
__export(ttl_exports, {
  delete: () => persist,
  duration: () => duration,
  get: () => get2,
  set: () => set2
});
import { milliSeconds, toSafeMilliSeconds as toSafeMilliSeconds2 } from "@awsless/duration";
var set2 = (client, key, ttl, ...fields) => {
  const isDate = ttl instanceof Date;
  const cmd = isDate ? "HPEXPIREAT" : "HPEXPIRE";
  const args = [key];
  if (isDate) {
    args.push(ttl.getTime());
  } else {
    args.push(toSafeMilliSeconds2(ttl).toString());
  }
  return command(
    client,
    cmd,
    [...args, "FIELDS", fields.length, ...fields],
    (r) => r.map(returnBoolean)
  );
};
var get2 = (client, key, ...fields) => {
  return command(
    client,
    "HPEXPIRETIME",
    [key, "FIELDS", fields.length, ...fields],
    (r) => r.map((v) => {
      if (v < 0) {
        return void 0;
      }
      return new Date(v);
    })
  );
};
var duration = (client, key, ...fields) => {
  return command(
    client,
    "HPTTL",
    [key, "FIELDS", fields.length, ...fields],
    (r) => r.map((v) => {
      if (v < 0) {
        return void 0;
      }
      return milliSeconds(v);
    })
  );
};
var persist = (client, key, ...fields) => {
  return command(
    client,
    "HPERSIST",
    [key, "FIELDS", fields.length, ...fields],
    (r) => r.map(returnBoolean)
  );
};

// src/command/map.ts
var get3 = (client, key, field) => {
  return command(client, "HGET", [key, field], removeNull);
};
var set3 = (client, key, field, value) => {
  return command(client, "HSET", [key, field, value], returnBoolean);
};
var has3 = (client, key, field) => {
  return command(client, "HEXISTS", [key, field], returnBoolean);
};
var del3 = (client, key, field) => {
  return command(client, "HDEL", [key, field], returnBoolean);
};
var incr2 = (client, key, field, value = 1) => {
  const num = parse2(value).toString();
  return command(client, "HINCRBYFLOAT", [key, field, num], returnEcho);
};
var decr2 = (client, key, field, value = 1) => {
  const num = mul2(value, -1).toString();
  return command(client, "HINCRBYFLOAT", [key, field, num], returnEcho);
};
var length = (client, key) => {
  return command(client, "HLEN", [key], returnInt);
};
var clear = del;
var all = (client, key) => {
  return command(client, "HGETALL", [key], (items) => new Map(chunk(items, 2)));
};
var formatScanResult = (result) => {
  const { cursor, items } = returnScanResult(result);
  return {
    cursor,
    items: new Map(chunk(items, 2))
  };
};
var scan = (client, key, options = {}) => {
  return {
    ...command(
      client,
      "HSCAN",
      [key, ...buildScanArgs(options)],
      formatScanResult
    ),
    ...iterable(options.cursor, async (cursor) => {
      const result = await client.send("HSCAN", [key, ...buildScanArgs({ ...options, cursor })]);
      return formatScanResult(result);
    })
  };
};

// src/command/ttl.ts
var ttl_exports2 = {};
__export(ttl_exports2, {
  delete: () => persist2,
  duration: () => duration2,
  get: () => get4,
  set: () => set4
});
import { milliSeconds as milliSeconds2, toSafeMilliSeconds as toSafeMilliSeconds3 } from "@awsless/duration";
var set4 = (client, key, ttl) => {
  const isDate = ttl instanceof Date;
  const cmd = isDate ? "PEXPIREAT" : "PEXPIRE";
  const args = [key];
  if (isDate) {
    args.push(ttl.getTime());
  } else {
    args.push(toSafeMilliSeconds3(ttl).toString());
  }
  return command(client, cmd, args, returnBoolean);
};
var get4 = (client, key) => {
  return command(client, "PEXPIRETIME", [key], (r) => {
    if (r < 0) {
      return void 0;
    }
    return new Date(r);
  });
};
var duration2 = (client, key) => {
  return command(client, "PTTL", [key], (r) => {
    if (r < 0) {
      return void 0;
    }
    return milliSeconds2(r);
  });
};
var persist2 = (client, key) => {
  return command(client, "PERSIST", [key], returnBoolean);
};

// src/command/set.ts
var set_exports = {};
__export(set_exports, {
  add: () => add,
  all: () => all2,
  clear: () => clear2,
  delete: () => del4,
  has: () => has4,
  length: () => length2,
  pop: () => pop,
  random: () => random,
  scan: () => scan2
});
var returnSet = (r) => new Set(r);
var add = (client, key, ...values) => {
  return command(client, "SADD", [key, ...values], returnInt);
};
var del4 = (client, key, ...values) => {
  return command(client, "SREM", [key, ...values], returnInt);
};
var has4 = (client, key, value) => {
  return command(client, "SISMEMBER", [key, value], returnBoolean);
};
function random(client, key, count) {
  return command(client, "SRANDMEMBER", [key, count], typeof count !== "undefined" ? returnSet : removeNull);
}
function pop(client, key, count) {
  return command(client, "SPOP", [key, count], typeof count !== "undefined" ? returnSet : removeNull);
}
var length2 = (client, key) => {
  return command(client, "SCARD", [key], returnInt);
};
var clear2 = del;
var all2 = (client, key) => {
  return command(client, "SMEMBERS", [key], returnSet);
};
var formatScanResult2 = (result) => {
  const { cursor, items } = returnScanResult(result);
  return {
    cursor,
    items: new Set(items)
  };
};
var scan2 = (client, key, options = {}) => {
  return {
    ...command(
      client,
      "SSCAN",
      [key, ...buildScanArgs(options)],
      formatScanResult2
    ),
    ...iterable(options.cursor, async (cursor) => {
      const result = await client.send("SSCAN", [key, ...buildScanArgs({ ...options, cursor })]);
      return formatScanResult2(result);
    })
  };
};

// src/command/sorted-set.ts
var sorted_set_exports = {};
__export(sorted_set_exports, {
  add: () => add2,
  all: () => all3,
  clear: () => clear3,
  delete: () => del5,
  has: () => has5,
  incr: () => incr3,
  indexOf: () => indexOf,
  length: () => length3,
  pop: () => pop2,
  random: () => random2,
  rangeByLex: () => rangeByLex,
  rangeByRank: () => rangeByRank,
  rangeByScore: () => rangeByScore,
  scan: () => scan3,
  score: () => score
});
import chunk2 from "chunk";
var returnOptionalFloat = (value) => {
  if (value === null) {
    return void 0;
  }
  return parseFloat(value);
};
var returnEntry = ([value, score2]) => [
  //
  value,
  parseFloat(score2.toString())
];
var returnSortedSet = (r) => chunk2(r, 2).map((entry) => returnEntry(entry));
var returnOptionalEntry = (r) => r.length === 0 ? void 0 : returnEntry(r);
var add2 = (client, key, ...values) => {
  const entries = values.map(([value, score2]) => [score2.toString(), value]).flat();
  return command(client, "ZADD", [key, ...entries], returnInt);
};
var incr3 = (client, key, value, score2) => {
  return command(client, "ZINCRBY", [key, score2.toString(), value], returnFloat);
};
var score = (client, key, value) => {
  return command(client, "ZSCORE", [key, value], returnOptionalFloat);
};
var indexOf = (client, key, value) => {
  return command(client, "ZRANK", [key, value], removeNull);
};
var del5 = (client, key, ...values) => {
  return command(client, "ZREM", [key, ...values], returnInt);
};
var has5 = (client, key, value) => {
  return command(client, "ZRANK", [key, value], (r) => r !== null);
};
function random2(client, key, count) {
  return command(
    client,
    "ZRANDMEMBER",
    [key, count],
    typeof count !== "undefined" ? returnEcho : removeNull
  );
}
function pop2(client, key, score2, count) {
  return command(
    client,
    score2 === "max" ? "ZPOPMAX" : "ZPOPMIN",
    [key, count],
    typeof count !== "undefined" ? returnSortedSet : returnOptionalEntry
  );
}
var length3 = (client, key) => {
  return command(client, "ZCARD", [key], returnInt);
};
var clear3 = del;
function all3(client, key, options = {}) {
  if (options.withScores) {
    return rangeByScore(client, key, 0, Infinity, { withScores: true });
  }
  return rangeByScore(client, key, 0, Infinity);
}
var formatInf = (num) => {
  if (num === Infinity) {
    return "+inf";
  }
  if (num === -Infinity) {
    return "-inf";
  }
  return num.toString();
};
var buildRangeArgs = (key, start, end, options) => {
  const bounds = options.by === "rank" ? [start.toString(), end.toString()] : options.by === "score" ? options.reverse ? [formatInf(end), formatInf(start)] : [formatInf(start), formatInf(end)] : options.reverse ? [end.toString(), start.toString()] : [start.toString(), end.toString()];
  const args = [key, ...bounds];
  if (options.by === "score") {
    args.push("BYSCORE");
  } else if (options.by === "lex") {
    args.push("BYLEX");
  }
  if (options.reverse) {
    args.push("REV");
  }
  if (options.by !== "rank") {
    args.push("LIMIT", options.offset ?? 0, options.limit ?? 10);
  }
  if (options.withScores) {
    args.push("WITHSCORES");
  }
  return args;
};
function rangeByRank(client, key, start, end, options = {}) {
  return command(
    client,
    "ZRANGE",
    buildRangeArgs(key, start, end, { ...options, by: "rank" }),
    options.withScores ? returnSortedSet : returnEcho
  );
}
function rangeByScore(client, key, start, end, options = {}) {
  return command(
    client,
    "ZRANGE",
    buildRangeArgs(key, start, end, { ...options, by: "score" }),
    options.withScores ? returnSortedSet : returnEcho
  );
}
var rangeByLex = (client, key, start, end, options = {}) => {
  return command(
    client,
    "ZRANGE",
    buildRangeArgs(key, start, end, { ...options, by: "lex" }),
    returnEcho
  );
};
var formatScanResult3 = (result) => {
  const { cursor, items } = returnScanResult(result);
  return {
    cursor,
    items: returnSortedSet(items)
  };
};
var scan3 = (client, key, options = {}) => {
  return {
    ...command(
      client,
      "ZSCAN",
      [key, ...buildScanArgs(options)],
      formatScanResult3
    ),
    ...iterable(options.cursor, async (cursor) => {
      const result = await client.send("ZSCAN", [key, ...buildScanArgs({ ...options, cursor })]);
      return formatScanResult3(result);
    })
  };
};

// src/command/array.ts
var array_exports = {};
__export(array_exports, {
  all: () => all4,
  append: () => append2,
  at: () => at,
  clear: () => clear4,
  delete: () => del6,
  has: () => has6,
  indexOf: () => indexOf2,
  insertAfter: () => insertAfter,
  insertBefore: () => insertBefore,
  length: () => length4,
  pop: () => pop3,
  prepend: () => prepend,
  range: () => range,
  replace: () => replace,
  scan: () => scan4,
  shift: () => shift,
  trim: () => trim
});
var at = (client, key, index) => {
  return command(client, "LINDEX", [key, index], removeNull);
};
var has6 = (client, key, value) => {
  return command(client, "LPOS", [key, value], (r) => r !== null);
};
var indexOf2 = (client, key, value) => {
  return command(
    client,
    "LPOS",
    [key, value],
    (r) => r === null ? void 0 : parseInt(r, 10)
  );
};
var replace = (client, key, index, value) => {
  return command(client, "LSET", [key, index, value], returnVoid);
};
var insert = (client, key, position, pivot, value) => {
  return command(client, "LINSERT", [key, position, pivot, value], returnInt);
};
var insertBefore = (client, key, pivot, value) => {
  return insert(client, key, "BEFORE", pivot, value);
};
var insertAfter = (client, key, pivot, value) => {
  return insert(client, key, "AFTER", pivot, value);
};
var append2 = (client, key, ...elements) => {
  return command(client, "RPUSH", [key, ...elements], returnInt);
};
var prepend = (client, key, ...elements) => {
  const revElements = elements.toReversed();
  return command(client, "LPUSH", [key, ...revElements], returnInt);
};
var pop3 = (client, key) => {
  return command(client, "RPOP", [key], removeNull);
};
var shift = (client, key) => {
  return command(client, "LPOP", [key], removeNull);
};
var del6 = (client, key, value, options = {}) => {
  return command(client, "LREM", [key, options.count ?? 0, value], returnInt);
};
var trim = (client, key, start, end) => {
  return command(client, "LTRIM", [key, start, end], returnBoolean);
};
var length4 = (client, key) => {
  return command(client, "LLEN", [key], returnInt);
};
var clear4 = del;
var range = (client, key, start, end) => {
  return command(client, "LRANGE", [key, start, end], returnEcho);
};
var all4 = (client, key) => {
  return range(client, key, 0, -1);
};
var scan4 = (client, key, options = {}) => {
  const cursor = options.cursor ?? 0;
  const limit = options.limit ?? 10;
  const formatScanResult4 = (cursor2, items) => {
    if (items.length < limit) {
      return {
        cursor: void 0,
        items
      };
    }
    return {
      cursor: cursor2 + limit,
      items
    };
  };
  return {
    ...command(
      client,
      "LRANGE",
      [key, cursor, cursor + limit - 1],
      (v) => formatScanResult4(cursor, v)
    ),
    ...iterable(cursor, async (cursor2) => {
      const c = cursor2 ?? 0;
      const result = await client.send("LRANGE", [key, c, c + limit - 1]);
      return formatScanResult4(c, result);
    })
  };
};

// src/command/script.ts
var script_exports = {};
__export(script_exports, {
  define: () => define,
  eval: () => evaluate,
  evalSha: () => evalSha,
  exists: () => exists,
  flush: () => flush,
  load: () => load,
  lua: () => lua
});
import { createHash } from "crypto";
var evaluate = (client, script, keys, args) => {
  return command(client, "EVAL", [script, keys.length, ...keys, ...args], returnEcho);
};
var evalSha = (client, hash, keys, args) => {
  return command(client, "EVALSHA", [hash, keys.length, ...keys, ...args], returnEcho);
};
var load = (client, script) => {
  return command(client, "SCRIPT", ["LOAD", script], returnEcho);
};
var exists = (client, ...hashes) => {
  return command(
    client,
    "SCRIPT",
    ["EXISTS", ...hashes],
    (r) => r.map(returnNumberBoolean)
  );
};
var flush = (client, mode = "sync") => {
  return command(client, "SCRIPT", ["FLUSH", mode.toUpperCase()], returnVoid);
};
var createScriptRunner = (script, keyNum = 0) => {
  let hash;
  const sha = () => {
    if (!hash) {
      hash = createHash("sha1").update(script).digest("hex");
    }
    return hash;
  };
  return (client, ...args) => {
    let promise;
    const run = async () => {
      let result;
      try {
        result = await command(client, "EVALSHA", [sha(), keyNum, ...args], returnEcho);
      } catch (error) {
        if (error instanceof Error && error.message.includes("NOSCRIPT")) {
          result = await command(client, "EVAL", [script, keyNum, ...args], returnEcho);
        } else {
          throw error;
        }
      }
      return result;
    };
    return {
      name: "EVALSHA",
      args: [sha(), keyNum, ...args],
      resolve: returnEcho,
      preloadScript: script,
      then(onfulfilled, onrejected) {
        if (!promise) {
          promise = run();
        }
        return promise.then(onfulfilled).catch(onrejected);
      }
    };
  };
};
var define = ({
  script,
  keys = 0
}) => {
  const run = createScriptRunner(script, keys);
  return (client, ...args) => {
    return run(client, ...args);
  };
};
var lua = (strings, ...args) => {
  const script = String.raw({ raw: strings }, ...args.map((_, i) => `ARGV[${i + 1}]`));
  const run = createScriptRunner(script);
  return (client) => {
    return run(client, ...args);
  };
};

// src/command/db.ts
var db_exports = {};
__export(db_exports, {
  flush: () => flush2,
  size: () => size
});
var flush2 = (client, mode = "async") => {
  return command(client, "FLUSHDB", [mode.toUpperCase()], returnVoid);
};
var size = (client) => {
  return command(client, "DBSIZE", [], returnInt);
};

// src/command/server.ts
var server_exports = {};
__export(server_exports, {
  flushAll: () => flushAll,
  swap: () => swap,
  time: () => time
});
var flushAll = (client, mode = "async") => {
  return command(client, "FLUSHALL", [mode.toUpperCase()], returnVoid);
};
var time = (client) => {
  return command(client, "TIME", [], ([sec, micro]) => {
    return new Date(parseInt(sec, 10) * 1e3 + Math.floor(parseInt(micro, 10) / 1e3));
  });
};
var swap = (client, db1, db2) => {
  return command(client, "SWAPDB", [db1, db2], returnVoid);
};

// src/command/batch.ts
var runBatch = async (client, commands) => {
  const response = await client.batch(commands);
  if (response === null) {
    throw new Error("Invalid batch response");
  }
  return response.map(([error, data]) => {
    if (error) {
      throw error;
    }
    return data;
  });
};
var batch = async (client, commands) => {
  const preloadScriptCommands = Array.from(
    new Set(commands.map((c) => c.preloadScript).filter((v) => typeof v === "string"))
  ).map((script) => ({
    name: "SCRIPT",
    args: ["LOAD", script]
  }));
  const response = await runBatch(client, [...preloadScriptCommands, ...commands]);
  return response.slice(preloadScriptCommands.length).map((data, i) => {
    const command2 = commands[i];
    if (!command2) {
      throw new Error(`Invalid batch index [${i}] response`);
    }
    return command2.resolve(data);
  });
};

// src/client/lazy.ts
var createLazyClient = (cb) => {
  let client;
  const redis = () => {
    if (!client) {
      client = cb();
    }
    return client;
  };
  return {
    send(name, args) {
      return redis().send(name, args);
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

// src/client/index.ts
var createRedisClient = (options) => {
  return createLazyClient(() => createIoRedisClient(options));
};
export {
  createIoRedisClient,
  createLazyClient,
  createRedisClient,
  mockRedis,
  overrideOptions,
  command_exports as redis
};
