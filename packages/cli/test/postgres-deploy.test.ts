import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { RDSDataClient } from '@aws-sdk/client-rds-data'
import { postgresClient, postgresDataClient, type PostgresClient } from '@awsless/postgres'
import { PostgresServer } from '@awsless/postgres-server'
// A stand-in for the RDS Data API in front of a local Postgres.
import { fakeDataApi } from '@awsless/postgres/fake-data-api'
import { aws } from '@terraforge/aws'
import { App, Stack } from '@terraforge/core'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app'
import { AppSchema } from '../src/config/app'
import { loadAppConfig, loadStackConfigs } from '../src/config/load/load'
import { StackSchema } from '../src/config/stack'
import { FileError } from '../src/error'
import { Permission } from '../src/feature'
import { POSTGRES_VERSION, postgresFeature } from '../src/feature/postgres/index'
import { validateFeatures } from '../src/feature/validate'
import { createPostgresProvider } from '../src/formation/postgres'
import { SharedData } from '../src/shared'
import { setRoot } from '../src/util/path'
import { createTestApp, credentials, findStatements, listResources } from './_kit'

const counters = {
	columns: { name: { type: 'text', collate: 'C' }, value: { type: 'bigint', default: '0' } },
	primaryKey: ['name'],
	indexes: { value: ['value'] },
}

const postgres = { tables: { counters } }

// Every Data API call of the file, answered by the test.
const send = vi.spyOn(RDSDataClient.prototype, 'send')
const answerWith = (handle: (command: { constructor: { name: string }; input: object }) => Promise<unknown>) => {
	send.mockImplementation(handle as never)
}

const resource = (app: App, type: string) => {
	const found = listResources(app, type)

	expect(found).toHaveLength(1)

	return found[0]!
}

