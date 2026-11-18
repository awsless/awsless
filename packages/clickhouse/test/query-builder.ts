import { BigFloat } from '@awsless/big-float'
import { ClickHouseServer } from '@awsless/clickhouse-server'
import {
	clickhouseClient,
	clickhouseQueryBuilder,
	sql,
	type ClickHouseClient,
	type ClickHouseColumn,
	type ClickHouseGenerated,
} from '../src'

type Tables = {
	'shop.orders': {
		id: string
		customer: string
		items: ClickHouseColumn<bigint, bigint | number | string, never>
		total: ClickHouseColumn<BigFloat, BigFloat | number | string, never>
		tags: string[]
		note: string | null
		paid: boolean
		created_at: ClickHouseColumn<Date, Date | string, never>
		day: ClickHouseGenerated<string>
	}
	'crm.customers': {
		id: string
		name: string
	}
}

// With `AWSLESS_LOCAL_ENGINE=real` the same tests run on the ClickHouse binary.
const engine = process.env.AWSLESS_LOCAL_ENGINE === 'real' ? 'clickhouse' : 'memory'

// The in-memory engine keeps a decimal as a JavaScript number, so only the
// binary is asked for more digits than that holds.
const price = engine === 'clickhouse' ? '1234567890123456789.0123456789' : '1234567.0125'
const sum = engine === 'clickhouse' ? '1234567890123456799.2623456789' : '1234577.2625'

