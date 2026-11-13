import {
	BeginTransactionCommand,
	CommitTransactionCommand,
	ExecuteStatementCommand,
	RDSDataClient,
	RollbackTransactionCommand,
} from '@aws-sdk/client-rds-data'
import { PostgresServer } from '@awsless/postgres-server'
import { mockClient } from 'aws-sdk-vitest-mock'
import {
	applySchema,
	getSqlState,
	type PostgresClient,
	postgresClient,
	postgresDataClient,
	PostgresError,
} from '../src'
import { fakeDataApi } from '../src/fake-data-api'

// The same queries through both ways a stack reaches Postgres: over a
// connection, as locally & in tests, and through the Data API, as deployed.
// The Data API here is a stand-in on the same local server (src/fake-data-api.ts),
// so this proves the two agree as far as the stand-in is true to AWS.

const definition = {
	schema: 'link',
	tables: {
		links: {
			columns: {
				id: { type: 'bigint', identity: true },
				project_id: 'uuid',
				external_id: { type: 'text', collate: 'C' },
				type: { type: 'text', collate: 'C' },
				value: { type: 'text', collate: 'C' },
				created_at: 'timestamptz',
				happened_at: 'timestamptz?',
				event_days: { type: 'datemultirange', default: "'{}'" },
				first_day: 'date',
				weight: 'double precision?',
				amount: 'numeric(12, 2)?',
				seen: { type: 'integer', default: '1' },
				kept: { type: 'boolean', default: 'true' },
				meta: 'jsonb?',
				tags: { type: 'text[]', default: "'{}'" },
			},
			primaryKey: ['project_id', 'external_id', 'type', 'value'],
			indexes: { id: { columns: ['project_id', 'id'], unique: true } },
			partitionBy: { hash: ['project_id'], partitions: 4 },
		},
	},
	functions: [
		{
			name: 'function.sql',
			sql: `
				-- Links every sighting of the batch & answers who was seen.
				CREATE FUNCTION link_many(project uuid, sightings jsonb) RETURNS text[] LANGUAGE plpgsql AS $$
				DECLARE
					seen_ids text[];
				BEGIN
					WITH added AS (
						INSERT INTO links (project_id, external_id, type, value, created_at, first_day, event_days, meta)
						SELECT project, s.external_id, s.type, s.value, s.at, s.at::date,
							datemultirange(daterange(s.at::date, s.at::date, '[]')), s.meta
						FROM jsonb_to_recordset(sightings) AS s(external_id text, type text, value text, at timestamptz, meta jsonb)
						ON CONFLICT (project_id, external_id, type, value) DO UPDATE
							SET event_days = links.event_days + excluded.event_days, seen = links.seen + 1
						RETURNING external_id
					)
					SELECT array_agg(DISTINCT external_id ORDER BY external_id) INTO seen_ids FROM added;

					RETURN seen_ids;
				END $$;

				CREATE FUNCTION summary(project uuid) RETURNS jsonb LANGUAGE sql AS $$
					SELECT jsonb_build_object('links', count(*), 'users', count(DISTINCT external_id), 'first', min(first_day))
					FROM links WHERE project_id = project
				$$;

				CREATE FUNCTION lock_both(project uuid, first text, second text) RETURNS void LANGUAGE plpgsql AS $$
				BEGIN
					UPDATE links SET seen = seen + 1 WHERE project_id = project AND external_id = first;
					PERFORM pg_sleep(0.3);
					UPDATE links SET seen = seen + 1 WHERE project_id = project AND external_id = second;
				END $$;
			`,
		},
	],
}

const project = '6f1c1f0e-3b7a-4c58-9d55-0f1f2a3b4c5d'
const other = '0b0c3a52-7f4e-4d8e-9d0a-5b1f0e6c7a11'

const sightings = [
	{
		external_id: 'user-1042',
		type: 'visitor-id',
		value: 'v1',
		at: '2026-11-01T08:30:00Z',
		meta: { page: '/checkout' },
	},
	{ external_id: 'user-1042', type: 'ip', value: '203.0.113.7', at: '2026-11-02T09:00:00Z', meta: null },
	{
		external_id: 'user-7',
		type: 'visitor-id',
		value: 'v1',
		at: '2026-11-03T10:15:00.250Z',
		meta: { page: '/login', n: 2 },
	},
]

// What a query answered: its rows, or the SQLSTATE & kind of what it threw.
const outcome = async (run: Promise<unknown>) => {
	try {
		return { rows: await run }
	} catch (error) {
		return { error: error instanceof PostgresError ? getSqlState(error) : (error as Error).constructor.name }
	}
}