describe('postgres cluster', () => {
	it('creates no cluster without tables', () => {
		const { app, shared } = createTestApp({ stacks: [{ name: 'plain' }] })

		expect(listResources(app, 'aws_rds_cluster')).toEqual([])
		expect(listResources(app, 'aws_rds_cluster_instance')).toEqual([])
		expect(listResources(app, 'schema')).toEqual([])
		expect(shared.has('postgres', 'cluster-arn')).toBe(false)
		expect(findStatements(shared, 'rds-data:ExecuteStatement')).toEqual([])
	})

	it('creates one Aurora Serverless cluster for every stack with tables', () => {
		const { app } = createTestApp({
			stacks: [{ name: 'counter', postgres }, { name: 'related-links', postgres }, { name: 'plain' }],
		})

		expect(resource(app, 'aws_rds_cluster').input).toEqual({
			clusterIdentifier: 'test-app-postgres-main',
			engine: 'aurora-postgresql',
			engineMode: 'provisioned',
			engineVersion: POSTGRES_VERSION,
			allowMajorVersionUpgrade: true,
			masterUsername: 'postgres',
			// The password is RDS's own, in Secrets Manager.
			manageMasterUserPassword: true,
			// The Data API.
			enableHttpEndpoint: true,
			storageEncrypted: true,
			backupRetentionPeriod: 35,
			dbSubnetGroupName: expect.anything(),
			vpcSecurityGroupIds: [expect.anything()],
			serverlessv2ScalingConfiguration: { minCapacity: 0.5, maxCapacity: 4, secondsUntilAutoPause: undefined },
			applyImmediately: true,
			deletionProtection: false,
			skipFinalSnapshot: true,
		})
		expect(POSTGRES_VERSION).toBe('18.6')

		// One writer, which scales with the cluster.
		expect(resource(app, 'aws_rds_cluster_instance').input).toEqual({
			identifier: 'test-app-postgres-main-writer',
			clusterIdentifier: expect.anything(),
			engine: 'aurora-postgresql',
			engineVersion: expect.anything(),
			instanceClass: 'db.serverless',
			dbSubnetGroupName: expect.anything(),
			autoMinorVersionUpgrade: false,
			applyImmediately: true,
		})

		expect(resource(app, 'aws_db_subnet_group').input).toMatchObject({ name: 'test-app-postgres-main' })
		expect(resource(app, 'aws_db_subnet_group').input.subnetIds).toHaveLength(3)

		// A cluster keeps its default parameters.
		expect(listResources(app, 'aws_rds_cluster_parameter_group')).toEqual([])
		expect(listResources(app, 'aws_db_parameter_group')).toEqual([])
	})

	it('lets nothing connect to the cluster', () => {
		const { app } = createTestApp({ stacks: [{ name: 'counter', postgres }] })
		const group = listResources(app, 'aws_security_group').filter(meta => meta.urn.includes(':postgres:'))

		expect(group).toHaveLength(1)
		// No rule in the group itself, and none added to it.
		expect(group[0]!.input).toEqual({
			name: 'test-app-postgres-main',
			vpcId: expect.anything(),
			description: 'test-app Postgres: no way in, queries go through the Data API',
		})
		expect(
			listResources(app)
				.filter(meta => meta.urn.includes(':postgres:'))
				.map(meta => meta.type)
				.toSorted()
		).toEqual([
			'aws_db_subnet_group',
			'aws_rds_cluster',
			'aws_rds_cluster_instance',
			'aws_security_group',
			'schema',
		])
	})

	const clusterOf = (defaults: Record<string, unknown>) => {
		const { app } = createTestApp({ defaults, stacks: [{ name: 'counter', postgres }] })

		return { cluster: resource(app, 'aws_rds_cluster'), writer: resource(app, 'aws_rds_cluster_instance') }
	}

	it('takes the memory from the app, as ACU', () => {
		expect(
			clusterOf({ postgres: { memory: { min: 4, max: 32 } } }).cluster.input.serverlessv2ScalingConfiguration
		).toEqual({ minCapacity: 2, maxCapacity: 16, secondsUntilAutoPause: undefined })
	})

	it('pauses only a cluster that scales to zero, after the time the app gives', () => {
		expect(
			clusterOf({ postgres: { memory: { min: 0, max: 4 }, idleTimeout: '10 minutes' } }).cluster.input
				.serverlessv2ScalingConfiguration
		).toEqual({ minCapacity: 0, maxCapacity: 2, secondsUntilAutoPause: 600 })

		expect(() => clusterOf({ postgres: { memory: { min: 0, max: 4 } } })).toThrow(
			'A minimum memory of 0 pauses the database when idle'
		)

		expect(() => clusterOf({ postgres: { memory: { min: 1, max: 4 }, idleTimeout: '10 minutes' } })).toThrow(
			'idleTimeout needs a minimum memory of 0'
		)
	})

	it('takes the backup retention & the version from the app', () => {
		const { cluster, writer } = clusterOf({ postgres: { backup: { retention: '7 days' }, version: '18' } })

		expect(cluster.input.backupRetentionPeriod).toBe(7)
		expect(cluster.input.engineVersion).toBe('18')
		// Only a major version follows Aurora's minors.
		expect(writer.input.autoMinorVersionUpgrade).toBe(true)

		expect(clusterOf({ postgres: { version: '16.9' } }).cluster.input.engineVersion).toBe('16.9')
		expect(clusterOf({ postgres: { version: '16.9' } }).writer.input.autoMinorVersionUpgrade).toBe(false)
	})

	it('deletes the cluster with the app, without a last snapshot', () => {
		const { app } = createTestApp({ stacks: [{ name: 'counter', postgres }] })

		expect(resource(app, 'aws_rds_cluster').input).toMatchObject({
			deletionProtection: false,
			skipFinalSnapshot: true,
		})

		for (const meta of listResources(app).filter(meta => meta.urn.includes(':postgres:'))) {
			expect((meta.config as { retainOnDelete?: boolean }).retainOnDelete, meta.type).toBe(false)
		}
	})

	it('keeps & protects the cluster when the app retains its data', () => {
		const { app } = createTestApp({ app: { removal: 'retain' }, stacks: [{ name: 'counter', postgres }] })

		expect(resource(app, 'aws_rds_cluster').input).toMatchObject({
			deletionProtection: true,
			skipFinalSnapshot: false,
		})

		// With the subnets & the group it sits in.
		for (const meta of listResources(app).filter(meta => meta.urn.includes(':postgres:'))) {
			expect((meta.config as { retainOnDelete?: boolean }).retainOnDelete, meta.type).toBe(true)
		}

		// A table that left the stack file stays too.
		expect(resource(app, 'schema').input.retain).toBe(true)
	})

	it('gives every function the cluster & its secret, and the right to query through the Data API', () => {
		const app = new App('test-app')
		const base = new Stack(app, 'base')
		const shared = new SharedData()
		const vpc = new aws.Vpc(base, 'vpc', { cidrBlock: '10.0.0.0/16' })
		const env: Record<string, unknown> = {}
		const permissions: Permission[] = []

		shared.set('vpc', 'id', vpc.id)
		shared.set('vpc', 'private-subnets', [vpc.id, vpc.id])

		postgresFeature.onApp!({
			app,
			base,
			shared,
			appConfig: AppSchema.parse({ name: 'test-app', region: 'us-east-1', profile: 'test' }),
			stackConfigs: [{ ...StackSchema.parse({ name: 'counter', postgres }), file: 'counter/stack.jsonc' }],
			accountId: '123456789012',
			addEnv: (name: string, value: unknown) => {
				env[name] = value
			},
			addPermission: (permission: Permission) => {
				permissions.push(permission)
			},
		} as never)

		expect(Object.keys(env)).toEqual(['POSTGRES_CLUSTER_ARN', 'POSTGRES_SECRET_ARN', 'POSTGRES_DATABASE'])
		expect(env.POSTGRES_DATABASE).toBe('test_app')

		// Nothing more than statements & transactions on this cluster, with this secret.
		expect(permissions.map(permission => permission.actions)).toEqual([
			[
				'rds-data:ExecuteStatement',
				'rds-data:BeginTransaction',
				'rds-data:CommitTransaction',
				'rds-data:RollbackTransaction',
			],
			['secretsmanager:GetSecretValue'],
		])

		const [onCluster, onSecret] = permissions.map(permission => permission.resources as unknown[])

		expect(onCluster).toHaveLength(1)
		expect(onCluster![0]).toBe(env.POSTGRES_CLUSTER_ARN)
		expect(onSecret).toHaveLength(1)
		expect(onSecret![0]).toBe(env.POSTGRES_SECRET_ARN)
		expect(env.POSTGRES_SECRET_ARN).not.toBe(env.POSTGRES_CLUSTER_ARN)
		expect(shared.get('postgres', 'secret-arn')).toBe(env.POSTGRES_SECRET_ARN)
		expect(listResources(app, 'aws_rds_cluster')).toHaveLength(1)
	})

	it('adds those rights to the functions of the app', () => {
		const { shared } = createTestApp({
			stacks: [
				{
					name: 'counter',
					postgres,
					functions: { echo: { code: { file: { nocheck: './handler.ts' } }, memorySize: '256 MB' } },
				},
			],
		})

		expect(findStatements(shared, 'rds-data:ExecuteStatement')).toHaveLength(1)
		expect(findStatements(shared, 'secretsmanager:GetSecretValue')).toHaveLength(1)
		// Reading the secret is all it takes: no password parameter, no connection.
		expect(findStatements(shared, 'rds-db:connect')).toEqual([])
	})

	it('gives every stack with tables a schema in the one database of the app', async () => {
		const root = await mkdtemp(join(tmpdir(), 'awsless-postgres-deploy-'))
		const file = join(root, 'function.sql')

		await writeFile(file, 'CREATE FUNCTION one() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;\n')

		try {
			// A stack file with files in it is read as the CLI reads it.
			const stacks = [
				{ name: 'counter', postgres: { tables: { counters }, functions: [file] } },
				{ name: 'related-links', postgres },
			]
			const { app } = createApp({
				appConfig: AppSchema.parse({ name: 'test-app', region: 'us-east-1', profile: 'test' }),
				stackConfigs: await Promise.all(
					stacks.map(async stack => ({
						...(await StackSchema.parseAsync(stack)),
						file: `${stack.name}/stack.jsonc`,
					}))
				),
				accountId: '123456789012',
			})

			const [counter, links] = listResources(app, 'schema')

			expect(counter!.input).toEqual({
				clusterArn: expect.anything(),
				secretArn: expect.anything(),
				// The app's one database, and every stack's schema to look in.
				database: 'test_app',
				schema: 'counter',
				searchPath: 'counter,related_links',
				tables: JSON.stringify(StackSchema.parse({ name: 'counter', postgres }).postgres!.tables),
				functions: expect.any(String),
				retain: false,
			})
			// What the file holds, so a change of it is a change of the resource.
			expect(JSON.parse(counter!.input.functions)).toEqual([
				{
					name: expect.stringMatching(/function\.sql$/),
					sql: 'CREATE FUNCTION one() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;\n',
				},
			])
			expect(counter!.config).toMatchObject({ replaceOnChanges: ['schema'] })
			expect(links!.input).toMatchObject({ database: 'test_app', schema: 'related_links', functions: '[]' })
		} finally {
			await rm(root, { recursive: true })
		}
	})

	it('builds the deploy of the example app from its files, as far as a deploy goes without AWS', async () => {
		const example = join(import.meta.dirname, './fixture/postgres')
		const options = { configFile: join(example, 'app.jsonc') }
		const appConfig = await loadAppConfig(options)
		const stackConfigs = await loadStackConfigs(options)

		try {
			const { app } = createApp({
				appConfig,
				stackConfigs,
				accountId: '123456789012',
				// Only the deploy command reads the remote config values.
				configValues: {},
			})

			expect(resource(app, 'aws_rds_cluster').input).toMatchObject({
				clusterIdentifier: `${appConfig.name}-postgres-main`,
				engine: 'aurora-postgresql',
				engineVersion: POSTGRES_VERSION,
				allowMajorVersionUpgrade: true,
				enableHttpEndpoint: true,
				manageMasterUserPassword: true,
			})

			const schema = resource(app, 'schema').input
			const [file] = JSON.parse(schema.functions) as { name: string; sql: string }[]

			expect(schema).toMatchObject({
				database: 'app_postgres',
				schema: 'counter',
				searchPath: 'counter',
				retain: false,
			})
			expect(Object.keys(JSON.parse(schema.tables)).toSorted()).toEqual(['bumps', 'counters'])
			expect(file!.name).toBe('counter/src/util/sql/function.sql')
			expect(file!.sql).toBe(await readFile(join(example, 'counter/src/util/sql/function.sql'), 'utf8'))

			// What the provider would refuse or plan for this very state.
			const provider = createPostgresProvider({ credentials, region: 'us-east-1' })
			const planned = await provider.planResourceChange!({
				type: 'schema',
				priorState: null,
				proposedState: { ...schema, clusterArn: 'arn:cluster', secretArn: 'arn:secret' },
			} as never)

			expect(planned.requiresReplacement).toBe(false)
		} finally {
			setRoot()
		}
	})

	it('refuses a stack or an app named like a schema or database Postgres keeps for itself', () => {
		const validate =
			(name: string, block?: unknown, app = 'test-app') =>
			() =>
				validateFeatures({
					appConfig: AppSchema.parse({ name: app, region: 'us-east-1', profile: 'test' }),
					stackConfigs: [{ ...StackSchema.parse({ name, postgres: block }), file: `${name}/stack.jsonc` }],
				})

		expect(validate('public', postgres)).toThrow(FileError)
		expect(validate('public', postgres)).toThrow('its schema would be "public", which Postgres keeps for itself')
		expect(validate('pg-catalog', postgres)).toThrow('its schema would be "pg_catalog"')
		expect(validate('information-schema', postgres)).toThrow('its schema would be "information_schema"')
		expect(validate('counter', postgres, 'postgres')).toThrow(
			'its database would be "postgres", which Postgres keeps for itself'
		)
		expect(validate('counter', postgres, 'rdsadmin')).toThrow('its database would be "rdsadmin"')
		expect(validate('public')).not.toThrow()
		expect(validate('postgres', postgres)).not.toThrow()
		expect(validate('counter', postgres)).not.toThrow()
	})
})

