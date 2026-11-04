import { createHash } from 'crypto'
import { lookup } from 'dns/promises'
import { DeleteParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { clickhouseClient } from '@awsless/clickhouse'
import { ClickHouseServer } from '@awsless/clickhouse-server'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ExpectedError } from '../src/error'
import { formatPasswordParameter, formatServiceName } from '../src/feature/clickhouse/index'
import { resolveColumnType } from '../src/feature/clickhouse/schema'
import { hasClickHouseTables } from '../src/feature/clickhouse/util'
import { createClickHouseProvider, serviceGone } from '../src/formation/clickhouse'
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

// Real lookups unless a test says otherwise.
vi.mock('dns/promises', async original => {
	const actual = await original<typeof import('dns/promises')>()

	return { ...actual, lookup: vi.fn(actual.lookup) }
})

const notResolving = () => {
	return Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' })
}

describe('clickhouse', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('names the service & password apart per stage, leaving it out without one', () => {
		expect(formatServiceName('app', '111111111111')).toMatch(/^app-[a-z0-9]+$/)
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

	it('keeps backups in ClickHouse Cloud only, unless asked', () => {
		const { app } = createTestApp({ stacks: [{ name: 'stack-1', clickhouse: { events } }] })

		expect(listResources(app, 'backup-bucket')).toEqual([])
		expect(listResources(app, 'aws_iam_role').map(meta => meta.input.name)).not.toContain(
			'test-app--clickhouse--backup'
		)
		expect(listResources(app, 'clickhouse_service')[0]!.input.backupConfiguration).toBeUndefined()
	})

	it('writes backups to the app bucket through a role of its own', () => {
		const { app } = createTestApp({
			defaults: { clickhouse: { backup: { every: '12 hours', export: {} } } },
			stacks: [{ name: 'stack-1', clickhouse: { events } }],
		})

		const roles = listResources(app, 'aws_iam_role').filter(
			meta => meta.input.name === 'test-app--clickhouse--backup'
		)

		expect(roles).toHaveLength(1)
		expect(listResources(app, 'backup-bucket')).toHaveLength(1)
		expect(listResources(app, 'clickhouse_service')[0]!.input.backupConfiguration).toEqual({
			backupPeriodInHours: 12,
			backupRetentionPeriodInHours: undefined,
		})
	})

	it('only takes the backup intervals & retention ClickHouse Cloud offers', () => {
		const withBackup = (backup: object) => () =>
			createTestApp({
				defaults: { clickhouse: { backup } },
				stacks: [{ name: 'stack-1', clickhouse: { events } }],
			})

		expect(withBackup({ every: '10 hours' })).toThrow()
		expect(withBackup({ retention: '36 hours' })).toThrow()
		expect(withBackup({ retention: '12 hours' })).toThrow()
		expect(withBackup({ export: { retention: '12 hours' } })).toThrow()
		expect(withBackup({ every: '2 days', retention: '30 days' })).not.toThrow()
	})

	it("sets ClickHouse Cloud's own backup retention without a copy in the app bucket", () => {
		const { app } = createTestApp({
			defaults: { clickhouse: { backup: { retention: '7 days' } } },
			stacks: [{ name: 'stack-1', clickhouse: { events } }],
		})

		expect(listResources(app, 'backup-bucket')).toEqual([])
		expect(listResources(app, 'clickhouse_service')[0]!.input.backupConfiguration).toEqual({
			backupPeriodInHours: undefined,
			backupRetentionPeriodInHours: 168,
		})
	})

	it('retains the backup setting when the app retains its data', () => {
		const { app } = createTestApp({
			app: { removal: 'retain' },
			defaults: { clickhouse: { backup: { export: {} } } },
			stacks: [{ name: 'stack-1', clickhouse: { events } }],
		})

		expect((listResources(app, 'backup-bucket')[0]!.config as { retainOnDelete?: boolean }).retainOnDelete).toBe(
			true
		)
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
		vi.mocked(lookup).mockReset()
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

	it('leaves the tables to the service when the whole app is deleted', async () => {
		const send = vi.spyOn(SSMClient.prototype, 'send')
		const deleting = createClickHouseProvider({ credentials, region: 'us-east-1', dropTables: false })

		await deleting.deleteResource({ type: 'table', state: table(events) } as never)

		expect(send).not.toHaveBeenCalled()
		expect(lookup).not.toHaveBeenCalled()
	})

	it('counts a table on a deleted service as dropped', async () => {
		vi.useFakeTimers()
		vi.mocked(lookup).mockRejectedValue(notResolving())
		const send = vi.spyOn(SSMClient.prototype, 'send')

		try {
			const pending = provider.deleteResource({ type: 'table', state: table(events) } as never)

			await vi.runAllTimersAsync()
			await pending
		} finally {
			vi.useRealTimers()
		}

		expect(lookup).toHaveBeenCalledTimes(3)
		expect(send).not.toHaveBeenCalled()
	})

	it('tells a deleted service from a dns hiccup', async () => {
		vi.mocked(lookup).mockRejectedValueOnce(notResolving()).mockResolvedValueOnce({ address: '1.1.1.1', family: 4 })

		expect(await serviceGone('https://abc.clickhouse.cloud:8443', 3, 0)).toBe(false)

		vi.mocked(lookup).mockRejectedValueOnce(Object.assign(new Error('try again'), { code: 'EAI_AGAIN' }))

		expect(await serviceGone('https://abc.clickhouse.cloud:8443', 3, 0)).toBe(false)
	})

	describe('on a live service', () => {
		const server = new ClickHouseServer()

		beforeAll(async () => {
			await server.listen()
		}, 120_000)

		afterAll(async () => {
			await server.close()
		})

		it('drops the table', async () => {
			const client = clickhouseClient({ endpoint: server.endpoint })
			const tables = () =>
				client.query<{ name: string }>("SELECT name FROM system.tables WHERE name = 'stack-1--events'")

			vi.spyOn(SSMClient.prototype, 'send').mockImplementation(async () => ({}) as never)

			try {
				await provider.createResource({
					type: 'table',
					state: table(events, { endpoint: server.endpoint }),
				} as never)
				expect(await tables()).toHaveLength(1)

				await provider.deleteResource({
					type: 'table',
					state: table(events, { endpoint: server.endpoint }),
				} as never)
				expect(await tables()).toHaveLength(0)
			} finally {
				await client.close()
			}
		})
	})

	describe('backup bucket', () => {
		const key = { organizationId: 'org-1', tokenKey: 'key', tokenSecret: 'secret' }
		const cloud = createClickHouseProvider({
			credentials,
			region: 'us-east-1',
			cloudKey: key,
			retryDeadline: () => 0,
		})

		const state = {
			serviceId: 'service-1',
			bucketPath: 'https://bucket.s3.amazonaws.com/clickhouse',
			roleArn: 'arn:aws:iam::123456789012:role/test-app--clickhouse--backup',
			sessionName: 'secret-session',
		}

		const answer = (status: number, body: object = {}) => new Response(JSON.stringify(body), { status })

		const calls = (fetch: ReturnType<typeof vi.spyOn>) => {
			return fetch.mock.calls.map(([url, init]: unknown[]) => {
				const { method, body } = init as RequestInit
				return [method, String(url), body ? JSON.parse(body as string) : undefined]
			})
		}

		it('posts a new backup bucket', async () => {
			const fetch = vi
				.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(answer(404, { error: 'NOT_FOUND' }))
				.mockResolvedValueOnce(answer(200, { result: { id: 'b-1' } }))

			await cloud.createResource({ type: 'backup-bucket', state } as never)

			const path = 'https://api.clickhouse.cloud/v1/organizations/org-1/services/service-1/backupBucket'

			expect(calls(fetch)).toEqual([
				['GET', path, undefined],
				[
					'POST',
					path,
					{
						bucketProvider: 'AWS',
						bucketPath: state.bucketPath,
						iamRoleArn: state.roleArn,
						iamRoleSessionName: 'secret-session',
					},
				],
			])
			expect((fetch.mock.calls[0]![1] as RequestInit).headers).toMatchObject({
				authorization: `Basic ${Buffer.from('key:secret').toString('base64')}`,
			})
		})

		it('patches a backup bucket the service already has', async () => {
			const fetch = vi
				.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(answer(200, { result: { id: 'b-1' } }))
				.mockResolvedValueOnce(answer(200, { result: { id: 'b-1' } }))

			await cloud.updateResource({ type: 'backup-bucket', proposedState: state } as never)

			expect(calls(fetch).map(([method]: unknown[]) => method)).toEqual(['GET', 'PATCH'])
		})

		it('fails on a refused key', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(answer(403, { error: 'FORBIDDEN' }))

			await expect(cloud.createResource({ type: 'backup-bucket', state } as never)).rejects.toThrow(/403/)
		})

		it('removes the setting, or finds it gone with its service', async () => {
			const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(answer(404, { error: 'NOT_FOUND' }))

			await cloud.deleteResource({ type: 'backup-bucket', state } as never)

			expect(calls(fetch).map(([method]: unknown[]) => method)).toEqual(['DELETE'])
		})

		it('replaces the setting for a new service', async () => {
			const plan = await cloud.planResourceChange!({
				type: 'backup-bucket',
				priorState: state,
				proposedState: { ...state, serviceId: 'service-2' },
			} as never)

			expect(plan.requiresReplacement).toBe(true)
		})

		it('asks for the api key it needs', async () => {
			await expect(provider.createResource({ type: 'backup-bucket', state } as never)).rejects.toThrow(
				ExpectedError
			)
		})
	})
})