// Queries of the kind a stack sends, each with what it shows.
const scenario = async (client: PostgresClient) => {
	const results: Record<string, unknown> = {}
	const query = async (name: string, sql: string, params?: unknown[]) => {
		results[name] = await outcome(client.query(sql, params))
	}

	await query(
		'a function taking a uuid & a jsonb string, returning text[]',
		'SELECT link_many($1, $2::jsonb) AS seen',
		[project, JSON.stringify(sightings)]
	)
	await query('the same batch again, into its day sets', 'SELECT link_many($1, $2::jsonb) AS seen', [
		project,
		JSON.stringify(sightings.slice(0, 1).map(sighting => ({ ...sighting, at: '2026-11-05T00:00:00Z' }))),
	])
	await query(
		'a uuid found by a string without a cast',
		'SELECT external_id, value FROM links WHERE project_id = $1 ORDER BY id',
		[project]
	)
	await query('nothing for another uuid', 'SELECT external_id FROM links WHERE project_id = $1', [other])
	await query(
		'every kind of column',
		'SELECT id, project_id, external_id, created_at, happened_at, first_day, weight, amount, seen, kept, meta, tags FROM links WHERE project_id = $1 ORDER BY id',
		[project]
	)
	await query(
		'a text[] parameter with its cast',
		'SELECT external_id FROM links WHERE external_id = ANY($1::text[]) ORDER BY id',
		[['user-7', 'user-0']]
	)
	await query(
		'an array parameter without a cast',
		'SELECT external_id FROM links WHERE external_id = ANY($1) ORDER BY id',
		[['user-7', 'user-0']]
	)
	await query(
		'a bigint[] parameter',
		'SELECT id, external_id FROM links WHERE project_id = $2 AND id = ANY($1::bigint[]) ORDER BY id',
		[[1, 3, 99], project]
	)
	await query(
		'a Date parameter against a timestamptz',
		'SELECT external_id, created_at FROM links WHERE created_at >= $1 AND created_at < $2::timestamptz ORDER BY id',
		[new Date('2026-11-02T00:00:00Z'), new Date('2026-11-04T00:00:00Z')]
	)
	await query(
		'updates with a number, a boolean, a decimal & null',
		'UPDATE links SET weight = $2, kept = $3, amount = $4, happened_at = $5, tags = $6 WHERE project_id = $1 AND external_id = $7 RETURNING id, weight, kept, amount, happened_at, tags',
		[project, 0.75, false, '12.50', null, ['a', 'b "c"'], 'user-7']
	)
	await query(
		'a date read as a date & as text',
		'SELECT first_day, first_day::text AS day FROM links WHERE project_id = $1 ORDER BY id LIMIT 1',
		[project]
	)
	await query(
		'day sets kept inside the sql',
		"SELECT external_id, event_days::text AS days, event_days @> $2::date AS seen_then, upper(event_days) - lower(event_days) AS span FROM links WHERE project_id = $1 AND type = 'visitor-id' ORDER BY id",
		[project, '2026-11-05']
	)
	await query('a day set returned as it is', 'SELECT event_days FROM links WHERE project_id = $1 LIMIT 1', [project])
	await query('a function returning jsonb', 'SELECT summary($1) AS summary', [project])
	await query(
		'whole numbers, counts, decimals & json',
		'SELECT count(*) AS count, count(*)::int AS count_int, sum(seen) AS total, avg(seen) AS average, max(id) AS last_id, 2::smallint AS small, 1.5::real AS real, \'{"a":[1,2]}\'::json AS json, array_agg(id ORDER BY id) AS ids, array_agg(seen ORDER BY id) AS seens, array_agg(kept ORDER BY id) AS kepts FROM links WHERE project_id = $1',
		[project]
	)
	await query(
		'text that looks like other things',
		'SELECT $1 AS quote, $2 AS colon, $3 AS dollar, $4 AS slash, $5::text AS empty',
		["it's", ':name ::cast $1', '$tag$ body $tag$', 'back\\slash', '']
	)
	await query(
		'a value typed by a cast only',
		'SELECT $1::int + 1 AS next, $2::uuid AS id, $3::boolean AS flag, $4::jsonb -> $5 AS picked',
		['41', project, 'true', '{"a": {"b": 1}}', 'a']
	)
	await query(
		'a row that is already there',
		"INSERT INTO links (project_id, external_id, type, value, created_at, first_day) VALUES ($1, 'user-7', 'visitor-id', 'v1', $2, $3)",
		[project, new Date('2026-11-03T10:15:00Z'), '2026-11-03']
	)
	await query('a table that is not there', 'SELECT * FROM missing WHERE id = $1', [1])
	await query('a uuid that is none', 'SELECT * FROM links WHERE project_id = $1', ['not-a-uuid'])
	await query('two statements in one call', 'SELECT 1; SELECT 2')
	await query('more parameters than placeholders', 'SELECT $1', [1, 2])
	await query('no rows from a write', "UPDATE links SET seen = seen WHERE external_id = 'nobody'")
	await query('a function without an answer', 'SELECT lock_both($1, $2, $3)::text AS done', [
		project,
		'user-7',
		'user-7',
	])
	await query('more than the Data API returns', "SELECT repeat('x', 400000) AS big FROM generate_series(1, 3)")

	// Two calls that lock the same two rows in the other order: one is the
	// deadlock victim, told by its SQLSTATE.
	const deadlock = await Promise.all([
		outcome(client.query('SELECT lock_both($1, $2, $3)::text', [project, 'user-1042', 'user-7'])),
		outcome(client.query('SELECT lock_both($1, $2, $3)::text', [project, 'user-7', 'user-1042'])),
	])

	results['a deadlock'] = deadlock
		.map(result => ('error' in result ? String(result.error) : 'ok'))
		.toSorted((a, b) => a.localeCompare(b))

	return results
}