describe(`clickhouseQueryBuilder (${engine})`, () => {
	const server = new ClickHouseServer({ engine })
	let client: ClickHouseClient
	let db: ReturnType<typeof clickhouseQueryBuilder<Tables>>

	beforeAll(async () => {
		await server.listen()

		client = clickhouseClient({ endpoint: server.endpoint })
		db = clickhouseQueryBuilder<Tables>({
			client: () => client,
			// The tables of a stack carry its name in front.
			tableName: (stack, table) => `${stack}--${table}`,
		})

		await client.command(
			`CREATE TABLE \`shop--orders\` (
				id String,
				customer String,
				items UInt64,
				total Decimal(38, 10),
				tags Array(String),
				note Nullable(String),
				paid Bool,
				created_at DateTime64(3, 'UTC'),
				day Date DEFAULT toDate(created_at)
			) ENGINE = MergeTree ORDER BY id`
		)
		await client.command('CREATE TABLE `crm--customers` (id String, name String) ENGINE = MergeTree ORDER BY id')
	}, 300_000)

	afterAll(async () => {
		await client.close()
		await server.close()
	})

	beforeEach(async () => {
		await client.command('TRUNCATE TABLE `shop--orders`')
		await client.command('TRUNCATE TABLE `crm--customers`')
	})

	const at = new Date('2026-11-18T10:30:00.123Z')
	const order = {
		id: 'o1',
		customer: 'c1',
		items: 18_446_744_073_709_551_615n,
		total: new BigFloat(price),
		tags: ['a', "it's"],
		note: null,
		paid: true,
		created_at: at,
	}

	it('writes rows and reads them back with exact numbers & dates', async () => {
		const result = await db
			.insertInto('shop.orders')
			.values([
				// A row may leave out a column another row has.
				{ ...order, note: undefined },
				{ ...order, id: 'o2', items: 2, total: 0.5, note: 'second', paid: false },
			])
			.executeTakeFirst()

		expect(result.numInsertedOrUpdatedRows).toBe(2n)

		const rows = await db.selectFrom('shop.orders').selectAll().orderBy('id').execute()

		expect(rows[0]).toEqual({ ...order, day: '2026-11-18' })
		expect(rows[0]!.items).toBe(18_446_744_073_709_551_615n)
		expect(rows[0]!.total).toBeInstanceOf(BigFloat)
		expect(rows[0]!.total.toString()).toBe(price)
		expect(rows[0]!.created_at).toEqual(at)
		expect(rows[1]).toMatchObject({ id: 'o2', items: 2n, note: 'second', paid: false })
	})

	it('sends every value as a typed parameter, never inside the sql', async () => {
		await db.insertInto('shop.orders').values(order).execute()

		const query = db
			.selectFrom('shop.orders')
			.select('id')
			.where('customer', '=', "c1' OR 1=1 --")
			.where('created_at', '>=', at)
			.where('paid', '=', true)
			.where('items', '>', 5n)
			.where('id', 'in', ['o1', 'o2'])
			.limit(10)

		const compiled = query.compile()

		expect(compiled.sql).toBe(
			"select `id` from `shop--orders` where `customer` = {p1:String} and `created_at` >= {p2:DateTime64(3, 'UTC')} and `paid` = {p3:Bool} and `items` > {p4:Int64} and `id` in ({p5:String}, {p6:String}) limit 10"
		)
		expect(compiled.parameters).toEqual(["c1' OR 1=1 --", '2026-11-18 10:30:00.123', true, '5', 'o1', 'o2'])

		// The quote is a value, so it matches nothing instead of everything.
		expect(await query.execute()).toEqual([])
		expect(
			await db
				.selectFrom('shop.orders')
				.select('id')
				.where('customer', '=', 'c1')
				.where('created_at', '>=', at)
				.where('paid', '=', true)
				.where('items', '>', 5n)
				.where('total', '>', new BigFloat('1.5'))
				.where('id', 'in', ['o1', 'o2'])
				.execute()
		).toEqual([{ id: 'o1' }])
	})

	it('joins the tables of two stacks and aggregates', async () => {
		await db.insertInto('crm.customers').values({ id: 'c1', name: 'Jane' }).execute()
		await db
			.insertInto('shop.orders')
			.values([order, { ...order, id: 'o2', items: 3, total: '10.25' }])
			.execute()

		const rows = await db
			.selectFrom('shop.orders as o')
			.innerJoin('crm.customers as c', 'c.id', 'o.customer')
			.select(eb => [
				'c.name',
				eb.fn.count<bigint>('o.id').as('orders'),
				eb.fn.agg<BigFloat>('sum', ['o.total']).as('total'),
			])
			.groupBy('c.name')
			.execute()

		expect(rows).toHaveLength(1)
		expect(rows[0]!.name).toBe('Jane')
		expect(rows[0]!.orders).toBe(2n)
		expect(rows[0]!.total.toString()).toBe(sum)
	})

	it('runs sql written out, with its values as parameters too', async () => {
		await db.insertInto('shop.orders').values(order).execute()

		const { rows } = await sql<{ id: string; tag: string }>`
			SELECT id, arrayJoin(tags) AS tag FROM \`shop--orders\` WHERE customer = ${'c1'} ORDER BY tag
		`.execute(db)

		expect(rows).toEqual([
			{ id: 'o1', tag: 'a' },
			{ id: 'o1', tag: "it's" },
		])
	})

	it('finds a whole number wider than 64 bits, and reads a named tuple by its names', async () => {
		await client.command(
			'CREATE TABLE `shop--wide` (id String, big UInt128, pair Tuple(name String, amount UInt64), plain Tuple(String, UInt64)) ENGINE = MergeTree ORDER BY id'
		)

		const wide = clickhouseQueryBuilder<{
			'shop.wide': {
				id: string
				big: bigint
				pair: { name: string; amount: bigint }
				plain: [string, bigint]
			}
		}>({ client: () => client, tableName: (stack, table) => `${stack}--${table}` })

		const big = 2n ** 80n

		await wide
			.insertInto('shop.wide')
			.values({ id: 'w1', big, pair: { name: 'abc', amount: 42n }, plain: ['x', 7n] })
			.execute()

		const query = wide.selectFrom('shop.wide').selectAll().where('big', '=', big)

		expect(query.compile().sql).toContain('{p1:Int128}')
		expect(await query.execute()).toEqual([{ id: 'w1', big, pair: { name: 'abc', amount: 42n }, plain: ['x', 7n] }])
		expect(
			wide
				.selectFrom('shop.wide')
				.select('id')
				.where('big', '=', 2n ** 200n)
				.compile().sql
		).toContain('{p1:Int256}')

		await client.command('DROP TABLE `shop--wide`')
	})

	it('gives an array parameter the one type that holds all its items', async () => {
		const typeOf = (items: unknown[]) => {
			return /CAST\(\{p1:String\}, '(.*)'\)/.exec(sql`SELECT ${items} AS items`.compile(db).sql)?.[1]
		}

		expect(typeOf([1, 2])).toBe('Array(Int64)')
		expect(typeOf([1, 1.5])).toBe('Array(Float64)')
		expect(typeOf([1n, 2n ** 80n])).toBe('Array(Int128)')
		expect(typeOf([-1, 2n ** 64n - 1n])).toBe('Array(Int128)')
		expect(typeOf(['a', null])).toBe('Array(Nullable(String))')
		expect(typeOf([new BigFloat('1.5'), 2])).toBe('Array(Decimal(76, 1))')
		expect(typeOf([])).toBe('Array(Nothing)')
		expect(typeOf([1e300])).toBe('Array(Float64)')
		// Items of different kinds are a tuple.
		expect(typeOf(['a', 1])).toBe('Tuple(String, Int64)')

		const read = async (items: unknown[]) => {
			const { rows } = await sql<{ items: unknown[] }>`SELECT ${items} AS items`.execute(db)

			return rows[0]!.items
		}

		expect(await read([1, 1.5])).toEqual([1, 1.5])
		expect(await read(['a', null])).toEqual(['a', null])
		expect(await read([1n, 2n ** 80n])).toEqual([1n, 2n ** 80n])
		expect(await read([])).toEqual([])
		expect(await read(["it's", 'a\\b', ''])).toEqual(["it's", 'a\\b', ''])
		expect((await read([new BigFloat('1.5'), 2])).map(String)).toEqual(['1.5', '2'])
		expect(await read([[1, 2], [3]])).toEqual([[1n, 2n], [3n]])
		expect(await read([at, null])).toEqual([at, null])
	})

	it('deletes rows, and says what ClickHouse has no word for', async () => {
		await db.insertInto('shop.orders').values(order).execute()
		await db.deleteFrom('shop.orders').where('id', '=', 'o1').execute()

		expect(await db.selectFrom('shop.orders').select('id').execute()).toEqual([])

		await expect(db.updateTable('shop.orders').set({ customer: 'x' }).execute()).rejects.toThrow(
			'ClickHouse changes rows with a mutation'
		)
		await expect(db.transaction().execute(async () => {})).rejects.toThrow('ClickHouse has no transactions')
		await expect(db.insertInto('shop.orders').values(order).returningAll().execute()).rejects.toThrow(
			'ClickHouse inserts rows and nothing more'
		)
		await expect(
			db
				.insertInto('shop.orders')
				.values(order)
				.onConflict(conflict => conflict.doNothing())
				.execute()
		).rejects.toThrow('ClickHouse inserts rows and nothing more')
		expect(await db.selectFrom('shop.orders').select('id').execute()).toEqual([])
	})
})

