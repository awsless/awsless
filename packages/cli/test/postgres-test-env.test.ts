import { join } from 'path'
import { postgresClient } from '@awsless/postgres'
import { Fn, getSqlState, Postgres, setupTestEnv, type TestManifest } from 'awsless'
import { afterAll, describe, expect, it } from 'vitest'
import { loadAppConfig, loadStackConfigs } from '../src/config/load/load'
import { withTestEnvironment } from '../src/test/environment'
import { setRoot } from '../src/util/path'

// The whole path of `awsless test` for the example app, short of spawning
// vitest: its config loaded, the manifest made, the run-wide server booted
// and this file set up the way the cli sets up every test file.
const options = { configFile: join(import.meta.dirname, './fixture/postgres/app.jsonc') }
const appConfig = await loadAppConfig(options)
const stackConfigs = await loadStackConfigs(options)

let finish!: () => void
let ready!: () => void
let manifest!: TestManifest

const finished = new Promise<void>(resolve => {
	finish = resolve
})

const started = new Promise<void>(resolve => {
	ready = resolve
})

const environment = withTestEnvironment(appConfig, stackConfigs, async props => {
	await props.ensureReady()

	manifest = props.manifest
	ready()

	// The servers stay up until the tests of this file are done.
	await finished

	return true
})

// A server that fails to boot ends the wait too.
await Promise.race([started, environment])

const url = manifest.servers!.postgres!.url

// What the cli's test setup does for every test file.
process.env.APP = `${manifest.app}-tfile01`
process.env.AWS_REGION = manifest.region
process.env.POSTGRES_URL = url

await setupTestEnv(manifest, { importFile: file => import(/* @vite-ignore */ file) })

const fn = Fn as any
const postgres = Postgres as any

describe('postgres test environment', () => {
	afterAll(async () => {
		finish()
		await environment
		setRoot()
	})

	it('creates a database for this test file, with the declared tables in the schema of their stack', async () => {
		expect(await postgres.query('SELECT current_database()::text AS database')).toEqual([
			{ database: 'app_postgres_tfile01' },
		])

		// A table by its stack, and without it: the search path holds every stack.
		expect(await postgres.query('SELECT * FROM counter.counters')).toEqual([])
		expect(await postgres.query('SELECT * FROM bumps')).toEqual([])

		const admin = postgresClient({ url: url.replace(/\/postgres$/, '/app_postgres_tfile01') })
		const partitions = await admin.query(
			"SELECT count(*)::int AS partitions FROM pg_tables WHERE schemaname = 'counter' AND tablename LIKE 'bumps_p_'"
		)

		await admin.close()

		expect(partitions).toEqual([{ partitions: 4 }])
	})

	it('runs the stack handler against its PL/pgSQL function', async () => {
		expect(await fn.counter.bump({ name: 'visits' })).toBe(1)
		expect(await fn.counter.bump({ name: 'visits' })).toBe(2)
		expect(await postgres.query('SELECT name, value::int FROM counters')).toEqual([{ name: 'visits', value: 2 }])
		expect(await postgres.query('SELECT id::int, name, amount::int, note FROM bumps ORDER BY id')).toEqual([
			{ id: 1, name: 'visits', amount: 1, note: null },
			{ id: 2, name: 'visits', amount: 1, note: null },
		])
	})

	it('runs typed queries of the query builder, in a transaction too', async () => {
		const db = postgres.db

		await db.insertInto('counter.counters').values({ name: 'typed', value: 5 }).execute()
		await db.transaction().execute(async (transaction: typeof db) => {
			await transaction.updateTable('counter.counters').set({ value: 6 }).where('name', '=', 'typed').execute()
		})

		// A bigint comes back as text, like from a query.
		expect(
			await db.selectFrom('counter.counters').select(['name', 'value']).where('name', '=', 'typed').execute()
		).toEqual([{ name: 'typed', value: '6' }])

		const deleted = await db.deleteFrom('counter.counters').where('name', '=', 'typed').executeTakeFirst()

		expect(deleted.numDeletedRows).toBe(1n)
	})

	it('refuses what the Data API of a deployed stack would refuse', async () => {
		await expect(postgres.query('SELECT 1; SELECT 2')).rejects.toThrow('A query is one statement')
		await expect(postgres.query('SELECT pg_sleep(0)')).rejects.toThrow(
			'The Data API can\'t return the type of column "pg_sleep". Cast it to text in the query, like pg_sleep::text.'
		)
	})

	it('answers queries at once on several connections', async () => {
		const rows: [{ pid: number }][] = await Promise.all(
			Array.from({ length: 8 }, () => {
				// pg_sleep answers nothing (void), which a query has to hand back as text.
				return postgres.query('SELECT pg_backend_pid() AS pid, pg_sleep(0.05)::text')
			})
		)
		const connections = new Set(rows.map(([row]) => row.pid)).size

		expect(connections).toBeGreaterThan(1)
		expect(connections).toBeLessThanOrEqual(4)
	})

	it('passes the SQLSTATE of a failed query on', async () => {
		const error = await postgres.query("INSERT INTO counters VALUES ('visits', 1)").catch((error: unknown) => error)

		expect(getSqlState(error)).toBe('23505')
	})

	it('gives the next test file a database of its own, empty again', async () => {
		process.env.APP = `${manifest.app}-tfile02`

		await setupTestEnv(manifest, { importFile: file => import(/* @vite-ignore */ file) })

		expect(await postgres.query('SELECT * FROM counter.counters')).toEqual([])

		const admin = postgresClient({ url })
		const databases = await admin.query<{ name: string }>(
			"SELECT datname::text AS name FROM pg_database WHERE datname LIKE 'app_postgres_%' ORDER BY datname"
		)

		await admin.close()

		expect(databases.map(database => database.name)).toEqual(['app_postgres_tfile01', 'app_postgres_tfile02'])
	})
})
