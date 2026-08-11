import type { Mock } from 'vitest'

// The vitest globals, declared instead of imported so importing this
// module never adds a runtime vitest dependency.
declare const vi: (typeof import('vitest'))['vi']
declare const beforeEach: (typeof import('vitest'))['beforeEach']
declare const expect: (typeof import('vitest'))['expect']
import { getAlertName } from '../server/alert.js'
import { setConfigValue } from '../server/config.js'
import { getFunctionName } from '../server/function.js'
import { getInstanceQueueName } from '../server/instance.js'
import { getJobName } from '../server/job.js'
import { getPubSubPublisherName } from '../server/pubsub.js'
import { getQueueName } from '../server/queue.js'
import { getSearchProps } from '../server/search.js'
import { getTableName } from '../server/table.js'
import { getTaskName } from '../server/task.js'
import { getTopicName } from '../server/topic.js'
import { hookTestCleanup } from './cleanup.js'

// The manifest the cli generates from the app config, handing the test
// environment everything it needs to materialize the whole app.
export type TestManifest = {
	app: string
	region: string
	configs: Record<string, string>
	tables: unknown[]
	// Tables with a stream consumer: the real handler runs on every
	// write, settled before the write resolves.
	streams?: { stack: string; id: string; file: string; hash: string; sort?: string }[]
	// The declared search indexes, created per test file on the shared
	// run-wide opensearch server.
	searches?: { stack: string; id: string; mappings: unknown; settings?: unknown }[]
	functions: { stack: string; id: string; file: string }[]
	tasks: { stack: string; id: string; file: string }[]
	queues: { stack: string; id: string; file: string }[]
	topics: string[]
	pubsub: string[]
	caches?: { stack: string; id: string }[]
	alerts?: string[]
	jobs?: { stack: string; id: string }[]
	instances?: { stack: string; id: string }[]

	// The shared resource servers the cli boots once for the whole test
	// run - test files namespace into them instead of booting their own.
	servers?: {
		dynamo?: { endpoint: string }
		redis?: { host: string; port: number }
		search?: { domain: string }
	}
}

// Every materialized resource spy, keyed by its physical name - the
// `mock` proxy resolves overrides & assertions through this registry.
export const testRegistry = {
	emails: {} as Record<string, Mock>,
	functions: {} as Record<string, Mock>,
	tasks: {} as Record<string, Mock>,
	queues: {} as Record<string, Mock>,
	topics: {} as Record<string, Mock>,
	pubsub: {} as Record<string, Mock>,
	alerts: {} as Record<string, Mock>,
	jobs: {} as Record<string, Mock>,
	instances: {} as Record<string, Mock>,
}

// A spy that lazily imports the real handler file on first call, so
// cross stack calls run the actual code of the other stack & the
// contract between stacks is really tested.
const realHandler = (importFile: (file: string) => Promise<any>, file: string) => {
	let cached: Promise<(payload: unknown) => unknown> | undefined

	return vi.fn((payload: unknown) => {
		cached ??= importFile(file).then(module => {
			const handle = module.default

			if (typeof handle !== 'function') {
				throw new Error(`The handler file has no default export: ${file}`)
			}

			return handle
		})

		return cached.then(handle => handle(payload))
	})
}

