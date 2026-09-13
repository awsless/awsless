//#region src/engine/reply.d.ts
type Reply = {
  type: 'status';
  value: string;
} | {
  type: 'error';
  value: string;
} | {
  type: 'int';
  value: number | bigint;
} | {
  type: 'bulk';
  value: string | null;
} | {
  type: 'array';
  value: Reply[] | null;
} | {
  type: 'none';
} | {
  type: 'double';
  value: number;
} | {
  type: 'map';
  value: [Reply, Reply][];
} | {
  type: 'set';
  value: Reply[];
} | {
  type: 'pairs';
  value: [Reply, Reply][];
} | {
  type: 'push';
  value: Reply[];
} | {
  type: 'verbatim';
  value: string;
};
declare const toResp2: (reply: Reply) => Reply;
//#endregion
//#region src/engine/zset.d.ts
type ZEntry = {
  member: string;
  score: number;
};
declare class SortedSet {
  private scores;
  private list;
  get size(): number;
  has(member: string): boolean;
  score(member: string): number | undefined;
  entries(): readonly ZEntry[];
  at(index: number): ZEntry | undefined;
  add(member: string, score: number): boolean;
  remove(member: string): boolean;
  rank(member: string): number | undefined;
  private indexOf;
  private lowerBoundEntry;
  scoreLowerBound(min: number, exclusive: boolean): number;
  scoreUpperBound(max: number, exclusive: boolean): number;
  lexLowerBound(min: string, exclusive: boolean): number;
  lexUpperBound(max: string, exclusive: boolean): number;
}
//#endregion
//#region src/engine/store.d.ts
type StringEntry = {
  type: 'string';
  value: string;
};
type ListEntry = {
  type: 'list';
  value: string[];
};
type SetEntry = {
  type: 'set';
  value: Set<string>;
};
type ZSetEntry = {
  type: 'zset';
  value: SortedSet;
};
type HashEntry = {
  type: 'hash';
  value: Map<string, string>;
  expires: Map<string, number>;
};
type Entry = StringEntry | ListEntry | SetEntry | ZSetEntry | HashEntry;
declare class Database {
  readonly index: number;
  private entries;
  private expires;
  private versions;
  generation: number;
  constructor(index: number);
  get size(): number;
  get expireCount(): number;
  get(key: string, now: number): Entry | undefined;
  set(key: string, entry: Entry): void;
  cleanup(key: string, entry: Entry): void;
  delete(key: string): boolean;
  touch(key: string): void;
  version(key: string): number;
  expireAt(key: string): number | undefined;
  setExpire(key: string, at: number): void;
  persist(key: string): boolean;
  keys(): string[];
  flush(): void;
  swapWith(other: Database): void;
  sweep(now: number, limit?: number): void;
}
//#endregion
//#region src/engine/types.d.ts
type Watch = {
  db: number;
  key: string;
  version: number;
  generation: number;
};
type Subscriptions = {
  channels: Set<string>;
  patterns: Set<string>;
  shards: Set<string>;
};
type Connection = {
  readonly id: number;
  readonly createdAt: number;
  protocol: 2 | 3;
  db: number;
  name: string | null;
  lib: {
    name: string | null;
    version: string | null;
  };
  multi: {
    queue: string[][];
    failed: boolean;
  } | null;
  watches: Watch[];
  subscriptions: Subscriptions;
  push: (reply: Reply) => void;
  quit: boolean;
  script: {
    readOnly: boolean;
  } | null;
};
//#endregion
//#region src/engine/lua.d.ts
declare class LuaRuntime {
  private engine;
  private L;
  private scripts;
  private errorHandlerRef;
  private current;
  constructor(engine: RedisEngine);
  static sha1(body: string): string;
  exists(sha: string): boolean;
  load(body: string): string;
  flush(): void;
  run(sha: string, keys: string[], argv: string[], conn: Connection, readOnly: boolean): Reply;
  private compile;
  private setGlobalArray;
  private errorMessage;
  private pushReply;
  private toReply;
  private raiseError;
  private call;
  private registerRedisLibrary;
  private registerCjsonLibrary;
  private pushJson;
  private toJson;
}
//#endregion
//#region src/engine/engine.d.ts
type RedisEngineOptions = {
  databases?: number;
  now?: () => number;
};
declare class RedisEngine {
  readonly databases: Database[];
  readonly clients: Set<Connection>;
  readonly channels: Map<string, Set<Connection>>;
  readonly patterns: Map<string, Set<Connection>>;
  readonly shards: Map<string, Set<Connection>>;
  readonly startedAt: number;
  port: number;
  readonly runId: string;
  readonly stats: {
    connections: number;
    commands: number;
  };
  private commands;
  private nextClientId;
  private clock;
  private sweeper;
  private luaRuntime;
  private defaultConnection;
  constructor(options?: RedisEngineOptions);
  get now(): number;
  get lua(): LuaRuntime;
  commandNames(): string[];
  createConnection(push?: (reply: Reply) => void): Connection;
  releaseConnection(conn: Connection): void;
  execute(args: (string | Buffer)[], conn?: Connection): Reply;
  call(argv: string[], conn: Connection): Reply;
  private checkArity;
  private unknownCommandMessage;
  isSubscribed(conn: Connection): boolean;
  subscriptionCount(conn: Connection): number;
  subscribe(conn: Connection, name: string, kind: 'channels' | 'patterns' | 'shards'): void;
  unsubscribe(conn: Connection, name: string, kind: 'channels' | 'patterns' | 'shards'): boolean;
  unsubscribeAll(conn: Connection): void;
  publish(channel: string, message: string): number;
  spublish(channel: string, message: string): number;
  flushAll(): void;
  startSweeper(interval?: number): void;
  stopSweeper(): void;
  keyspace(): {
    index: number;
    keys: number;
    expires: number;
  }[];
}
//#endregion
//#region src/engine/errors.d.ts
declare class RedisError extends Error {
  constructor(message: string);
}
//#endregion
//#region src/engine/glob.d.ts
declare const globMatch: (pattern: string, str: string) => boolean;
//#endregion
//#region src/resp.d.ts
declare class ProtocolError extends Error {
  constructor(message: string);
}
declare class RespParser {
  private buffer;
  push(chunk: Buffer): string[][];
  private readLine;
  private parseInline;
  private parseMultiBulk;
}
type Protocol = 2 | 3;
declare const encodeReply: (reply: Reply, protocol?: Protocol) => string;
//#endregion
//#region src/redis-server.d.ts
type RedisEngineKind = 'memory' | 'redis';
type RedisServerOptions = {
  host?: string;
  port?: number;
  databases?: number;
  engine?: RedisEngineKind;
  version?: string;
  args?: string[];
};
declare class RedisServer {
  readonly engine: RedisEngineKind;
  readonly host: string;
  private readonly memory;
  private readonly real;
  constructor(options?: RedisServerOptions);
  get port(): number;
  listen(port?: number): Promise<void>;
  close(): Promise<void>;
  flushAll(): Promise<void>;
  onExit(handler: (code: number | null, signal: string | null) => void): void;
  onOutput(handler: (line: string) => void): void;
}
//#endregion
//#region src/server.d.ts
type MemoryRedisServerOptions = {
  host?: string;
  port?: number;
  databases?: number;
};
declare class MemoryRedisServer {
  readonly host: string;
  readonly engine: RedisEngine;
  private defaultPort;
  private server;
  private sockets;
  private boundPort;
  constructor(options?: MemoryRedisServerOptions);
  get port(): number;
  listen(port?: number): Promise<void>;
  close(): Promise<void>;
  flushAll(): void;
  private handle;
}
//#endregion
//#region src/real-server.d.ts
type RealRedisServerOptions = {
  host?: string;
  port?: number;
  databases?: number;
  version?: string;
  args?: string[];
};
declare class RealRedisServer {
  readonly host: string;
  private readonly options;
  private process;
  private boundPort;
  private stopping;
  constructor(options?: RealRedisServerOptions);
  get port(): number;
  listen(port?: number): Promise<void>;
  onExit(handler: (code: number | null, signal: string | null) => void): void;
  onOutput(handler: (line: string) => void): void;
  close(): Promise<void>;
  flushAll(): Promise<void>;
}
//#endregion
export { type Connection, MemoryRedisServer, type MemoryRedisServerOptions, type Protocol, ProtocolError, RealRedisServer, type RealRedisServerOptions, RedisEngine, type RedisEngineKind, type RedisEngineOptions, RedisError, RedisServer, type RedisServerOptions, type Reply, RespParser, encodeReply, globMatch, toResp2 };