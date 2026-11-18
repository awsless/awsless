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
	float32,
} from '@awsless/clickhouse'

const events = define(
	'events',
	object({
		id: string(),
		projectId: string({ lowCardinality: true }),
		flags: array(string({ lowCardinality: true })),
		score: float32(),
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

## The query builder

`clickhouseQueryBuilder` puts a typed query builder ([Kysely](https://kysely.dev)) on a client. In an awsless app it is `ClickHouse.db`, typed from the tables the stack files declare. A table is named by its stack, `stack.table`, so a query can join the tables of several stacks; the builder writes the table's own name into the sql.

```ts
import { ClickHouse } from 'awsless'

await ClickHouse.db
	.insertInto('shop.orders')
	.values({ id, customer, items: 3, total: new BigFloat('19.99'), createdAt: new Date() })
	.execute()

const totals = await ClickHouse.db
	.selectFrom('shop.orders as o')
	.innerJoin('crm.customers as c', 'c.id', 'o.customer')
	.select(eb => ['c.name', eb.fn.agg<bigint>('sum', ['o.items']).as('items')])
	.where('o.createdAt', '>=', since)
	.groupBy('c.name')
	.execute()
```

What to know:

- Every value travels as a typed ClickHouse parameter (`{p1:String}`) next to the sql, never inside it. A `limit` and an `offset` are written as the whole numbers they are.
- An insert of plain values is sent as rows, the way ClickHouse takes them in bulk. A column a row leaves out gets its default.
- A result is read by the type of its columns: a whole number of 64 bits or more is a `bigint` and a `Decimal` a `BigFloat` (`@awsless/big-float`), so both keep every digit. A `DateTime` and a `DateTime64` are a `Date`, a `Date` its text (`2026-11-18`). `count()` is a `UInt64`, so a `bigint`.
- An alias takes the place of a column of the same name in the whole query, so `sum(duration) as duration` fails: give the result another name.
- ClickHouse has no transactions and changes rows with a mutation: `transaction()` and `updateTable()` say so instead of running. `deleteFrom()` is a lightweight delete.
- Sql the builder has no word for (`FINAL`, `ARRAY JOIN`, `PREWHERE`) goes in a `sql` fragment or a whole `sql` query, whose values are parameters too. There a table goes by its own name.
- The in-memory engine of `@awsless/clickhouse-server` keeps a `Decimal` as a JavaScript number, so locally a decimal has the digits of one. The real engine keeps them all.

Outside an awsless app:

```ts
const db = clickhouseQueryBuilder<Tables>({
	client: () => client,
	// How `stack.table` is called in ClickHouse. Leave it out to name tables as they are.
	tableName: (stack, table) => `${stack}--${table}`,
})
```
