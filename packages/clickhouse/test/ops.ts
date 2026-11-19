import { ClickHouseServer } from '@awsless/clickhouse-server'
import {
	array,
	boolean,
	clickhouseClient,
	count,
	createTable,
	date,
	define,
	deleteRows,
	dropTable,
	enums,
	insert,
	json,
	map,
	nullable,
	number,
	object,
	optional,
	query,
	select,
	string,
	uuid,
} from '../src'

describe('ops', () => {
	const server = new ClickHouseServer()

	const events = define(
		'stack--events',
		object({
			id: uuid(),
			projectId: string({ lowCardinality: true }),
			flags: array(string({ lowCardinality: true })),
			score: number(),
			uses: number('UInt64'),
			bot: enums(['good', 'bad', 'not_detected']),
			vpn: boolean(),
			externalId: nullable(string()),
			country: nullable(string({ lowCardinality: true })),
			extra: map(number('UInt32')),
			details: json<{ os?: string }>(),
			createdAt: date(),
		}),
		() => clickhouseClient({ endpoint: server.endpoint })
	)

	type Row = (typeof events)['schema']['INPUT']

	const row = (id: string, props: Partial<Row> = {}): Row => ({
		id: `00000000-0000-0000-0000-00000000000${id}`,
		projectId: 'p1',
		flags: [],
		score: 0,
		uses: 1,
		bot: 'not_detected',
		vpn: false,
		externalId: null,
		country: null,
		extra: {},
		details: {},
		createdAt: new Date('2026-10-24T07:00:00.000Z'),
		...props,
	})

	beforeAll(async () => {
		await server.listen()
		await createTable(events, { orderBy: ['projectId', 'createdAt'] })
	})

	afterAll(async () => {
		await server.close()
	})

	it('writes the column types', () => {
		expect(events.schema.columns).toEqual({
			id: 'UUID',
			projectId: 'LowCardinality(String)',
			flags: 'Array(LowCardinality(String))',
			score: 'Float64',
			uses: 'UInt64',
			bot: "Enum8('good' = 1, 'bad' = 2, 'not_detected' = 3)",
			vpn: 'Bool',
			externalId: 'Nullable(String)',
			country: 'LowCardinality(Nullable(String))',
			extra: 'Map(String, UInt32)',
			details: 'JSON',
			createdAt: "DateTime64(3, 'UTC')",
		})
	})

	it('inserts & selects rows through the schema', async () => {
		await insert(events, [
			row('1', {
				flags: ['vpn', 'tor'],
				score: 6.5,
				bot: 'bad',
				vpn: true,
				externalId: 'user-1',
				country: 'NL',
				extra: { a: 1 },
				details: { os: 'macOS' },
				createdAt: new Date('2026-10-24T07:00:00.123Z'),
			}),
			row('2', { projectId: 'p2' }),
		])

		const rows = await select(events, { where: 'projectId = {projectId:String}', params: { projectId: 'p1' } })

		expect(rows).toEqual([
			{
				id: '00000000-0000-0000-0000-000000000001',
				projectId: 'p1',
				flags: ['vpn', 'tor'],
				score: 6.5,
				uses: 1,
				bot: 'bad',
				vpn: true,
				externalId: 'user-1',
				country: 'NL',
				extra: { a: 1 },
				details: { os: 'macOS' },
				createdAt: new Date('2026-10-24T07:00:00.123Z'),
			},
		])
	})

	it('runs any sql against the table', async () => {
		const rows = await query<{ projectId: string; total: number }>(
			events,
			'SELECT projectId, count() AS total FROM {table:Identifier} GROUP BY projectId ORDER BY projectId'
		)

		expect(rows).toEqual([
			{ projectId: 'p1', total: 1 },
			{ projectId: 'p2', total: 1 },
		])
	})

	it('leaves optional columns to the server', async () => {
		const withDefaults = define(
			'stack--defaults',
			object({ id: string(), score: optional(number()), note: optional(string()) }),
			() => clickhouseClient({ endpoint: server.endpoint })
		)

		await withDefaults
			.client()
			.command(
				'CREATE TABLE `stack--defaults` (id String, score Float64 DEFAULT 1.5, note String MATERIALIZED upper(id)) ENGINE = MergeTree ORDER BY id'
			)
		await insert(withDefaults, [{ id: 'a' }, { id: 'b', score: 3 }])

		expect(await select(withDefaults, { orderBy: 'id' })).toEqual([
			{ id: 'a', score: 1.5, note: 'A' },
			{ id: 'b', score: 3, note: 'B' },
		])
	})

	it('keeps the table out of reach of the parameters', async () => {
		const other = define('stack--other', object({ table: string() }), () =>
			clickhouseClient({ endpoint: server.endpoint })
		)
		const mine = define('stack--mine', object({ table: string() }), () =>
			clickhouseClient({ endpoint: server.endpoint })
		)

		await createTable(other, { orderBy: ['table'] })
		await createTable(mine, { orderBy: ['table'] })
		await insert(other, [{ table: 'x' }])
		await insert(mine, [{ table: 'x' }])
		await deleteRows(mine, { where: 'table = {table:String}', params: { table: 'x' } })

		expect(await count(other)).toBe(1)
		expect(await count(mine)).toBe(0)
		expect(await query(other, 'SELECT count() AS c FROM {table:Identifier}', { table: 'stack--mine' })).toEqual([
			{ c: 1 },
		])
	})

	it('reads a replacing table through FINAL', async () => {
		const versions = define('stack--versions', object({ id: string(), name: string() }), () =>
			clickhouseClient({ endpoint: server.endpoint })
		)

		await createTable(versions, { engine: 'ReplacingMergeTree', orderBy: ['id'] })
		await insert(versions, [{ id: 'a', name: 'old' }])
		await insert(versions, [
			{ id: 'a', name: 'new' },
			{ id: 'b', name: 'b' },
		])

		expect(await count(versions, { final: true })).toBe(2)
		expect(await select(versions, { final: true, orderBy: 'id' })).toEqual([
			{ id: 'a', name: 'new' },
			{ id: 'b', name: 'b' },
		])
	})

	it('counts & deletes rows', async () => {
		expect(await count(events)).toBe(2)

		await deleteRows(events, { where: 'projectId = {projectId:String}', params: { projectId: 'p2' } })

		expect(await count(events)).toBe(1)
		expect(await count(events, { where: 'vpn' })).toBe(1)
	})

	it('drops the table', async () => {
		await dropTable(events)

		await expect(count(events)).rejects.toThrow(/UNKNOWN_TABLE|Unknown table/)
	})
})
