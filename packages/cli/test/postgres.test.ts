import { cp, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { days } from '@awsless/duration'
import { postgresClient } from '@awsless/postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { AppSchema } from '../src/config/app'
import { loadAppConfig, loadStackConfigs } from '../src/config/load/load'
import { StackConfig, StackSchema } from '../src/config/stack'
import { createDevContext } from '../src/dev/context'
import { createServerPool } from '../src/dev/pool'
import { createDataReset } from '../src/dev/reset'
import { ConfigError } from '../src/error'
import { postgresOnDev } from '../src/feature/postgres/dev'
import { postgresFeature } from '../src/feature/postgres/index'
import { createTestManifest } from '../src/test/manifest'
import { TypeFile } from '../src/type-gen/file'
import { setRoot } from '../src/util/path'
import { createTestApp, listResources } from './_kit'

const example = join(import.meta.dirname, '../example/postgres')

const counters = {
	columns: { name: { type: 'text', collate: 'C' }, value: { type: 'bigint', default: '0' } },
	primaryKey: ['name'],
	indexes: { value: ['value'] },
}

const bumps = {
	columns: {
		id: { type: 'bigint', identity: true },
		name: { type: 'text', collate: 'C' },
		amount: 'bigint',
		bumped_at: { type: 'timestamptz', default: 'now()' },
		note: 'text?',
	},
	primaryKey: ['name', 'id'],
	indexes: { bumped: ['name', 'bumped_at'] },
	partitionBy: { hash: ['name'], partitions: 4 },
	fillfactor: 90,
}

const functions = ['./src/util/sql/function.sql']

// A copy of the example app's stack, so a test can change its declaration & files.
const copyExample = async () => {
	const root = await mkdtemp(join(tmpdir(), 'awsless-postgres-app-'))

	await cp(join(example, 'app.jsonc'), join(root, 'app.jsonc'))
	await cp(join(example, 'counter/src/util/sql'), join(root, 'counter/src/util/sql'), { recursive: true })
	await writeStack(root, { tables: { counters, bumps }, functions })

	return root
}

const writeStack = (root: string, postgres: unknown) => {
	return writeFile(join(root, 'counter/stack.jsonc'), JSON.stringify({ name: 'counter', tests: false, postgres }))
}

const load = async (root: string) => {
	const options = { configFile: join(root, 'app.jsonc') }

	return { appConfig: await loadAppConfig(options), stackConfigs: await loadStackConfigs(options) }
}

// What the config says is wrong with a stack's postgres block.
const issues = (postgres: unknown) => {
	const result = StackSchema.safeParse({ name: 'stack-1', postgres })

	return result.success ? [] : result.error.issues.map(issue => `${issue.path.slice(1).join('.')}: ${issue.message}`)
}

const table = (props: object = {}) => ({ tables: { links: { ...bumps, ...props } } })

describe('postgres stack config', () => {
	let root: string

	beforeAll(async () => {
		root = await copyExample()
	})

	afterAll(async () => {
		setRoot()
		await rm(root, { recursive: true, force: true })
	})

	it('loads the declared tables as written & the function files from the stack file', async () => {
		const { stackConfigs } = await load(join(example))

		expect(stackConfigs[0]!.postgres).toEqual({
			tables: { counters, bumps },
			functions: [join(example, 'counter/src/util/sql/function.sql')],
		})
	})

	it('refuses a function file that does not exist', async () => {
		await writeStack(root, { tables: { counters }, functions: ['./src/util/sql/missing.sql'] })

		await expect(load(root)).rejects.toThrow(ConfigError)
	})

	it('takes tables without functions, and no list of sql files', async () => {
		await writeStack(root, { tables: { counters } })

		expect((await load(root)).stackConfigs[0]!.postgres).toEqual({ tables: { counters } })
		expect(issues({ tables: { counters }, sql: ['./schema.sql'] })).toEqual([': Unrecognized key: "sql"'])
		expect(issues({})).toEqual(['tables: Invalid input: expected record, received undefined'])
	})

	it('is left out by a stack without a database', () => {
		expect(StackSchema.parse({ name: 'plain' }).postgres).toBeUndefined()
	})

	it('only takes names that stand in sql as they are', () => {
		const message = 'Postgres names are lowercase letters, digits & underscores, starting with a letter'

		expect(issues({ tables: { Links: counters } })[0]).toContain(message)
		expect(issues({ tables: { 'page-views': counters } })[0]).toContain(message)
		expect(issues({ tables: { '1st': counters } })[0]).toContain(message)
		expect(issues(table({ columns: { ...bumps.columns, createdAt: 'timestamptz' } }))[0]).toContain(message)
		expect(issues(table({ indexes: { 'by-name': ['name'] } }))[0]).toContain(message)
		expect(issues({ tables: { page_views_2: counters, _drafts: counters } })).toEqual([])
	})

	it('needs a primary key of columns the table has, none of them NULL', () => {
		const { primaryKey: _, ...keyless } = counters

		expect(issues({ tables: { counters: keyless } })).toEqual([
			'tables.counters.primaryKey: Invalid input: expected array, received undefined',
		])
		expect(issues(table({ primaryKey: [] }))[0]).toContain('tables.links.primaryKey')
		expect(issues(table({ primaryKey: ['name', 'missing'] }))).toEqual([
			'tables.links.primaryKey.1: The primary key names the column "missing", which the table doesn\'t have.',
		])
		expect(issues(table({ primaryKey: ['name', 'id', 'name'] }))).toEqual([
			'tables.links.primaryKey.2: The primary key names the column "name" twice.',
		])
		expect(issues(table({ primaryKey: ['name', 'id', 'note'] }))).toEqual([
			'tables.links.columns.note: The column "note" is in the primary key, so it can\'t be NULL: leave the "?" off its type.',
		])
	})

	it('checks the columns: a type, and an identity that fills itself', () => {
		expect(issues(table({ columns: {} }))[0]).toBe('tables.links.columns: A table needs at least one column.')
		expect(issues(table({ columns: { ...bumps.columns, note: '' } }))[0]).toContain('tables.links.columns.note')
		expect(issues(table({ columns: { ...bumps.columns, note: { type: 'text', nullable: true } } }))[0]).toContain(
			'tables.links.columns.note'
		)
		expect(
			issues(table({ columns: { ...bumps.columns, name: { type: 'text', collate: 'C"; DROP' } } }))[0]
		).toContain('A collation is named like "C" or "en-US-x-icu".')
		expect(
			issues(table({ columns: { ...bumps.columns, id: { type: 'bigint', identity: true, default: '1' } } }))
		).toEqual([
			'tables.links.columns.id.default: The column "id" is an identity, which Postgres fills itself: it takes no default.',
		])
		expect(issues(table({ columns: { ...bumps.columns, seq: { type: 'bigint?', identity: true } } }))).toEqual([
			'tables.links.columns.seq.type: The column "seq" is an identity, which is never NULL: leave the "?" off its type.',
		])
		// Any Postgres type goes, nullable or not.
		expect(
			issues(
				table({
					columns: { ...bumps.columns, days: 'datemultirange', tags: 'text[]?', price: 'numeric(12, 2)?' },
				})
			)
		).toEqual([])
	})

	it('checks the indexes: columns the table has, under a name that fits', () => {
		expect(issues(table({ indexes: { bumped: ['name', 'missing'] } }))).toEqual([
			'tables.links.indexes.bumped.1: The index "bumped" names the column "missing", which the table doesn\'t have.',
		])
		expect(issues(table({ indexes: { bumped: { columns: ['name', 'name'], unique: true } } }))).toEqual([
			'tables.links.indexes.bumped.columns.1: The index "bumped" names the column "name" twice.',
		])
		expect(issues(table({ indexes: { bumped: [] } }))[0]).toContain('tables.links.indexes.bumped')
		expect(issues(table({ indexes: { bumped: { columns: ['name'], where: 'note IS NULL' } } }))[0]).toContain(
			'tables.links.indexes.bumped'
		)

		const long = 'a'.repeat(58)

		expect(issues(table({ indexes: { [long]: ['name'] } }))).toEqual([
			`tables.links.indexes.${long}: The index "${long}" is called "links_${long}" in Postgres, which is over 63 characters. Give it a shorter name.`,
		])
	})

	it('wants the partition columns in the primary key & in every unique index', () => {
		const partitionBy = { hash: ['name'], partitions: 4 }

		expect(issues(table({ partitionBy, primaryKey: ['id'] }))).toEqual([
			'tables.links.primaryKey: The primary key of a partitioned table has to contain its partition columns: "name" is missing.',
		])
		expect(issues(table({ partitionBy, indexes: { id: { columns: ['id'], unique: true } } }))).toEqual([
			'tables.links.indexes.id.columns: The unique index "id" of a partitioned table has to contain its partition columns: "name" is missing.',
		])
		expect(
			issues(
				table({
					partitionBy: { hash: ['name', 'amount'], partitions: 4 },
					indexes: { id: { columns: ['id'], unique: true } },
				})
			)
		).toEqual([
			'tables.links.primaryKey: The primary key of a partitioned table has to contain its partition columns: "amount" is missing.',
			'tables.links.indexes.id.columns: The unique index "id" of a partitioned table has to contain its partition columns: "name", "amount" is missing.',
		])

		// An index that isn't unique, or one with the partition columns, is fine. So is any index of a plain table.
		expect(
			issues(table({ partitionBy, indexes: { id: ['id'], both: { columns: ['id', 'name'], unique: true } } }))
		).toEqual([])
		expect(
			issues(
				table({
					partitionBy: undefined,
					primaryKey: ['id'],
					indexes: { id: { columns: ['amount'], unique: true } },
				})
			)
		).toEqual([])
	})

	it('checks the partitioning & the fillfactor', () => {
		expect(issues(table({ partitionBy: { hash: ['missing'], partitions: 4 } }))[0]).toBe(
			'tables.links.partitionBy.hash.0: The partitioning names the column "missing", which the table doesn\'t have.'
		)
		expect(issues(table({ partitionBy: { hash: ['name'], partitions: 1 } }))[0]).toContain(
			'tables.links.partitionBy.partitions'
		)
		expect(issues(table({ partitionBy: { hash: ['name'], partitions: 2000 } }))[0]).toContain(
			'tables.links.partitionBy.partitions'
		)
		expect(issues(table({ partitionBy: { hash: ['name'] } }))[0]).toContain('tables.links.partitionBy.partitions')
		expect(issues(table({ partitionBy: { range: ['name'], partitions: 4 } }))[0]).toContain(
			'tables.links.partitionBy'
		)
		expect(issues(table({ fillfactor: 5 }))[0]).toContain('tables.links.fillfactor')
		expect(issues(table({ fillfactor: 101 }))[0]).toContain('tables.links.fillfactor')

		const long = 'a'.repeat(61)

		expect(issues({ tables: { [long]: { ...bumps, indexes: undefined } } })).toEqual([
			`tables.${long}: The partitions of "${long}" are called "${long}_p0" and up in Postgres, which gets over 63 characters. Give the table a shorter name.`,
		])
	})
})

describe('postgres app config', () => {
	const parse = (postgres?: unknown) =>
		AppSchema.parse({ name: 'test-app', region: 'us-east-1', profile: 'test', postgres }).postgres

	it('has a small database by default, with the longest backups', () => {
		expect(parse()).toEqual({ memory: { min: 1, max: 8 }, backup: { retention: days(35) } })
	})

	it('takes a memory range, a backup retention & a version', () => {
		expect(parse({ memory: { min: 4, max: 129 }, backup: { retention: '7 days' }, version: '17.5' })).toEqual({
			memory: { min: 4, max: 129 },
			backup: { retention: days(7) },
			version: '17.5',
		})
	})

	it('refuses memory that Aurora does not offer', () => {
		expect(() => parse({ memory: { min: 0.5 } })).toThrow('Memory goes in steps of 1 GiB.')
		expect(() => parse({ memory: { max: 1 } })).toThrow('The maximum memory can not be under 2 GiB.')
		expect(() => parse({ memory: { max: 600 } })).toThrow('Memory can not be over 512 GiB.')
		expect(() => parse({ memory: { min: -1 } })).toThrow('The minimum memory can not be under 0.')
		expect(() => parse({ memory: { min: 16, max: 4 } })).toThrow('The minimum memory can not exceed the maximum.')
	})

	it('only pauses a database that can scale to nothing', () => {
		expect(parse({ memory: { min: 0 }, idleTimeout: '10 minutes' })).toMatchObject({ memory: { min: 0, max: 8 } })
		expect(() => parse({ memory: { min: 0 } })).toThrow('A minimum memory of 0 pauses the database when idle')
		expect(() => parse({ idleTimeout: '10 minutes' })).toThrow('idleTimeout needs a minimum memory of 0')
		expect(() => parse({ memory: { min: 2 }, idleTimeout: '10 minutes' })).toThrow(
			'idleTimeout needs a minimum memory of 0'
		)
		expect(() => parse({ memory: { min: 0 }, idleTimeout: '1 minute' })).toThrow(
			'The idle timeout can not be under 5 minutes.'
		)
		expect(() => parse({ memory: { min: 0 }, idleTimeout: '2 days' })).toThrow(
			'The idle timeout can not be over a day.'
		)
	})

	it('only takes a backup retention & a version Aurora knows', () => {
		expect(() => parse({ backup: { retention: '36 days' } })).toThrow('A backup retention can not be over 35 days.')
		expect(() => parse({ backup: { retention: '36 hours' } })).toThrow('A backup retention must be whole days.')
		expect(() => parse({ backup: { retention: '12 hours' } })).toThrow()
		expect(() => parse({ version: 'latest' })).toThrow('A version looks like')
		expect(() => parse({ instances: 2 })).toThrow()
	})
})

const postgres = { tables: { counters } }

describe('postgres feature', () => {
	const generate = async (stacks: Record<string, unknown>[]) => {
		const files: Record<string, string | undefined> = {}

		await postgresFeature.onTypeGen!({
			appConfig: {} as never,
			stackConfigs: stacks.map(stack => ({ ...StackSchema.parse(stack), file: 'stack.jsonc' })),
			async write(file, data) {
				files[file] = (data as TypeFile | undefined)?.toString()
			},
		})

		return files['postgres.d.ts']
	}

	it('types a database for every stack that declares one', async () => {
		const types = await generate([
			{ name: 'related-links', postgres },
			{ name: 'plain' },
			{ name: 'counter', postgres },
		])

		expect(types).toContain("declare module 'awsless' {")
		expect(types).toContain(
			'\tinterface PostgresResources {\n\t\treadonly relatedLinks: PostgresDatabase\n\t\treadonly counter: PostgresDatabase\n\t}'
		)
		expect(types).toContain('readonly schema: string')
		expect(types).toContain(
			'readonly query: <Row = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<Row[]>'
		)
		expect(types).not.toContain('plain')
	})

	it('writes no types without a database', async () => {
		expect(await generate([{ name: 'plain' }])).toBeUndefined()
	})

	it('builds the app for dev, tests & types', () => {
		expect(() => createTestApp({ stacks: [{ name: 'counter', postgres }] })).not.toThrow()
	})

	it('builds the app for a deploy too, with its cluster', () => {
		const { app } = createApp({
			appConfig: AppSchema.parse({ name: 'test-app', region: 'us-east-1', profile: 'test' }),
			stackConfigs: [{ ...StackSchema.parse({ name: 'counter', postgres }), file: 'counter/stack.jsonc' }],
			accountId: '123456789012',
			// Only the deploy command reads the remote config values.
			configValues: {},
		})

		expect(listResources(app, 'aws_rds_cluster')).toHaveLength(1)
	})
})

describe('postgres test manifest', () => {
	let root: string

	beforeAll(async () => {
		root = await copyExample()
	})

	afterAll(async () => {
		setRoot()
		await rm(root, { recursive: true, force: true })
	})

	it('carries the declared tables & the function files of every stack, so a change of either changes it', async () => {
		const first = await load(root)
		const manifest = createTestManifest(first.appConfig, first.stackConfigs)

		expect(manifest.postgres).toEqual([
			{
				stack: 'counter',
				tables: { counters, bumps },
				functions: [
					{
						name: 'counter/src/util/sql/function.sql',
						sql: await readFile(join(root, 'counter/src/util/sql/function.sql'), 'utf8'),
					},
				],
			},
		])

		const file = join(root, 'counter/src/util/sql/function.sql')

		await writeFile(file, `${await readFile(file, 'utf8')}\n-- changed`)

		const changedFile = JSON.stringify(createTestManifest(first.appConfig, first.stackConfigs))

		expect(changedFile).not.toBe(JSON.stringify(manifest))

		// The stack file holds the tables.
		await writeStack(root, { tables: { counters: { ...counters, fillfactor: 80 }, bumps }, functions })

		const second = await load(root)

		expect(JSON.stringify(createTestManifest(second.appConfig, second.stackConfigs))).not.toBe(changedFile)
	})
})

// A real server boots here, which takes its time on a busy machine.
describe('postgres dev', { timeout: 60_000 }, () => {
	let root: string
	let stackConfigs: StackConfig[]

	const pool = createServerPool()

	// What a start of the dev environment does around the feature hooks. A
	// save of a config file runs it again in the same process, with the pool
	// that holds the servers of the run before.
	const boot = async (serverPool = pool) => {
		serverPool.begin()

		const dev = createDevContext({
			appConfig: { name: 'app-postgres', region: 'eu-west-1' } as never,
			stackConfigs,
			appId: 'test',
			routerPorts: {},
			log: () => {},
			pool: serverPool,
		})

		await postgresOnDev(dev.context)
		await serverPool.sweep()

		return dev
	}

	// The process of the dev server.
	const serverPid = async () => {
		const client = postgresClient({ url: pool.peek<{ url: string }>('postgres')!.url })
		const [row] = await client.query<{ dir: string }>("SELECT current_setting('data_directory') AS dir")
		const [pid] = (await readFile(join(row!.dir, 'postmaster.pid'), 'utf8')).split('\n')

		await client.close()

		return Number(pid)
	}

	// The dev environment after a save of the stack file with another declaration.
	const redeclare = async (tables: object) => {
		await writeStack(root, { tables, functions })

		stackConfigs = (await load(root)).stackConfigs

		return boot()
	}

	const functionFile = () => join(root, 'counter/src/util/sql/function.sql')

	beforeAll(async () => {
		root = await copyExample()
		stackConfigs = (await load(root)).stackConfigs
	})

	afterAll(async () => {
		await pool.stopAll()
		setRoot()
		await rm(root, { recursive: true, force: true })
	})

	it('runs a server with the declared tables & functions of every stack', async () => {
		const dev = await boot()
		const client = postgresClient({ url: dev.env['POSTGRES_URL']!, schema: 'counter' })

		expect(await client.query("SELECT bump('visits')::int AS value")).toEqual([{ value: 1 }])
		expect(await client.query('SELECT tableoid::regclass::text AS partition, amount::int FROM bumps')).toEqual([
			{ partition: expect.stringMatching(/^bumps_p[0-3]$/), amount: 1 },
		])
		expect(dev.resources).toEqual([
			{
				kind: 'postgres',
				stack: 'counter',
				id: 'counter',
				detail: expect.stringMatching(/^127\.0\.0\.1:\d+$/),
				channel: 'postgres',
			},
		])
		expect(dev.health.get('postgres')).toMatchObject({ status: 'up' })

		await client.close()
	})

	it('keeps the server & its data across a reload of the environment', async () => {
		const before = pool.peek<{ url: string }>('postgres')!.url
		const pid = await serverPid()

		// Twice: the reload after a save of app.jsonc, and of a stack file.
		for (const expected of [2, 3]) {
			const dev = await boot()
			const client = postgresClient({ url: dev.env['POSTGRES_URL']!, schema: 'counter' })

			expect(dev.env['POSTGRES_URL']).toBe(before)
			expect(await serverPid()).toBe(pid)
			expect(dev.health.get('postgres')).toMatchObject({ status: 'up' })
			expect(await client.query("SELECT bump('visits')::int AS value")).toEqual([{ value: expected }])

			await client.close()
		}
	})

	it('changes a table in place when the stack file changes, keeping its rows', async () => {
		const dev = await redeclare({
			counters: {
				...counters,
				columns: { ...counters.columns, label: 'text?' },
				indexes: { label: ['label'] },
				fillfactor: 80,
			},
			bumps,
		})
		const client = postgresClient({ url: dev.env['POSTGRES_URL']!, schema: 'counter' })

		expect(await client.query('SELECT name, value::int, label FROM counters')).toEqual([
			{ name: 'visits', value: 3, label: null },
		])
		expect(
			await client.query(
				"SELECT indexname AS name FROM pg_indexes WHERE schemaname = 'counter' AND tablename = 'counters' ORDER BY 1"
			)
		).toEqual([{ name: 'counters_label' }, { name: 'counters_pkey' }])

		await client.close()
	})

	it('recreates a table whose change a deploy would refuse', async () => {
		// Another primary key & no partitions: local data can go.
		const dev = await redeclare({ counters, bumps: { ...bumps, primaryKey: ['id'], partitionBy: undefined } })
		const client = postgresClient({ url: dev.env['POSTGRES_URL']!, schema: 'counter' })

		expect(await client.query('SELECT * FROM bumps')).toEqual([])
		expect(await client.query('SELECT name, value::int FROM counters')).toEqual([{ name: 'visits', value: 3 }])

		await redeclare({ counters, bumps })
		await client.close()
	})

	it('applies a saved function file right away', async () => {
		const dev = await boot()
		const client = postgresClient({ url: dev.env['POSTGRES_URL']!, schema: 'counter' })
		const lines: string[] = []

		dev.events.subscribe('postgres', data => lines.push((data as { line: string }).line))

		for (const server of dev.servers) {
			await server.start({
				dispatch: async () => undefined,
				log: () => {},
				reportFailure: () => {},
				env: dev.env,
			})
		}

		const original = await readFile(functionFile(), 'utf8')

		await writeFile(
			functionFile(),
			`${original}\nCREATE FUNCTION doubled(value int) RETURNS int LANGUAGE sql AS $$ SELECT value * 2 $$;`
		)

		await expect
			.poll(() => client.query('SELECT doubled(21) AS value').catch(() => []), { timeout: 5000 })
			.toEqual([{ value: 42 }])
		expect(lines).toContain('Applied the function files of the counter stack.')

		// A file that fails says where, and leaves the schema as it was.
		await writeFile(
			functionFile(),
			`${original}\nCREATE FUNCTION broken() RETURNS int LANGUAGE sql AS $$ SELEC 1 $$;`
		)

		await expect
			.poll(() => lines.find(line => line.includes('failed')), { timeout: 5000 })
			.toContain('counter/src/util/sql/function.sql')
		expect(await client.query('SELECT doubled(21) AS value')).toEqual([{ value: 42 }])

		for (const server of dev.servers) {
			await server.stop?.()
		}

		await writeFile(functionFile(), original)
		await client.close()
	})

	it('empties the schemas on a data reset', async () => {
		const client = postgresClient({ url: pool.peek<{ url: string }>('postgres')!.url, schema: 'counter' })

		expect(await client.query('SELECT count(*)::int AS count FROM counters')).toEqual([{ count: 1 }])

		await createDataReset({ pool, stackConfigs })()

		expect(await client.query('SELECT count(*)::int AS count FROM counters')).toEqual([{ count: 0 }])
		expect(await client.query("SELECT bump('visits')::int AS value")).toEqual([{ value: 1 }])

		await client.close()
	})

	it('starts the next dev session empty, for the seed to fill', async () => {
		await pool.stopAll()

		const next = createServerPool()
		const dev = await boot(next)
		const client = postgresClient({ url: dev.env['POSTGRES_URL']!, schema: 'counter' })

		expect(await client.query('SELECT value::int FROM counters')).toEqual([])

		await client.close()
		await next.stopAll()
	})
})
