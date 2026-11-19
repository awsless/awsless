# @awsless/clickhouse-server

A local ClickHouse server for tests and local development, with two engines:

- `memory` (default): ClickHouse's HTTP interface and SQL in TypeScript, in-process. No download, no binary, boots in milliseconds.
- `clickhouse`: the real ClickHouse binary (26.8 LTS), downloaded once to `~/.cache/awsless/clickhouse` and checked against its sha256.

```ts
import { ClickHouseServer } from '@awsless/clickhouse-server'

const server = new ClickHouseServer() // in-memory
const server = new ClickHouseServer({ engine: 'clickhouse' }) // real binary

await server.listen()
console.log(server.endpoint) // http://127.0.0.1:<port>
await server.reset() // drop every table
await server.close()
```

Both run in UTC, like ClickHouse Cloud, and speak enough of the HTTP interface for the official `@clickhouse/client`: queries in the body or `query` param, `param_*` query parameters, settings, gzip, and errors in ClickHouse's own words (`Code: 60. DB::Exception: ... (UNKNOWN_TABLE)` with `X-ClickHouse-Exception-Code`).

## The in-memory engine

It covers the SQL apps write against a MergeTree table:

- DDL: `CREATE TABLE` (MergeTree family, Memory, Log), `ALTER` (columns, indexes, TTL, settings, comments, `DELETE`, `UPDATE`), `DROP`, `TRUNCATE`, `RENAME`, `OPTIMIZE ... FINAL`, `EXISTS`, `SHOW TABLES`, `SHOW CREATE TABLE`, `DESCRIBE`, and `system.tables`, `system.columns`, `system.mutations` and friends, with `create_table_query` written the way ClickHouse writes it.
- Inserts in `JSONEachRow`, `JSONCompactEachRow`, `TabSeparated`, `CSV` and `VALUES`, with defaults, `MATERIALIZED` columns and best effort date parsing.
- `SELECT` with `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY` (positional, `NULLS FIRST/LAST`), `DISTINCT`, `LIMIT BY`, `LIMIT/OFFSET`, `UNION`, `WITH`, subqueries, `IN`, joins (`INNER`, `LEFT`, `RIGHT`, `FULL`, `CROSS`, `ON`/`USING`), `ARRAY JOIN`, `arrayJoin()`, `FINAL` on ReplacingMergeTree & SummingMergeTree, and table functions `numbers`, `zeros`, `values`.
- About 500 scalar functions (names & aliases) and 70 aggregates: arithmetic, conditionals, conversions, dates in any time zone, strings, regular expressions, arrays with lambdas, maps, tuples, JSON strings and JSON columns; the aggregates take the `-If`, `-Distinct`, `-Array`, `-OrNull` & `-OrDefault` combinators, including `quantiles`, `topK`, `windowFunnel` and `retention`.
- Output formats: `JSONEachRow`, `JSONCompactEachRow` (and its `WithNames` variants), `JSON`, `JSONCompact`, `TabSeparated` (and variants), `CSV` (and variants), `Values`.

Result columns get ClickHouse's names (`plus(1, 1)`, `count()`), and query parameters are substituted the way ClickHouse substitutes them.

Everything else fails with a ClickHouse-shaped error that names what's missing (`NOT_IMPLEMENTED`, `SYNTAX_ERROR`), so a test never silently matches nothing. Not implemented: window functions, `-State`/`-Merge` aggregates, materialized views, dictionaries, projections and the native TCP protocol.

`uniq`, `quantile` and `topK` answer exactly where ClickHouse estimates; they agree on the small data tests use.

## Conformance

`test/conformance.ts` runs every case on both engines and requires byte-identical answers (errors compare their code and type). It runs against the real binary whenever it's cached, or with `AWSLESS_LOCAL_ENGINE=real`, and keeps the verified answers as snapshots for runs without it.
