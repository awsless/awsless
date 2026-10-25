import { createHash } from 'crypto'
import { DeleteParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatPasswordParameter, formatServiceName } from '../src/feature/clickhouse/index'
import { resolveColumnType } from '../src/feature/clickhouse/schema'
import { hasClickHouseTables } from '../src/feature/clickhouse/util'
import { createClickHouseProvider } from '../src/formation/clickhouse'
import { TypeObject } from '../src/type-gen/object'
import { createTestApp, credentials, findStatements, listResources, notFound, sent } from './_kit'

const events = {
	columns: {
		id: 'String',
		projectId: 'LowCardinality(String)',
		createdAt: "DateTime64(3, 'UTC')",
	},
	orderBy: ['projectId', 'createdAt'],
}

const code = { file: { nocheck: './handler.ts' } }

describe('clickhouse', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('names the service & password apart per stage, keeping the names without one', () => {
		const plain = formatServiceName('app', '111111111111')

		expect(plain).toMatch(/^app-[a-z0-9]+$/)
		expect(formatServiceName('app', '111111111111', undefined)).toBe(plain)
		expect(formatServiceName('app', '111111111111', 'staging')).toMatch(/^app-staging-[a-z0-9]+$/)
		expect(formatServiceName('app', '111111111111', 'staging')).not.toBe(
			formatServiceName('app', '111111111111', 'prod')
		)
		expect(formatPasswordParameter('app')).toBe('/.awsless-clickhouse/app/password')
		expect(formatPasswordParameter('app', 'prod')).toBe('/.awsless-clickhouse/app/prod/password')
	})

	it('creates no service without tables', () => {
		const { app } = createTestApp({ stacks: [{ name: 'stack-1' }] })

		expect(listResources(app, 'clickhouse_service')).toEqual([])
	})

	it('creates one service for every table in the app', () => {
		const { app } = createTestApp({
			stacks: [
				{ name: 'stack-1', clickhouse: { events } },
				{ name: 'stack-2', clickhouse: { visits: events } },
			],
		})

		const [service] = listResources(app, 'clickhouse_service')

		expect(listResources(app, 'clickhouse_service')).toHaveLength(1)
		// One ClickHouse organisation may serve several AWS accounts.
		expect(service!.input.name).toMatch(/^test-app-[a-z0-9]+$/)
		expect(service!.input).toMatchObject({
			cloudProvider: 'aws',
			region: 'us-east-1',
			idleScaling: true,
			idleTimeoutMinutes: 15,
			minReplicaMemoryGb: 8,
			maxReplicaMemoryGb: 12,
			ipAccess: [{ source: '0.0.0.0/0', description: 'awsless' }],
		})

		const tables = listResources(app, 'password').concat(listResources(app, 'table'))

		expect(tables.map(meta => meta.input.name ?? meta.input.parameter)).toEqual([
			'/.awsless-clickhouse/test-app/password',
			'stack-1--events',
			'stack-2--visits',
		])
	})

	it('takes the service settings from the app', () => {
		const { app } = createTestApp({
			defaults: {
				clickhouse: {
					region: 'eu-central-1',
					memory: { min: 16, max: 32 },
					idle: false,
					ipAccess: ['10.0.0.0/8'],
					releaseChannel: 'slow',
				},
			},
			stacks: [{ name: 'stack-1', clickhouse: { events } }],
		})

		const [service] = listResources(app, 'clickhouse_service')

		expect(service!.input).toMatchObject({
			region: 'eu-central-1',
			idleScaling: false,
			minReplicaMemoryGb: 16,
			maxReplicaMemoryGb: 32,
			ipAccess: [{ source: '10.0.0.0/8', description: 'awsless' }],
			releaseChannel: 'slow',
		})
		expect(service!.input.idleTimeoutMinutes).toBeUndefined()
	})

	it('rejects memory that ClickHouse Cloud does not offer', () => {
		expect(() =>
			createTestApp({
				defaults: { clickhouse: { memory: { min: 6 } } },
				stacks: [{ name: 'stack-1', clickhouse: { events } }],
			})
		).toThrow()
	})

	it('rejects an idle timeout under 5 minutes', () => {
		expect(() =>
			createTestApp({
				defaults: { clickhouse: { idleTimeout: '1 minute' } },
				stacks: [{ name: 'stack-1', clickhouse: { events } }],
			})
		).toThrow()
	})

	it('lets the lambdas read the password parameter', () => {
		const { shared } = createTestApp({
			stacks: [{ name: 'stack-1', clickhouse: { events }, functions: { echo: { code, memorySize: '256 MB' } } }],
		})

		expect(shared.get('clickhouse', 'parameter')).toBe('/.awsless-clickhouse/test-app/password')

		const [statement] = findStatements(shared, 'ssm:GetParameter').filter(statement =>
			JSON.stringify(statement.resources).includes('awsless-clickhouse')
		)

		expect(statement!.resources).toEqual([
			'arn:aws:ssm:us-east-1:123456789012:parameter/.awsless-clickhouse/test-app/password',
		])
		// The runtime fetches it with GetParameters.
		expect(statement!.actions).toContain('ssm:GetParameters')
	})

	it('names a table in the types as declared', () => {
		expect(new TypeObject(0).addKey('page-views', 'X').addKey('events', 'Y').toString()).toBe(
			"{\n\treadonly 'page-views': X\n\treadonly events: Y\n}"
		)
	})

	it('retains the service & tables when the app retains its data', () => {
		const { app } = createTestApp({
			app: { removal: 'retain' },
			stacks: [{ name: 'stack-1', clickhouse: { events } }],
		})

		for (const type of ['clickhouse_service', 'password', 'table']) {
			expect((listResources(app, type)[0]!.config as { retainOnDelete?: boolean }).retainOnDelete).toBe(true)
		}
	})

	it('rejects invalid table & column names', () => {
		expect(() => createTestApp({ stacks: [{ name: 'stack-1', clickhouse: { Events: events } }] })).toThrow()
		expect(() =>
			createTestApp({
				stacks: [{ name: 'stack-1', clickhouse: { events: { columns: { 'bad-name': 'String' } } } }],
			})
		).toThrow()
	})

	it('knows when an app has tables', () => {
		const stack = (props: object) => ({ name: 'stack-1', file: 'stack.jsonc', ...props }) as never

		expect(hasClickHouseTables([stack({})])).toBe(false)
		expect(hasClickHouseTables([stack({ clickhouse: { events } })])).toBe(true)
	})
})

