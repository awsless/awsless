import { clickhouseClient } from '@awsless/clickhouse'
import { ClickHouseServer } from '@awsless/clickhouse-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
	alterTableStatements,
	applyTable,
	declaredTableStatement,
	TableChangeError,
} from '../src/feature/clickhouse/table'

describe('tables', () => {
	const server = new ClickHouseServer()
	let client: ReturnType<typeof clickhouseClient>

	const columnsOf = async (table: string) => {
		return client.query<{ name: string; type: string }>(
			'SELECT name, type FROM system.columns WHERE table = {table:String} ORDER BY position',
			{ table }
		)
	}

	beforeAll(async () => {
		await server.listen()
		client = clickhouseClient({ endpoint: server.endpoint })
	}, 120_000)

	afterAll(async () => {
		await server.close()
	})

	beforeEach(async () => {
		await server.reset()
	})

	const events = {
		columns: {
			id: 'String',
			projectId: 'LowCardinality(String)',
			createdAt: "DateTime64(3, 'UTC')",
		},
		orderBy: ['projectId', 'createdAt'],
		partitionBy: 'toYYYYMM(createdAt)',
	}

	it('writes the create statement', () => {
		expect(declaredTableStatement('stack--events', events)).toContain(
			'ENGINE = MergeTree\nPARTITION BY toYYYYMM(createdAt)\nORDER BY (projectId, createdAt)'
		)
	})

	it('creates a missing table', async () => {
		await applyTable(client, 'stack--events', events)

		expect(await columnsOf('stack--events')).toEqual([
			{ name: 'id', type: 'String' },
			{ name: 'projectId', type: 'LowCardinality(String)' },
			{ name: 'createdAt', type: "DateTime64(3, 'UTC')" },
		])
	})

	it('adds, changes & drops columns in place, keeping the rows', async () => {
		await applyTable(client, 'stack--events', events)
		await client.insert('stack--events', [{ id: 'a', projectId: 'p', createdAt: new Date() }])

		await applyTable(client, 'stack--events', {
			...events,
			columns: {
				id: 'String',
				score: { type: 'Float64', default: '0' },
				projectId: 'LowCardinality(String)',
				createdAt: "DateTime64(3, 'UTC')",
			},
		})

		expect(await columnsOf('stack--events')).toEqual([
			{ name: 'id', type: 'String' },
			{ name: 'score', type: 'Float64' },
			{ name: 'projectId', type: 'LowCardinality(String)' },
			{ name: 'createdAt', type: "DateTime64(3, 'UTC')" },
		])

		await applyTable(client, 'stack--events', {
			...events,
			columns: {
				id: 'String',
				projectId: 'LowCardinality(String)',
				createdAt: "DateTime64(3, 'UTC')",
				score: 'Float32',
			},
		})

		expect((await columnsOf('stack--events')).find(column => column.name === 'score')).toEqual({
			name: 'score',
			type: 'Float32',
		})

		await applyTable(client, 'stack--events', events)

		expect((await columnsOf('stack--events')).map(column => column.name)).toEqual(['id', 'projectId', 'createdAt'])
		expect(await client.query('SELECT id FROM `stack--events`')).toEqual([{ id: 'a' }])
	})

	it('applies indexes, ttl & settings', async () => {
		await applyTable(client, 'stack--events', events)
		await applyTable(client, 'stack--events', {
			...events,
			indexes: { id: { expression: 'id', type: 'bloom_filter', granularity: 4 } },
			ttl: 'toDateTime(createdAt) + INTERVAL 1 YEAR',
			settings: { merge_with_ttl_timeout: 3600 },
		})

		const [table] = await client.query<{ create: string }>(
			"SELECT create_table_query AS create FROM system.tables WHERE name = 'stack--events'"
		)

		expect(table!.create).toContain('INDEX id id TYPE bloom_filter GRANULARITY 4')
		expect(table!.create).toContain('TTL toDateTime(createdAt) + toIntervalYear(1)')
		expect(table!.create).toContain('merge_with_ttl_timeout = 3600')

		await applyTable(client, 'stack--events', events)

		const [after] = await client.query<{ create: string }>(
			"SELECT create_table_query AS create FROM system.tables WHERE name = 'stack--events'"
		)

		expect(after!.create).not.toContain('bloom_filter')
		expect(after!.create).not.toContain('TTL')
	})

	it('does nothing when the definition is unchanged', () => {
		expect(alterTableStatements('t', events, events)).toEqual([])
	})

	it('refuses to change the sort key in place', async () => {
		await applyTable(client, 'stack--events', events)

		await expect(applyTable(client, 'stack--events', { ...events, orderBy: ['createdAt'] })).rejects.toBeInstanceOf(
			TableChangeError
		)
	})

	it('recreates the table for a new sort key when asked', async () => {
		await applyTable(client, 'stack--events', events)
		await client.insert('stack--events', [{ id: 'a', projectId: 'p', createdAt: new Date() }])
		await applyTable(client, 'stack--events', { ...events, orderBy: ['createdAt'] }, { recreate: true })

		expect(await client.query('SELECT count() AS count FROM `stack--events`')).toEqual([{ count: 0 }])
	})

	it('adopts a table made outside awsless by its live columns', async () => {
		await client.command('CREATE TABLE `stack--events` (id String, legacy String) ENGINE = MergeTree ORDER BY id')
		await applyTable(client, 'stack--events', { columns: { id: 'String', extra: 'UInt8' }, orderBy: ['id'] })

		expect((await columnsOf('stack--events')).map(column => column.name)).toEqual(['id', 'extra'])
	})
	it('moves a column that changed place', async () => {
		await applyTable(client, 'stack--events', {
			...events,
			columns: { ...events.columns, a: 'String', b: 'String' },
		})
		await applyTable(client, 'stack--events', {
			...events,
			columns: {
				id: 'String',
				b: 'String',
				projectId: 'LowCardinality(String)',
				a: 'String',
				createdAt: "DateTime64(3, 'UTC')",
			},
		})

		expect((await columnsOf('stack--events')).map(column => column.name)).toEqual([
			'id',
			'b',
			'projectId',
			'a',
			'createdAt',
		])
	})

	it('refuses to adopt a table laid out differently', async () => {
		await client.command(
			'CREATE TABLE `stack--events` (id String, projectId String, createdAt DateTime64(3)) ENGINE = MergeTree ORDER BY id'
		)

		await expect(applyTable(client, 'stack--events', events)).rejects.toBeInstanceOf(TableChangeError)

		await client.command('DROP TABLE `stack--events`')
		await client.command('CREATE TABLE `stack--events` (id String) ENGINE = ReplacingMergeTree ORDER BY id')

		await expect(
			applyTable(client, 'stack--events', { columns: { id: 'String' }, orderBy: ['id'] })
		).rejects.toBeInstanceOf(TableChangeError)
	})

	it('sees the columns an alter left behind when it failed halfway', async () => {
		await applyTable(client, 'stack--events', events)

		await expect(
			applyTable(client, 'stack--events', {
				...events,
				columns: { ...events.columns, foo: 'String', bar: 'NoSuchType' },
			})
		).rejects.toThrow()

		await applyTable(client, 'stack--events', {
			...events,
			columns: { ...events.columns, foo: 'UInt64', bar: 'UInt8' },
		})

		expect((await columnsOf('stack--events')).slice(-2)).toEqual([
			{ name: 'foo', type: 'UInt64' },
			{ name: 'bar', type: 'UInt8' },
		])
	})
})