describe('a connection & the Data API', () => {
	const server = new PostgresServer()
	const stand = { api: undefined as ReturnType<typeof fakeDataApi> | undefined }
	let local: PostgresClient
	let deployed: PostgresClient
	let localResults: Record<string, any>
	let deployedResults: Record<string, any>

	beforeAll(async () => {
		await server.listen()

		const admin = postgresClient({ url: server.url })

		// Locally a stack is a schema of the one database, its search path set
		// per connection. Deployed it is a database of its own, which sets the
		// search path itself: the Data API keeps nothing between calls.
		await applySchema(admin, definition)
		await admin.query('CREATE DATABASE link')
		await admin.query('ALTER DATABASE link SET search_path TO link, public')
		await admin.close()

		const api = fakeDataApi({ url: server.url.replace(/\/postgres$/, '') })
		const rds = mockClient(RDSDataClient)

		stand.api = api
		rds.on(BeginTransactionCommand).callsFake(input => api.send(new BeginTransactionCommand(input)))
		rds.on(ExecuteStatementCommand).callsFake(input => api.send(new ExecuteStatementCommand(input)))
		rds.on(CommitTransactionCommand).callsFake(input => api.send(new CommitTransactionCommand(input)))
		rds.on(RollbackTransactionCommand).callsFake(input => api.send(new RollbackTransactionCommand(input)))

		local = postgresClient({ url: server.url, schema: 'link', strict: true })
		deployed = postgresDataClient({
			clusterArn: 'arn:aws:rds:eu-west-1:123456789012:cluster:app-postgres',
			secretArn: 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:rds!cluster-0f1f2a3b',
			database: 'link',
		})

		// The same declaration, applied through the Data API.
		await applySchema(deployed, definition)

		localResults = await scenario(local)
		deployedResults = await scenario(deployed)
	})

	afterAll(async () => {
		await local.close()
		await stand.api?.close()
		await server.close()
	})

	it('answer every query the same', () => {
		for (const name of Object.keys(localResults)) {
			expect({ [name]: deployedResults[name] }).toEqual({ [name]: localResults[name] })
		}

		expect(Object.keys(deployedResults)).toEqual(Object.keys(localResults))
	})

	it('find a uuid by a string, with no cast in the sql', () => {
		expect(deployedResults['a uuid found by a string without a cast'].rows).toEqual([
			{ external_id: 'user-1042', value: 'v1' },
			{ external_id: 'user-1042', value: '203.0.113.7' },
			{ external_id: 'user-7', value: 'v1' },
		])
		expect(deployedResults['nothing for another uuid'].rows).toEqual([])
	})

	it('take a jsonb string & arrays, and return text[] & jsonb from functions', () => {
		expect(deployedResults['a function taking a uuid & a jsonb string, returning text[]'].rows).toEqual([
			{ seen: ['user-1042', 'user-7'] },
		])
		expect(deployedResults['a text[] parameter with its cast'].rows).toEqual([{ external_id: 'user-7' }])
		expect(deployedResults['an array parameter without a cast'].rows).toEqual([{ external_id: 'user-7' }])
		expect(deployedResults['a bigint[] parameter'].rows).toEqual([
			{ id: '1', external_id: 'user-1042' },
			{ id: '3', external_id: 'user-7' },
		])
		expect(deployedResults['a function returning jsonb'].rows).toEqual([
			{ summary: { links: 3, users: 2, first: '2026-11-01' } },
		])
	})

	it('return what pg returns: dates, strings for big & exact numbers, parsed json, arrays, null', () => {
		const [first, , third] = deployedResults['every kind of column'].rows

		expect(first).toEqual({
			id: '1',
			project_id: project,
			external_id: 'user-1042',
			created_at: new Date('2026-11-01T08:30:00Z'),
			happened_at: null,
			first_day: localResults['every kind of column'].rows[0].first_day,
			weight: null,
			amount: null,
			seen: 2,
			kept: true,
			meta: { page: '/checkout' },
			tags: [],
		})
		expect(first.created_at).toBeInstanceOf(Date)
		expect(first.first_day).toBeInstanceOf(Date)
		expect(third.created_at).toEqual(new Date('2026-11-03T10:15:00.250Z'))
		expect(third.meta).toEqual({ page: '/login', n: 2 })

		expect(deployedResults['updates with a number, a boolean, a decimal & null'].rows).toEqual([
			{ id: '3', weight: 0.75, kept: false, amount: '12.50', happened_at: null, tags: ['a', 'b "c"'] },
		])
		expect(deployedResults['whole numbers, counts, decimals & json'].rows).toEqual([
			{
				count: '3',
				count_int: 3,
				total: '4',
				average: expect.stringMatching(/^1\.3333/),
				last_id: '3',
				small: 2,
				real: 1.5,
				json: { a: [1, 2] },
				ids: ['1', '2', '3'],
				seens: [2, 1, 1],
				kepts: [true, true, false],
			},
		])
		expect(deployedResults['a date read as a date & as text'].rows[0].day).toBe('2026-11-01')
	})

	it('keep day sets inside the sql & refuse to return one', () => {
		expect(deployedResults['day sets kept inside the sql'].rows).toEqual([
			{
				external_id: 'user-1042',
				days: '{[2026-11-01,2026-11-02),[2026-11-05,2026-11-06)}',
				seen_then: true,
				span: 5,
			},
			{ external_id: 'user-7', days: '{[2026-11-03,2026-11-04)}', seen_then: false, span: 1 },
		])
		expect(deployedResults['a day set returned as it is']).toEqual({ error: '0A000' })
		expect(localResults['a day set returned as it is']).toEqual({ error: '0A000' })
	})

	it('take a Date for a moment & text for everything it could be mistaken for', () => {
		expect(deployedResults['a Date parameter against a timestamptz'].rows).toEqual([
			{ external_id: 'user-1042', created_at: new Date('2026-11-02T09:00:00Z') },
			{ external_id: 'user-7', created_at: new Date('2026-11-03T10:15:00.250Z') },
		])
		expect(deployedResults['text that looks like other things'].rows).toEqual([
			{ quote: "it's", colon: ':name ::cast $1', dollar: '$tag$ body $tag$', slash: 'back\\slash', empty: '' },
		])
		expect(deployedResults['a value typed by a cast only'].rows).toEqual([
			{ next: 42, id: project, flag: true, picked: { b: 1 } },
		])
	})

	it('fail the same way, by SQLSTATE', () => {
		expect(deployedResults['a row that is already there']).toEqual({ error: '23505' })
		expect(deployedResults['a table that is not there']).toEqual({ error: '42P01' })
		expect(deployedResults['a uuid that is none']).toEqual({ error: '22P02' })
		expect(deployedResults['two statements in one call']).toEqual({ error: 'TypeError' })
		expect(deployedResults['more parameters than placeholders']).toEqual({ error: 'TypeError' })
		expect(deployedResults['more than the Data API returns']).toEqual({ error: '54000' })
		expect(deployedResults['a deadlock']).toEqual(['40P01', 'ok'])
		expect(deployedResults['no rows from a write']).toEqual({ rows: [] })
		expect(deployedResults['a function without an answer']).toEqual({ rows: [{ done: '' }] })
	})

	it('give a statement the same 45 seconds', async () => {
		expect(await local.query("SELECT current_setting('statement_timeout') AS timeout")).toEqual([
			{ timeout: '45s' },
		])
	})

	it('send the Data API one call per query, with only what a cast marks as a parameter', () => {
		const call = stand.api!.calls.find(call => String(call.input.sql).startsWith('SELECT link_many'))!

		expect(call.name).toBe('ExecuteStatement')
		expect(call.input).toMatchObject({
			resourceArn: 'arn:aws:rds:eu-west-1:123456789012:cluster:app-postgres',
			secretArn: 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:rds!cluster-0f1f2a3b',
			database: 'link',
			sql: `SELECT link_many('${project}', :p2::jsonb) AS seen`,
			parameters: [{ name: 'p2', value: { stringValue: JSON.stringify(sightings) } }],
			includeResultMetadata: true,
			resultSetOptions: { longReturnType: 'STRING', decimalReturnType: 'STRING' },
		})
		expect(call.input.transactionId).toBeUndefined()
	})
})