// Materialize the whole app for a test file: every table exists, every
// function, task & queue consumer runs its real handler, and topic &
// pubsub publishes are recorded no-op spies. The `mock` api overrides
// any of them.
export const setupTestEnv = async (manifest: TestManifest, options: { importFile: (file: string) => Promise<any> }) => {
	// The mock packages load lazily, so importing awsless stays free of
	// test machinery outside of test runs.
	const [
		{ mockDynamoDB, migrate, DynamoDBClient, streamTable, define, object, any },
		{ mockLambda },
		{ mockS3 },
		{ mockScheduler },
		{ mockSNS },
		{ mockSQS },
		{ mockCloudWatch },
		{ mockEcs },
		{ mockSES },
	] = await Promise.all([
		import('@awsless/dynamodb'),
		import('@awsless/lambda'),
		import('@awsless/s3'),
		import('@awsless/scheduler'),
		import('@awsless/sns'),
		import('@awsless/sqs'),
		import('@awsless/cloudwatch'),
		import('@awsless/ecs'),
		import('@awsless/ses'),
	])

	// Metrics are recorded into the void.
	mockCloudWatch()

	// Registered during collection, since hooks can't register inside a
	// running test - resources like cache clients clean up through it.
	hookTestCleanup()

	// Big floats compare by numeric value: arithmetic results keep a
	// denormalized internal representation (150 as 150e14 x 10^-12)
	// while transport round trips normalize - both are the same number.
	const isBigFloat = (value: unknown): value is { toString: () => string } =>
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { coefficient?: unknown }).coefficient === 'bigint' &&
		typeof (value as { exponent?: unknown }).exponent === 'number'

	expect.addEqualityTesters([
		function (a, b) {
			if (isBigFloat(a) && isBigFloat(b)) {
				return a.toString() === b.toString()
			}

			return undefined
		},
	])

	// The test config values are set before any test file import
	// resolves, so import time Config reads just work.
	for (const [name, value] of Object.entries(manifest.configs)) {
		setConfigValue(name, value)
	}

	if (manifest.tables.length > 0) {
		// The app prefix may be unique per test file, so the physical
		// table names follow it.
		const app = process.env.APP!
		const tables = (manifest.tables as { TableName: string }[]).map(table => ({
			...table,
			TableName: table.TableName.replace(`${manifest.app}--`, `${app}--`),
		}))

		const shared = manifest.servers?.dynamo

		if (shared) {
			// The tables live on the run-wide shared server, namespaced
			// by this file's unique app prefix - clients reach it over
			// the endpoint env, like the local dev environment.
			const client = new DynamoDBClient({
				endpoint: shared.endpoint,
				region: manifest.region,
				credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
			})

			await migrate(client, tables as any)
			client.destroy()
		} else {
			// Every table stream runs its real consumer, settled before
			// the write call resolves - so a test can write & directly
			// observe the consumer's effects.
			const streams = (manifest.streams ?? []).map(entry => {
				return streamTable(
					define(getTableName(entry.id, entry.stack), {
						hash: entry.hash,
						sort: entry.sort,
						schema: object({}, any()),
					} as never),
					async payload => {
						const consumer = await options.importFile(entry.file)
						await consumer.default(payload)
					}
				)
			})

			mockDynamoDB({ tables: tables as any, stream: streams })
		}
	}

	// The declared search indexes exist on the shared run-wide search
	// server before any test runs, namespaced by the app prefix.
	if (manifest.servers?.search) {
		const domain = manifest.servers.search.domain

		for (const entry of manifest.searches ?? []) {
			const { name } = getSearchProps(entry.id, entry.stack)

			// The declared mappings let the search define verify the code
			// schema against the stack file.
			process.env[`SEARCH_MAPPINGS_${name}`] = JSON.stringify(entry.mappings)

			const result = await fetch(`http://${domain}/${name}`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ mappings: entry.mappings, settings: entry.settings }),
			})

			if (!result.ok) {
				throw new Error(`Failed to create the search index "${name}": ${await result.text()}`)
			}
		}
	}

	// Stores ride an in-memory s3.
	mockS3()

	// Cache clients redirect to a real local redis, exactly like the
	// local dev environment runs real redis.
	if ((manifest.caches ?? []).length > 0) {
		const shared = manifest.servers?.redis

		if (shared) {
			// One database per vitest worker on the run-wide server,
			// flushed per test file - files in a worker run one by one.
			const { createIoRedisClient, overrideOptions } = await import('@awsless/redis')
			const db = (parseInt(process.env.VITEST_POOL_ID ?? '1', 10) || 1) % 256

			overrideOptions({
				host: shared.host,
				port: shared.port,
				db,
				cluster: false,
				tls: undefined,
			})

			const client = createIoRedisClient({ host: shared.host, port: shared.port, db })

			await client.send('FLUSHDB', [])
			await client.destroy()
		} else {
			const { mockCache } = await import('../mock/cache.js')

			mockCache()
		}
	}

	// Functions, tasks & the pubsub publishers all ride the lambda
	// invoke mock. One merged call, since only the first registers the
	// clearing hook.
	const lambdas: Record<string, Mock> = {}
	const tasks: Record<string, Mock> = {}
	const queues: Record<string, Mock> = {}
	const topics: Record<string, Mock> = {}

	for (const entry of manifest.functions) {
		const spy = realHandler(options.importFile, entry.file)
		testRegistry.functions[getFunctionName(entry.id, entry.stack)] = spy
		lambdas[getFunctionName(entry.id, entry.stack)] = spy
	}

	for (const entry of manifest.tasks) {
		const spy = realHandler(options.importFile, entry.file)
		testRegistry.tasks[getTaskName(entry.id, entry.stack)] = spy
		lambdas[getTaskName(entry.id, entry.stack)] = spy
		tasks[getTaskName(entry.id, entry.stack)] = spy
	}

	for (const id of manifest.pubsub) {
		const spy = vi.fn(() => {})
		testRegistry.pubsub[getPubSubPublisherName(id)] = spy
		lambdas[getPubSubPublisherName(id)] = spy
	}

	for (const entry of manifest.queues) {
		const spy = realHandler(options.importFile, entry.file)
		testRegistry.queues[getQueueName(entry.id, entry.stack)] = spy
		queues[getQueueName(entry.id, entry.stack)] = spy
	}

	for (const id of manifest.topics) {
		const spy = vi.fn(() => {})
		testRegistry.topics[getTopicName(id)] = spy
		topics[getTopicName(id)] = spy
	}

	// Alerts ride the same sns mock as the topics.
	for (const id of manifest.alerts ?? []) {
		const spy = vi.fn(() => {})
		testRegistry.alerts[getAlertName(id)] = spy
		topics[getAlertName(id)] = spy
	}

	// Instances consume through the same sqs mock as the queues. Their
	// code is a long running poller, not a handler, so they default to
	// recorded no-ops like the topics.
	for (const entry of manifest.instances ?? []) {
		const spy = vi.fn(() => {})
		testRegistry.instances[getInstanceQueueName(entry.id, entry.stack)] = spy
		queues[getInstanceQueueName(entry.id, entry.stack)] = spy
	}

	const jobs: Record<string, Mock> = {}

	for (const entry of manifest.jobs ?? []) {
		const spy = vi.fn(() => {})
		testRegistry.jobs[getJobName(entry.id, entry.stack)] = spy
		jobs[getJobName(entry.id, entry.stack)] = spy
	}

	mockLambda(lambdas)
	mockScheduler(tasks)
	mockSQS(queues)
	mockSNS(topics)
	mockEcs(jobs)

	// Every Email.send records on the email spy instead of reaching
	// ses, with the payload flattened for readable assertions.
	testRegistry.emails.send = vi.fn(() => {})

	mockSES(input => {
		const email = input as {
			FromEmailAddress?: string
			Destination?: { ToAddresses?: string[] }
			Content?: { Simple?: { Subject?: { Data?: string }; Body?: { Html?: { Data?: string } } } }
		}

		testRegistry.emails.send!({
			from: email.FromEmailAddress,
			to: email.Destination?.ToAddresses,
			subject: email.Content?.Simple?.Subject?.Data,
			html: email.Content?.Simple?.Body?.Html?.Data,
		})
	})

	// The wrapped mocks clear themselves, but the registry spies used
	// for assertions need their own clearing between tests.
	beforeEach(() => {
		for (const registry of Object.values(testRegistry)) {
			for (const spy of Object.values(registry)) {
				spy.mockClear()
			}
		}
	})
}