const target = {
	clusterArn: 'arn:aws:rds:eu-west-1:123456789012:cluster:test-app-postgres-main',
	secretArn: 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:rds!cluster-0f1f2a3b',
}

const state = (tables: object, props: Record<string, unknown> = {}) => ({
	...target,
	database: 'counter',
	schema: 'counter',
	searchPath: 'counter',
	tables: JSON.stringify(tables),
	functions: JSON.stringify([]),
	retain: false,
	...props,
})

const bump = (body: string) => ({
	name: 'counter/src/util/sql/function.sql',
	sql: `-- Adds to a counter & answers what it holds.
CREATE FUNCTION bump(counter text, step bigint DEFAULT 1) RETURNS bigint LANGUAGE plpgsql AS $$
BEGIN
	${body}
END $$;
`,
})

const upsert = `INSERT INTO counters (name, value) VALUES (counter, step)
	ON CONFLICT (name) DO UPDATE SET value = counters.value + step;
	RETURN (SELECT value FROM counters WHERE name = counter);`

describe('postgres schema plan', () => {
	const provider = createPostgresProvider({ credentials, region: 'us-east-1' })

	beforeEach(() => {
		answerWith(async () => {
			throw new Error('A plan makes no call.')
		})
	})

	const plan = (prior: object | null, proposed: object) => {
		return provider.planResourceChange!({ type: 'schema', priorState: prior, proposedState: proposed } as never)
	}

	it('plans a new schema', async () => {
		expect(await plan(null, state({ counters }))).toMatchObject({
			state: state({ counters }),
			requiresReplacement: false,
		})
	})

	it('plans a new column, index & table in place', async () => {
		const next = state({
			counters: {
				...counters,
				columns: { ...counters.columns, note: 'text?' },
				indexes: { ...counters.indexes, note: ['note'] },
			},
			visits: counters,
		})

		expect(await plan(state({ counters }), next)).toMatchObject({ state: next, requiresReplacement: false })
	})

	it('plans a change of what a function file holds', async () => {
		const prior = state({ counters }, { functions: JSON.stringify([bump(upsert)]) })
		const next = state({ counters }, { functions: JSON.stringify([bump('RETURN 0;')]) })
		const planned = await plan(prior, next)

		expect(planned.requiresReplacement).toBe(false)
		expect(planned.state).toEqual(next)
		expect((planned.state as typeof next).functions).not.toBe(prior.functions)
	})

	it('refuses a change that Postgres can not make in place, before anything deploys', async () => {
		await expect(
			plan(state({ counters }), state({ counters: { ...counters, primaryKey: ['name', 'value'] } }))
		).rejects.toThrow('The primary key of Postgres table "counters" can\'t change in place')
		await expect(
			plan(
				state({ counters }),
				state({ counters: { ...counters, columns: { ...counters.columns, value: 'numeric' } } })
			)
		).rejects.toThrow('Postgres table "counters"')
		await expect(
			plan(
				state({ counters }),
				state({ counters: { ...counters, partitionBy: { hash: ['name'], partitions: 4 } } })
			)
		).rejects.toThrow('Postgres table "counters"')
	})

	it('plans a table that left the stack file', async () => {
		expect(await plan(state({ counters, visits: counters }), state({ counters }))).toMatchObject({
			requiresReplacement: false,
		})
	})

	it('makes the tables new on another cluster, whatever changed', async () => {
		const moved = state(
			{ counters: { ...counters, primaryKey: ['name', 'value'] } },
			{ clusterArn: 'arn:aws:rds:eu-west-1:123456789012:cluster:other' }
		)

		expect(await plan(state({ counters }), moved)).toMatchObject({ state: moved, requiresReplacement: false })
	})

	it('replaces a schema that moves to another database', async () => {
		expect(
			await plan(state({ counters }), state({ counters }, { database: 'visits', schema: 'visits' }))
		).toMatchObject({
			requiresReplacement: true,
		})
	})
})

