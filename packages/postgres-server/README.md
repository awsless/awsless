# @awsless/postgres-server

A real local Postgres 17 server for tests and local development. There is no in-memory engine: tests get the real planner, real locks and as many connections as they open.

```ts
import { PostgresServer } from '@awsless/postgres-server'

const server = new PostgresServer() // a temporary data directory, removed on close

await server.listen()
console.log(server.url) // postgres://postgres:postgres@127.0.0.1:<port>/postgres
await server.close()
```

| Option     | Description                                                                           |
| ---------- | ------------------------------------------------------------------------------------- |
| `port`     | The port to listen on. A free one is picked without it.                               |
| `onExit`   | Called when the server dies after it started, without `close()` asking for it.        |
| `onOutput` | Called with each line of the server log after it started, failed statements included. |

`url` is a superuser on the `postgres` database, reachable from this machine only (`127.0.0.1`, no socket file).

## The server

- It runs in UTC, with passwords checked through `scram-sha-256`, like a deployed database.
- Text sorts and changes case by ICU's `en-US` rules on every machine, close to the `en_US.UTF-8` of a deployed database. This machine's own locale would give another order per operating system.
- It takes 500 connections, so every worker of a test run can hold a pool.
- Its data lives in a temporary directory that `close()` removes, so it skips disk syncs (`fsync=off`).

## The binaries

They come from the npm package `embedded-postgres` (pinned to `17.11.0-beta.19`), which installs the build for this machine as `@embedded-postgres/<platform>-<arch>`, about 300 MB on disk. Nothing is downloaded at runtime.

Only that package's files are used, never its own server class: importing it installs exit handlers in the process, which a CLI can't have.

The Linux builds list library links that their install script creates. This server creates them itself on its first start, so the install script doesn't need to run: no `trustedDependencies` (bun) or `allowBuilds` approval (pnpm) is needed.

## Known limits

- macOS and Linux only.
- A parent that is killed hard (`SIGKILL`) can't stop its server. A temporary directory is named after the process that owns it, and every start stops and removes the temporary servers whose owner is gone.
