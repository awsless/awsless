# @awsless/clickhouse

A typed ClickHouse client for Lambda, laid out like `@awsless/open-search`: column schemas, a table definition and operations, on top of the official `@clickhouse/client`.

```ts
import {
	clickhouseClient,
	define,
	insert,
	object,
	query,
	select,
	string,
	date,
	array,
	number,
} from '@awsless/clickhouse'

const events = define(
	'events',
	object({
		id: string(),
		projectId: string({ lowCardinality: true }),
		flags: array(string({ lowCardinality: true })),
		score: number(),
		createdAt: date(),
	}),
	() => clickhouseClient({ endpoint: process.env.CLICKHOUSE_ENDPOINT!, password: 'secret' })
)

await insert(events, [{ id: 'a', projectId: 'p1', flags: ['vpn'], score: 3, createdAt: new Date() }], { async: true })

// Whole rows through the schema.
const rows = await select(events, { where: 'projectId = {projectId:String}', params: { projectId: 'p1' }, limit: 10 })

// Any sql, with the table bound to {table:Identifier}.
const days = await query<{ day: string; count: number }>(
	events,
	'SELECT toString(toDate(createdAt, {zone:String})) AS day, count() AS count FROM {table:Identifier} GROUP BY day ORDER BY day',
	{ zone: 'Europe/Amsterdam' }
)
```

Values always travel as `{name:Type}` parameters, never inside the SQL text; `query()` binds the table to the parameter named `table`, which is reserved for it. Results come back with plain numbers for 64-bit integers and ISO strings for dates.

- Schemas: `string`, `number`, `boolean`, `date`, `uuid`, `enums`, `array`, `nullable`, `map`, `json`, `object`, and `optional` for a column the server fills in (a `DEFAULT` or `MATERIALIZED` expression in the stack file), which an insert may leave out.
- Ops: `insert`, `select`, `query`, `count`, `deleteRows`, `createTable`, `dropTable`.
- `createTableStatement(name, definition)` writes the `CREATE TABLE` for a table definition with string column types.

The tests run against `@awsless/clickhouse-server`'s in-memory engine.