describe('postgres schema apply', { timeout: 120_000 }, () => {
	const server = new PostgresServer()
	let api: ReturnType<typeof fakeDataApi>
	let provider: ReturnType<typeof createPostgresProvider>
	let admin: PostgresClient
	let deployed: PostgresClient

	// What a deployed function of the stack does.
	const query = <Row>(sql: string, params?: unknown[]) => deployed.query<Row>(sql, params)

	const tablesOf = async (database: string) => {
		const client = postgresClient({ url: server.url.replace(/\/postgres$/, `/${database}`) })

		try {
			const rows = await client.query<{ name: string }>(
				"SELECT tablename::text AS name FROM pg_tables WHERE schemaname = 'counter' ORDER BY 1"
			)

			return rows.map(row => row.name)
		} finally {
			await client.close()
		}
	}

	beforeAll(async () => {
		await server.listen()

		api = fakeDataApi({ url: server.url.replace(/\/postgres$/, '') })
		admin = postgresClient({ url: server.url })
		provider = createPostgresProvider({ credentials, region: 'us-east-1' })
		deployed = postgresDataClient({
			...target,
			database: 'counter',
			client: new RDSDataClient({ credentials, region: 'us-east-1' }),
		})
	})

	beforeEach(() => {
		answerWith(command => api.send(command))
	})

	afterAll(async () => {
		await admin?.close()
		await api?.close()
		await server.close()
	})

	it('makes the database of the stack, its tables & functions, through the Data API', async () => {
		const first = state({ counters }, { functions: JSON.stringify([bump(upsert)]) })
		const result = await provider.createResource({ type: 'schema', state: first } as never)

		expect(result.state).toEqual(first)
		expect(await admin.query("SELECT datname::text AS name FROM pg_database WHERE datname = 'counter'")).toEqual([
			{ name: 'counter' },
		])
		expect(await tablesOf('counter')).toEqual(['counters'])

		// Every call names the cluster & its secret, and nothing but those.
		expect(new Set(api.calls.map(call => `${call.input.resourceArn} ${call.input.secretArn}`))).toEqual(
			new Set([`${target.clusterArn} ${target.secretArn}`])
		)
		expect(api.calls.map(call => call.name)).toContain('BeginTransaction')
		expect(api.calls.at(-1)!.name).toBe('CommitTransaction')
	})

	it('lets a function find its tables by name, though the Data API keeps no setting between calls', async () => {
		expect(await query('SELECT bump($1) AS value', ['visits'])).toEqual([{ value: '1' }])
		expect(await query('SELECT bump($1, $2) AS value', ['visits', 41])).toEqual([{ value: '42' }])
		expect(await query('SELECT name, value FROM counters')).toEqual([{ name: 'visits', value: '42' }])
		expect(await query("SELECT current_setting('search_path') AS path")).toEqual([{ path: 'counter, public' }])
	})

	it('changes a table in place & runs the changed function file, keeping the rows', async () => {
		const next = state(
			{
				counters: { ...counters, columns: { ...counters.columns, note: 'text?' } },
				visits: counters,
			},
			{ functions: JSON.stringify([bump('RETURN -1;')]) }
		)

		await provider.updateResource({ type: 'schema', priorState: state({ counters }), proposedState: next } as never)

		expect(await tablesOf('counter')).toEqual(['counters', 'visits'])
		expect(await query('SELECT name, value, note FROM counters')).toEqual([
			{ name: 'visits', value: '42', note: null },
		])
		expect(await query('SELECT bump($1) AS value', ['visits'])).toEqual([{ value: '-1' }])
	})

	it('fails on a change that Postgres can not make in place & leaves everything as it was', async () => {
		const refused = state({
			counters: { ...counters, primaryKey: ['name', 'value'] },
			visits: counters,
			more: counters,
		})

		await expect(
			provider.updateResource({ type: 'schema', priorState: null, proposedState: refused } as never)
		).rejects.toThrow('The primary key of Postgres table "counters" can\'t change in place')

		expect(await tablesOf('counter')).toEqual(['counters', 'visits'])
		expect(api.calls.at(-1)!.name).toBe('RollbackTransaction')
	})

	it('says which file & line a statement of a function file failed on', async () => {
		const broken = state({ counters, visits: counters }, { functions: JSON.stringify([bump('RETRUN 1;')]) })

		await expect(
			provider.updateResource({ type: 'schema', priorState: null, proposedState: broken } as never)
		).rejects.toThrow(/^counter\/src\/util\/sql\/function\.sql:4: syntax error at or near "RETRUN"/)

		// The functions of before are still there.
		expect(await query('SELECT bump($1) AS value', ['visits'])).toEqual([{ value: '-1' }])
	})

	it('drops a table that left the stack file, unless the app retains its data', async () => {
		await provider.updateResource({
			type: 'schema',
			priorState: null,
			proposedState: state({ counters }, { retain: true }),
		} as never)

		expect(await tablesOf('counter')).toEqual(['counters', 'visits'])

		await provider.updateResource({ type: 'schema', priorState: null, proposedState: state({ counters }) } as never)

		expect(await tablesOf('counter')).toEqual(['counters'])
	})

	it('waits for a paused cluster to resume', async () => {
		api.pause(2)

		const started = api.calls.length

		await provider.updateResource({ type: 'schema', priorState: null, proposedState: state({ counters }) } as never)

		// The first statement was cancelled twice & sent a third time.
		expect(api.calls.slice(started, started + 3).map(call => call.input.sql)).toEqual([
			'CREATE DATABASE "counter"',
			'CREATE DATABASE "counter"',
			'CREATE DATABASE "counter"',
		])
	})

	it('runs the whole apply again after a call the service could not take', async () => {
		let failures = 2

		answerWith(async command => {
			// The second statement of the transaction, twice.
			if (command.constructor.name === 'CommitTransactionCommand' && failures-- > 0) {
				throw Object.assign(new Error('Service unavailable'), { name: 'ServiceUnavailableError' })
			}

			return api.send(command)
		})

		const next = state({ counters, later: counters })

		await provider.updateResource({ type: 'schema', priorState: null, proposedState: next } as never)

		expect(failures).toBe(-1)
		expect(await tablesOf('counter')).toEqual(['counters', 'later'])
	})

	it('gives up at once on what trying again can not change', async () => {
		let calls = 0

		answerWith(async () => {
			calls++

			throw Object.assign(new Error('User is not authorized to perform: rds-data:ExecuteStatement'), {
				name: 'AccessDeniedException',
			})
		})

		await expect(provider.createResource({ type: 'schema', state: state({ counters }) } as never)).rejects.toThrow(
			'not authorized'
		)
		expect(calls).toBe(1)
	})

	it('gives up on a service that stays away, after the time it has', async () => {
		const down = createPostgresProvider({
			credentials,
			region: 'us-east-1',
			retryDeadline: () => Date.now() - 1,
		})

		answerWith(async () => {
			throw Object.assign(new Error('Service unavailable'), { name: 'ServiceUnavailableError' })
		})

		await expect(down.createResource({ type: 'schema', state: state({ counters }) } as never)).rejects.toThrow(
			'Service unavailable'
		)
	})

	it('leaves the schema to the cluster when the whole app is deleted', async () => {
		const deleting = createPostgresProvider({
			credentials,
			region: 'us-east-1',
			dropSchemas: false,
		})

		answerWith(async () => {
			throw new Error('Deleting the app makes no call.')
		})

		await deleting.deleteResource({ type: 'schema', state: state({ counters }) } as never)

		expect(await tablesOf('counter')).toEqual(['counters', 'later'])
	})

	it('drops the tables & functions it made when the stack loses its Postgres block', async () => {
		// A table made by hand in the schema is not awsless's to drop.
		const byHand = postgresClient({ url: server.url.replace(/\/postgres$/, '/counter'), schema: 'counter' })

		await byHand.query('CREATE TABLE notes (id int PRIMARY KEY)')
		await byHand.close()

		await provider.deleteResource({ type: 'schema', state: state({ counters, later: counters }) } as never)

		expect(await tablesOf('counter')).toEqual(['notes'])
		await expect(query('SELECT bump($1) AS value', ['visits'])).rejects.toThrow(
			'function bump(unknown) does not exist'
		)
		// The database stays, with what else is in it.
		expect(await admin.query("SELECT count(*)::int AS count FROM pg_database WHERE datname = 'counter'")).toEqual([
			{ count: 1 },
		])
	})

	it('puts the schemas of two stacks in one database, where a query joins them', async () => {
		const path = 'orders,shop'
		const items = { columns: { id: 'integer', name: 'text' }, primaryKey: ['id'] }
		const lines = { columns: { id: 'integer', item_id: 'integer' }, primaryKey: ['id'] }
		const app = postgresDataClient({
			...target,
			database: 'app',
			client: new RDSDataClient({ credentials, region: 'us-east-1' }),
		})

		// Both stacks have a table called "items".
		await provider.createResource({
			type: 'schema',
			state: state({ items }, { database: 'app', schema: 'shop', searchPath: path }),
		} as never)
		await provider.createResource({
			type: 'schema',
			state: state({ items: lines }, { database: 'app', schema: 'orders', searchPath: path }),
		} as never)

		await app.query("INSERT INTO shop.items VALUES (1, 'pen')")
		await app.query('INSERT INTO orders.items VALUES (7, 1)')

		expect(
			await app.query(
				'SELECT line.id, item.name FROM orders.items AS line JOIN shop.items AS item ON item.id = line.item_id'
			)
		).toEqual([{ id: 7, name: 'pen' }])
		expect(await app.query("SELECT current_setting('search_path') AS path")).toEqual([
			{ path: 'orders, shop, public' },
		])
	})

	it('brings the database a stack had of its own along as the database of the app', async () => {
		const legacy = state({ counters }, { database: 'old_stack', schema: 'old_stack', searchPath: '' })

		// What a deploy before the app had one database left behind.
		await provider.createResource({ type: 'schema', state: legacy } as never)
		await admin.query('CREATE TABLE IF NOT EXISTS marker ()')

		const old = postgresClient({ url: server.url.replace(/\/postgres$/, '/old_stack') })

		await old.query("INSERT INTO old_stack.counters VALUES ('kept', 9)")
		await old.close()

		const next = state({ counters }, { database: 'moved_app', schema: 'old_stack', searchPath: 'old_stack' })
		const planned = await provider.planResourceChange!({
			type: 'schema',
			priorState: legacy,
			proposedState: next,
		} as never)

		// Not a replacement, which would start from empty tables.
		expect(planned.requiresReplacement).toBe(false)

		await provider.updateResource({ type: 'schema', priorState: legacy, proposedState: next } as never)

		const moved = postgresClient({ url: server.url.replace(/\/postgres$/, '/moved_app') })

		expect(await moved.query('SELECT name, value::int FROM old_stack.counters')).toEqual([
			{ name: 'kept', value: 9 },
		])
		await moved.close()

		expect(
			await admin.query(
				"SELECT datname::text AS name FROM pg_database WHERE datname IN ('old_stack', 'moved_app')"
			)
		).toEqual([{ name: 'moved_app' }])
	})

	it('leaves a second database of a stack for its owner to move', async () => {
		const legacy = state({ counters }, { database: 'other_stack', schema: 'other_stack', searchPath: '' })

		await provider.createResource({ type: 'schema', state: legacy } as never)

		const next = state(
			{ counters },
			{ database: 'moved_app', schema: 'other_stack', searchPath: 'old_stack,other_stack' }
		)

		await expect(
			provider.updateResource({ type: 'schema', priorState: legacy, proposedState: next } as never)
		).rejects.toThrow("Postgres can't move tables between databases")

		// Nothing of it was touched.
		expect(
			await admin.query("SELECT count(*)::int AS count FROM pg_database WHERE datname = 'other_stack'")
		).toEqual([{ count: 1 }])
	})

	it('counts a schema whose database is gone as dropped', async () => {
		await provider.deleteResource({
			type: 'schema',
			state: state({ counters }, { database: 'never_made', schema: 'never_made' }),
		} as never)

		answerWith(async () => {
			throw Object.assign(new Error('DBCluster test-app-postgres-main not found'), {
				name: 'BadRequestException',
			})
		})

		await provider.deleteResource({ type: 'schema', state: state({ counters }) } as never)
	})
})
