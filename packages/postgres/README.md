# @awsless/postgres

A thin Postgres client for Lambda: one `query` call over a connection (`pg`, node-postgres) or through the RDS Data API, and `applySchema` to bring a schema up to its declared tables and function files.

Both ways in take the same SQL and parameters and give the same rows and errors, so code that runs on a local Postgres runs unchanged on Aurora through the Data API.

```ts
import { getSqlState, postgresClient } from '@awsless/postgres'

const client = postgresClient({
	url: 'postgres://app:secret@db.example.com:5432/app',
	schema: 'orders', // unqualified names resolve here
})

const rows = await client.query<{ id: string; total: number }>(
	'SELECT id, total::float8 AS total FROM orders WHERE customer = $1',
	['customer-1042']
)

await client.close()
```

## The client

`postgresClient(props)` returns `{ query(sql, params?), close() }`.

| Prop     | Description                                                                            |
| -------- | -------------------------------------------------------------------------------------- |
| `url`    | `postgres://user:password@host:5432/database`, without parameters.                     |
| `schema` | The `search_path` of every connection, before `public`, so SQL uses unqualified names. |
| `max`    | The most connections open at once, 4 by default.                                       |

- Connections open on first use and stay open until `close()`. A query waits when all `max` are busy.
- A connection the server closed is dropped, and the next query opens another.
- Values come back as `pg` reads them: `bigint` and `numeric` as strings, `timestamptz` as a `Date`, `json` and `jsonb` parsed. Cast in SQL where a number is wanted: `count(*)::int`.
- A call with several statements and no params answers with the rows of the last one (not with `strict`).
- `close()` ends the pool; a query after it opens a new one.

### strict

`postgresClient({ ..., strict: true })` is a connection that takes no more than the Data API does, for the local and test side of code that is deployed behind the Data API. A query the Data API would refuse is refused here the same way:

- One statement a call (`TypeError`).
- A parameter for every placeholder and no more (`TypeError`).
- A query of at most 65,536 characters with its values written in (`RangeError`, see Parameters below).
- Columns of the types the Data API returns. Another type (`interval`, a range, a multirange, a record, `timestamptz[]`, an array of arrays) fails with SQLSTATE `0A000`: cast it to text in the query (`days::text`), or return it as `jsonb`.
- A result of at most 1 MiB (SQLSTATE `54000`).
- A statement gets 45 seconds (`statement_timeout`, SQLSTATE `57014`).

## The Data API client

`postgresDataClient(props)` returns the same `{ query(sql, params?), close() }`, with every query one `ExecuteStatement` call of the RDS Data API: no connection, no pool, no password in the function.

```ts
import { postgresDataClient } from '@awsless/postgres'

const client = postgresDataClient({
	clusterArn: 'arn:aws:rds:eu-west-1:123456789012:cluster:app-postgres',
	secretArn: 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:rds!cluster-…',
	database: 'orders',
})
```

| Prop            | Description                                                                            |
| --------------- | -------------------------------------------------------------------------------------- |
| `clusterArn`    | The Aurora cluster, with its Data API on.                                              |
| `secretArn`     | The Secrets Manager secret with the user and password the Data API logs in with.       |
| `database`      | The database the query runs in.                                                        |
| `resumeTimeout` | How long a query waits for a paused cluster to resume, in milliseconds. A minute.      |
| `client`        | The `RDSDataClient` that sends the calls, with its own credentials and region.         |

The caller needs `rds-data:ExecuteStatement` (and `BeginTransaction`, `CommitTransaction`, `RollbackTransaction` for `applySchema`) on the cluster and `secretsmanager:GetSecretValue` on the secret.

The Data API keeps nothing between two calls: it resets a session before the next call uses it. There is no `schema` prop for that reason, since a `search_path` set on a session is gone at the next query. Set it on the database instead (`ALTER DATABASE orders SET search_path TO orders, public`).

### Parameters

The SQL keeps pg's placeholders (`$1`) and its values (strings, numbers, booleans, `null`, a `Date`, arrays, objects as json, a `Buffer`). The Data API itself only knows typed parameters, where Postgres refuses a string for a `uuid` or a `timestamptz` column. To keep pg's behaviour, where Postgres types a value by the place it stands in:

- A value is written into the SQL as an escaped literal, in the text pg would send. `WHERE project_id = $1` becomes `WHERE project_id = '6f1c…'`, which Postgres reads as a uuid.
- A placeholder with a cast behind it (`$2::jsonb`, `$3::text[]`, `$4::bigint[]`, `$5::timestamptz`) goes as a real parameter, as text that the cast turns into its type. So a big value belongs behind a cast: the SQL has room for 65,536 characters, a parameter for what is left of a request of 4 MiB.
- A query that doesn't fit either fails before any call, with what to do about it.

### Results

Values come back as over a connection: the Data API's typed fields are turned into the text Postgres sends and read by pg's own parsers. `bigint` and `numeric` are strings, `timestamptz` and `timestamp` a `Date`, `date` a `Date`, `json` and `jsonb` parsed, arrays as arrays, `uuid` and text as strings, `NULL` as `null`.

### Errors

An error of Postgres is the same `PostgresError` with the same SQLSTATE, read out of the Data API's wording of it, with its detail, hint, position and where. Besides those:

| What happened                                       | SQLSTATE |
| --------------------------------------------------- | -------- |
| The statement ran over 45 seconds and was stopped   | `57014`  |
| A column of a type the Data API can't return        | `0A000`  |
| A result of over 1 MiB                              | `54000`  |
| The cluster is still resuming after `resumeTimeout` | `57P03`  |

An error of the service itself (no access, no such cluster, the service unavailable) is thrown as the AWS SDK gives it, and `getSqlState` answers `undefined`.

