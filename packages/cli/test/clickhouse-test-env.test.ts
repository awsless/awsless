import { join } from 'path'
import { BigFloat } from '@awsless/big-float'
import { ClickHouse, setupTestEnv, type TestManifest } from 'awsless'
import { afterAll, describe, expect, it } from 'vitest'
import { loadAppConfig, loadStackConfigs } from '../src/config/load/load'
import { withTestEnvironment } from '../src/test/environment'
import { setRoot } from '../src/util/path'

// The whole path of `awsless test` for an app with ClickHouse tables in two
// stacks, short of spawning vitest: its config loaded, the manifest made,
// the run-wide server booted and this file set up like every test file.
const options = { configFile: join(import.meta.dirname, './fixture/clickhouse/app.jsonc') }
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

	// The server stays up until the tests of this file are done.
	await finished

	return true
})

// A server that fails to boot ends the wait too.
await Promise.race([started, environment])

// What the cli's test setup does for every test file.
process.env.APP = `${manifest.app}-tfile01`
process.env.AWS_REGION = manifest.region
process.env.CLICKHOUSE_ENDPOINT = manifest.servers!.clickhouse!.endpoint

await setupTestEnv(manifest, { importFile: file => import(/* @vite-ignore */ file) })

// The generated types aren't there for a fixture.
const db = (ClickHouse as any).db

describe('clickhouse test environment', () => {
	afterAll(async () => {
		finish()
		await environment
		setRoot()
	})

	it('queries the tables of two stacks by `stack.table`, through the query builder', async () => {
		const createdAt = new Date('2026-11-18T10:30:00.123Z')

		await db.insertInto('crm.customers').values({ id: 'c1', name: 'Jane' }).execute()
		await db
			.insertInto('shop.orders')
			.values([
				{ id: 'o1', customer: 'c1', items: 3, total: new BigFloat('19.99'), tags: ['new'], createdAt },
				{ id: 'o2', customer: 'c1', items: 2n, total: '0.01', tags: [], note: 'gift', createdAt },
			])
			.execute()

		const orders = await db.selectFrom('shop.orders').selectAll().orderBy('id').execute()

		expect(orders).toEqual([
			{
				id: 'o1',
				customer: 'c1',
				items: 3n,
				total: new BigFloat('19.99'),
				tags: ['new'],
				note: null,
				createdAt,
				day: '2026-11-18',
			},
			{
				id: 'o2',
				customer: 'c1',
				items: 2n,
				total: new BigFloat('0.01'),
				tags: [],
				note: 'gift',
				createdAt,
				day: '2026-11-18',
			},
		])

		const totals = await db
			.selectFrom('shop.orders as o')
			.innerJoin('crm.customers as c', 'c.id', 'o.customer')
			.select((eb: any) => ['c.name', eb.fn.agg('sum', ['o.items']).as('items')])
			.where('o.createdAt', '>=', createdAt)
			.groupBy('c.name')
			.execute()

		expect(totals).toEqual([{ name: 'Jane', items: 5n }])
	})

	it('writes the table of this test file into the sql', () => {
		expect(db.selectFrom('shop.orders').select('id').compile().sql).toBe(
			'select `id` from `app-clickhouse-tfile01--shop--orders`'
		)
	})
})
