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
const options = { configFile: join(import.meta.dirname, '../example/postgres/app.jsonc') }
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

	it('creates the declared tables of the stack in a schema for this test file', async () => {
		expect(postgres.counter.schema).toBe('app_postgres_tfile01__counter')
		expect(await postgres.counter.query('SELECT * FROM counters')).toEqual([])
		expect(await postgres.counter.query('SELECT * FROM bumps')).toEqual([])

		const admin = postgresClient({ url })
		const partitions = await admin.query(
			"SELECT count(*)::int AS partitions FROM pg_tables WHERE schemaname = 'app_postgres_tfile01__counter' AND tablename LIKE 'bumps_p_'"
		)

		await admin.close()

		expect(partitions).toEqual([{ partitions: 4 }])
	})

	it('runs the stack handler against its PL/pgSQL function', async () => {
		expect(await fn.counter.bump({ name: 'visits' })).toBe(1)
		expect(await fn.counter.bump({ name: 'visits' })).toBe(2)
		expect(await postgres.counter.query('SELECT name, value::int FROM counters')).toEqual([
			{ name: 'visits', value: 2 },
		])
		expect(await postgres.counter.query('SELECT id::int, name, amount::int, note FROM bumps ORDER BY id')).toEqual([
			{ id: 1, name: 'visits', amount: 1, note: null },
			{ id: 2, name: 'visits', amount: 1, note: null },
		])
	})

	it('refuses what the Data API of a deployed stack would refuse', async () => {
		await expect(postgres.counter.query('SELECT 1; SELECT 2')).rejects.toThrow('A query is one statement')
		await expect(postgres.counter.query('SELECT pg_sleep(0)')).rejects.toThrow(
			'The Data API can\'t return the type of column "pg_sleep". Cast it to text in the query, like pg_sleep::text.'
		)
	})

	it('answers queries at once on several connections', async () => {
		const rows: [{ pid: number }][] = await Promise.all(
			Array.from({ length: 8 }, () => {
				// pg_sleep answers nothing (void), which a query has to hand back as text.
				return postgres.counter.query('SELECT pg_backend_pid() AS pid, pg_sleep(0.05)::text')
			})
		)
		const connections = new Set(rows.map(([row]) => row.pid)).size

		expect(connections).toBeGreaterThan(1)
		expect(connections).toBeLessThanOrEqual(4)
	})

	it('passes the SQLSTATE of a failed query on', async () => {
		const error = await postgres.counter
			.query("INSERT INTO counters VALUES ('visits', 1)")
			.catch((error: unknown) => error)

		expect(getSqlState(error)).toBe('23505')
	})

	it('gives the next test file a schema of its own, empty again', async () => {
		process.env.APP = `${manifest.app}-tfile02`

		await setupTestEnv(manifest, { importFile: file => import(/* @vite-ignore */ file) })

		expect(postgres.counter.schema).toBe('app_postgres_tfile02__counter')
		expect(await postgres.counter.query('SELECT * FROM counters')).toEqual([])

		const admin = postgresClient({ url })
		const schemas = await admin.query<{ name: string }>(
			"SELECT nspname AS name FROM pg_namespace WHERE nspname LIKE 'app_postgres_%' ORDER BY nspname"
		)

		await admin.close()

		expect(schemas.map(schema => schema.name)).toEqual([
			'app_postgres_tfile01__counter',
			'app_postgres_tfile02__counter',
		])
	})
})