// How a statement reaches the client, without a server.
describe('clickhouseQueryBuilder calls', () => {
	const calls: { call: string; table?: unknown; sql?: string }[] = []
	const client = {
		queryTyped: async (sql: string) => {
			calls.push({ call: 'queryTyped', sql })

			return { columns: [], rows: [] }
		},
		command: async (sql: string) => {
			calls.push({ call: 'command', sql })
		},
		insert: async (table: unknown) => {
			calls.push({ call: 'insert', table })
		},
	} as unknown as ClickHouseClient

	const db = clickhouseQueryBuilder<{ 'other.events': { id: string }; events: { id: string } }>({
		client: () => client,
	})

	beforeEach(() => {
		calls.length = 0
	})

	it('names a table as it is written without a `tableName`, its database included', async () => {
		await db.insertInto('other.events').values({ id: 'a' }).execute()
		await db.insertInto('events').values({ id: 'a' }).execute()
		await db.selectFrom('other.events').selectAll().execute()

		expect(calls).toEqual([
			{ call: 'insert', table: ['other', 'events'] },
			{ call: 'insert', table: 'events' },
			{ call: 'queryTyped', sql: 'select * from `other`.`events`' },
		])
	})

	it('explains an insert instead of writing its row', async () => {
		await db.insertInto('events').values({ id: 'a' }).explain()

		expect(calls.map(entry => entry.call)).not.toContain('insert')
	})

	it('reads sql written out unless it starts as a statement that writes', async () => {
		await sql`EXPLAIN SELECT 1`.execute(db)
		await sql`DESC events`.execute(db)
		await sql`/* the newest */ (SELECT 1)`.execute(db)
		await sql`-- a note
	WITH 1 AS one SELECT one`.execute(db)
		await sql`OPTIMIZE TABLE events FINAL`.execute(db)
		await sql`  alter table events delete where id = ${'a'}`.execute(db)

		expect(calls.map(entry => entry.call)).toEqual([
			'queryTyped',
			'queryTyped',
			'queryTyped',
			'queryTyped',
			'command',
			'command',
		])
	})
})