A query is sent once: the SDK's own retries are off, since a call that failed halfway or whose answer got lost may have run. Only a call that a paused cluster cancelled is made again (below).

### A paused cluster

An Aurora Serverless v2 cluster that scales to zero pauses when idle. The first query after it is cancelled by the Data API (`DatabaseResumingException`) while the cluster resumes, which takes about 15 seconds, and 30 or more after a day asleep. The client sends the query again until it is answered, so the caller sees a slow first query, not an error. A function with a timeout shorter than the resume times out on it.

## Errors

A failed query rejects with `PostgresError` (pg's `DatabaseError`). `getSqlState(error)` reads its SQLSTATE, or `undefined` for an error Postgres didn't answer (a refused connection).

```ts
try {
	await client.query('SELECT merge_groups($1, $2)', [a, b])
} catch (error) {
	if (getSqlState(error) === '40P01') {
		// a deadlock: Postgres rolled this one back, run it again
	}

	throw error
}
```

## applySchema

Brings a schema up to its declaration: tables as data, functions as SQL files. It takes either client.

```ts
import { applySchema } from '@awsless/postgres'

await applySchema(client, {
	schema: 'orders',
	tables: {
		orders: {
			columns: {
				id: { type: 'bigint', identity: true },
				customer_id: 'uuid',
				reference: { type: 'text', collate: 'C' },
				total: { type: 'numeric(12, 2)', default: '0' },
				shipped_at: 'timestamptz?',
			},
			primaryKey: ['customer_id', 'id'],
			indexes: {
				reference: { columns: ['customer_id', 'reference'], unique: true },
				shipped: ['customer_id', 'shipped_at'],
			},
			partitionBy: { hash: ['customer_id'], partitions: 16 },
			fillfactor: 85,
		},
	},
	functions: [{ name: 'function.sql', sql: await readFile('function.sql', 'utf8') }],
})
```

### A table

| Part          | Description                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `columns`     | Each column by name: its type, or `{ type, default?, collate?, identity? }`.                                          |
| `type`        | Any Postgres type as written. The column is `NOT NULL`, unless the type ends in `?`.                                  |
| `default`     | An SQL expression as written: `now()`, `0`, `'{}'`.                                                                   |
| `collate`     | The collation of a text column, like `C`.                                                                             |
| `identity`    | `GENERATED ALWAYS AS IDENTITY`.                                                                                       |
| `primaryKey`  | The key columns, in order.                                                                                            |
| `indexes`     | Each index by name: its columns, or `{ columns, unique? }`. In Postgres it is called `<table>_<name>`.                |
| `partitionBy` | `{ hash: [...columns], partitions }`: the rows spread over that many partitions, called `<table>_p0` and up.          |
| `fillfactor`  | The percentage of every page an insert fills. A partitioned table has no pages of its own, so its partitions take it. |

Names of tables, columns and indexes take lowercase letters, digits and underscores.

### What an apply does

In one transaction, with the schema as the search path (before `public`):

1. The schema is created when it's missing.
2. Each declared table is created, or changed to its declaration.
3. A table that left the declaration is dropped, when awsless made it.
4. Every function, procedure and aggregate in the schema is dropped. They hold no data and the files create them again, so one that left the files is gone and a changed signature leaves no old twin behind. A function that a trigger, an index or an extension still needs stays; `CREATE OR REPLACE FUNCTION` in the files changes it in place.
5. Each function file runs in order, one statement at a time.

A change that fails rolls everything back. The error names the table (`Postgres table "orders": column "note" of relation "orders" contains null values`) or the file and line (`function.sql:12: syntax error at or near "RETRUN"`).

### Changing a table

The definition a table was made with is stored in its comment, and the next apply compares against that, not against how Postgres spells things.

Applied in place, keeping the rows:

- a new or dropped column
- another default
- a column made nullable or `NOT NULL`
- a new, dropped or changed index
- another fillfactor

Refused with a `TableChangeError` that names the table and the change, before anything runs:

- another primary key
- another type, collation or identity of a column
- other partitioning: its columns, its count, or having it at all
- a table of that name that awsless didn't make

`alterTableStatements(name, prior, next)` is the same check without a database: it returns the statements of a change or throws the `TableChangeError`, so a deploy can refuse a change while it plans.

### Options

`applySchema(client, definition, options)`:

| Option     | Description                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------- |
| `reset`    | Start from an empty schema: it is dropped first, with everything in it.                            |
| `recreate` | Drop and create a table whose change is refused, instead of the error. For local data that can go. |
| `retain`   | Keep a table that left the declaration, for an app that retains its data.                          |

### Functions and extensions

An extension belongs to the whole database, so a file installs it into `public`, where every schema finds it: `CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public`. Without `SCHEMA public` it lands in the schema of whoever ran first, out of sight for the others.

Two applies of one schema run one after the other, and so do the function files of every schema on a server, so two that start together never trip over the same table or extension.

Statements that can't run in a transaction (`CREATE INDEX CONCURRENTLY`, `VACUUM`) can't be in the files.

### Through the Data API

The same apply, with a call per statement inside one Data API transaction:

- A statement that takes longer than its call (45 seconds) keeps running (`continueAfterTimeout`), and the apply waits for it before the next one. If it then fails, the apply fails at the next statement with "current transaction is aborted" instead of the statement's own error.
- A transaction lives an hour at most, so that is the longest an apply can take. A change that needs longer (a column or index on a very large table) has to be made by hand.
- A statement of a function file is 65,536 characters at most.

The tests run against `@awsless/postgres-server`, and through `fakeDataApi` from `@awsless/postgres/fake-data-api`: a stand-in for the Data API in front of a local Postgres, whose `send` a test's mock of `RDSDataClient` hands its commands to.