describe('clickhouse column types', () => {
	it('reads friendly names as ClickHouse types', () => {
		expect(resolveColumnType('string')).toBe('String')
		expect(resolveColumnType('keyword')).toBe('LowCardinality(String)')
		expect(resolveColumnType('keyword[]')).toBe('Array(LowCardinality(String))')
		expect(resolveColumnType('keyword?')).toBe('LowCardinality(Nullable(String))')
		expect(resolveColumnType('string?')).toBe('Nullable(String)')
		expect(resolveColumnType('number[]?')).toBe('Array(Nullable(Float64))')
		expect(resolveColumnType('date')).toBe("DateTime64(3, 'UTC')")
		expect(resolveColumnType('Decimal(18, 4)')).toBe('Decimal(18, 4)')
		expect(resolveColumnType('UInt8')).toBe('UInt8')
	})

	it('deploys the ClickHouse types of friendly columns', () => {
		const { app } = createTestApp({
			stacks: [
				{
					name: 'stack-1',
					clickhouse: {
						events: {
							columns: {
								id: 'string',
								country: 'keyword',
								flags: 'keyword[]',
								at: { type: 'date', default: 'now64(3)' },
							},
							orderBy: ['at'],
						},
					},
				},
			],
		})

		const [table] = listResources(app, 'table')

		expect(JSON.parse(table!.input.definition).columns).toEqual({
			id: 'String',
			country: 'LowCardinality(String)',
			flags: 'Array(LowCardinality(String))',
			at: { type: "DateTime64(3, 'UTC')", default: 'now64(3)' },
		})
	})
})

describe('clickhouse resources', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	const provider = createClickHouseProvider({ credentials, region: 'us-east-1' })

	it('stores a generated password & keeps only its hash', async () => {
		const send = vi.spyOn(SSMClient.prototype, 'send').mockImplementation(async () => ({}) as never)

		const result = await provider.createResource({
			type: 'password',
			state: { parameter: '/.awsless-clickhouse/app/password' },
		} as never)

		const [put] = sent(send, PutParameterCommand)
		const password = put!.input.Value!

		expect(put!.input).toMatchObject({ Name: '/.awsless-clickhouse/app/password', Type: 'SecureString' })
		expect(password).toMatch(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*_).{40,}$/)
		expect(result.state).toEqual({
			parameter: '/.awsless-clickhouse/app/password',
			hash: createHash('sha256').update(password).digest('base64'),
		})
		expect(JSON.stringify(result.state)).not.toContain(password)
	})

	it('keeps the password while its parameter stays', async () => {
		const plan = await provider.planResourceChange!({
			type: 'password',
			priorState: { parameter: '/p', hash: 'abc' },
			proposedState: { parameter: '/p' },
		} as never)

		expect(plan).toMatchObject({ requiresReplacement: false, state: { parameter: '/p', hash: 'abc' } })
	})

	it('deletes the password parameter, gone or not', async () => {
		const send = vi.spyOn(SSMClient.prototype, 'send').mockImplementation(async () => {
			throw notFound('ParameterNotFound')
		})

		await provider.deleteResource({ type: 'password', state: { parameter: '/p' } } as never)

		expect(sent(send, DeleteParameterCommand)).toHaveLength(1)
	})

	const table = (definition: object, props: object = {}) => ({
		endpoint: 'https://abc.clickhouse.cloud:8443',
		parameter: '/p',
		name: 'stack-1--events',
		definition: JSON.stringify(definition),
		...props,
	})

	it('plans column changes in place', async () => {
		const plan = await provider.planResourceChange!({
			type: 'table',
			priorState: table(events),
			proposedState: table({ ...events, columns: { ...events.columns, score: 'Float64' } }),
		} as never)

		expect(plan.requiresReplacement).toBe(false)
	})

	it('refuses a new sort key before anything deploys', async () => {
		await expect(
			provider.planResourceChange!({
				type: 'table',
				priorState: table(events),
				proposedState: table({ ...events, orderBy: ['createdAt'] }),
			} as never)
		).rejects.toThrow(/orderBy .* can't change in place/)
	})

	it('replaces a renamed table', async () => {
		const plan = await provider.planResourceChange!({
			type: 'table',
			priorState: table(events),
			proposedState: table(events, { name: 'stack-1--visits' }),
		} as never)

		expect(plan.requiresReplacement).toBe(true)
	})
})
