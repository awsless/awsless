# @awsless/redis-server

A local Redis server for tests and the awsless local dev environment. The default engine is a pure TypeScript in-memory implementation that speaks RESP over TCP, so nothing needs to be downloaded or compiled. The real redis binary is available as an opt-in engine.

## Usage

```ts
import { RedisServer } from '@awsless/redis-server'

// In-memory engine (default)
const server = new RedisServer()

// Or the real binary, built through redis-memory-server on first use
const server = new RedisServer({ engine: 'redis', version: '7.2.4' })

await server.listen()
console.log(server.host, server.port)

await server.flushAll()
await server.close()
```

## Options

| Option      | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| `engine`    | `'memory'` (default) or `'redis'` for the real binary.            |
| `host`      | Bind address, `127.0.0.1` by default.                             |
| `port`      | Port to bind, `0` (OS assigned) by default.                       |
| `databases` | Number of databases, `16` by default.                             |
| `version`   | Real engine only: the redis version to build, `7.2.4` by default. |
| `args`      | Real engine only: extra `redis-server` arguments.                 |

## In-memory engine

Covers the commands the `@awsless/redis` client library issues, plus what ioredis, the dev dashboard and the pubsub relay need: strings, hashes (including field expiry), lists, sets, sorted sets, keys and expiry, pub/sub, transactions, pipelining, `INFO`, `SCAN` and Lua scripting (`EVAL`, `EVALSHA`, `SCRIPT`) through a Lua 5.3 VM. RESP2 and RESP3 are both supported.

Anything not implemented replies with a Redis-style error, never a silent no-op.

Known simplifications: Lua is 5.3 rather than 5.1, memory statistics in `INFO` are fake, blocking commands, streams, geo, hyperloglog and bitmaps are not implemented.

## Real engine

`engine: 'redis'` uses `redis-memory-server`, which downloads and compiles redis from source on first use. It needs network access and a C compiler. The opt-in test runs with `AWSLESS_LOCAL_ENGINE=real pnpm test`.
