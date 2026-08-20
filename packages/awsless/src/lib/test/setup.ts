import type { Mock } from 'vitest'

// The vitest globals, declared instead of imported so importing this
// module never adds a runtime vitest dependency.
declare const vi: (typeof import('vitest'))['vi']
declare const beforeEach: (typeof import('vitest'))['beforeEach']
declare const afterEach: (typeof import('vitest'))['afterEach']
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
// environment everything it needs to materialize the whole app. This
// is the single declaration - the cli imports it, so the producer &
// consumer can never drift.
export type TestManifest = {
	app: string
	region: string
	configs: Record<string, string>
	tables: unknown[]
	tableKeys: { stack: string; id: string; keys: unknown }[]
	// Tables with a stream consumer: the real handler runs on every
	// write, settled before the write resolves.
	streams: { stack: string; id: string; file: string; hash: string; sort?: string }[]
	// The declared search indexes, created per test file on the shared
	// run-wide opensearch server.
	searches: { stack: string; id: string; mappings: unknown; settings?: unknown }[]
	functions: { stack: string; id: string; file: string }[]
	tasks: { stack: string; id: string; file: string }[]
	// A queue without a consumer still mocks its send.
	queues: { stack: string; id: string; file?: string }[]
	topics: string[]
	pubsub: string[]
	caches: { stack: string; id: string }[]
	alerts: string[]
	jobs: { stack: string; id: string }[]
	instances: { stack: string; id: string }[]

	// The shared resource servers the cli boots once for the whole test
	// run - test files namespace into them instead of booting their own.
	servers?: {
		redis?: { host: string; port: number }
		search?: { domain: string }
	}
}

type ImportFile = (file: string) => Promise<any>

// Overrides registered OUTSIDE a running test (module or describe
// scope, like `mock.alert.debug()` at the top of a test file) form the
// baseline every test starts from. Overrides made INSIDE a test are
// temporary & reset when the test ends.
export const mockBaselines = new Map<Mock, (...args: unknown[]) => unknown>()
export const mockState = { inTest: false }

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

// Materialize the whole app for a test file: every table exists, every
// function, task & queue consumer runs its real handler, and topic &
// pubsub publishes are recorded no-op spies. The `mock` api overrides
// any of them.
export const setupTestEnv = async (manifest: TestManifest, options: { importFile: ImportFile }) => {
	// The mock packages load lazily & in parallel: importing awsless
	// stays free of test machinery outside of test runs, and every
	// isolated test file pays this load again.
	const [dynamodb, lambda, s3, scheduler, sns, sqs, cloudwatch, ecs, ses] = await Promise.all([
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
	cloudwatch.mockCloudWatch()

	// Registered during collection, since hooks can't register inside a
	// running test - resources like cache clients clean up through it.
	hookTestCleanup()

	compareBigFloatsByValue()
	applyTestConfigValues(manifest)
	materializeTables(manifest, options.importFile, dynamodb)
	await createSearchIndexes(manifest)

	// Stores ride an in-memory s3.
	s3.mockS3()

	await redirectCacheClients(manifest)

	const spies = registerResourceSpies(manifest, options.importFile)

	lambda.mockLambda(spies.lambdas)
	scheduler.mockScheduler(spies.tasks)
	sqs.mockSQS(spies.queues)
	sns.mockSNS(spies.topics)
	ecs.mockEcs(spies.jobs)

	recordEmails(ses.mockSES)
	resetSpiesBetweenTests()
}

// A spy that lazily imports the real handler file on first call, so
// cross stack calls run the actual code of the other stack & the
// contract between stacks is really tested.
const realHandler = (importFile: ImportFile, file: string) => {
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

// Big floats compare by numeric value: arithmetic results keep a
// denormalized internal representation (150 as 150e14 x 10^-12) while
// transport round trips normalize - both are the same number.
const compareBigFloatsByValue = () => {
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
}

// The test config values are set before any test file import resolves,
// so import time Config reads just work.
const applyTestConfigValues = (manifest: TestManifest) => {
	for (const [name, value] of Object.entries(manifest.configs)) {
		setConfigValue(name, value)
	}
}

const materializeTables = (
	manifest: TestManifest,
	importFile: ImportFile,
	dynamodb: Awaited<typeof import('@awsless/dynamodb')>
) => {
	if (manifest.tables.length === 0) {
		return
	}

	// The app prefix may be unique per test file, so the physical
	// table names follow it.
	const app = process.env.APP!
	const tables = (manifest.tables as { TableName: string }[]).map(table => ({
		...table,
		TableName: table.TableName.replace(`${manifest.app}--`, `${app}--`),
	}))

	// Every table stream runs its real consumer, settled before the
	// write call resolves - so a test can write & directly observe the
	// consumer's effects.
	const streams = (manifest.streams ?? []).map(entry => {
		return dynamodb.streamTable(
			dynamodb.define(getTableName(entry.id, entry.stack), {
				hash: entry.hash,
				sort: entry.sort,
				schema: dynamodb.object({}, dynamodb.any()),
			}),
			async payload => {
				const consumer = await importFile(entry.file)
				await consumer.default(payload)
			}
		)
	})

	dynamodb.mockDynamoDB({ tables: tables as any, stream: streams })
}

// The declared search indexes exist on the shared run-wide search
// server before any test runs, namespaced by the app prefix.
const createSearchIndexes = async (manifest: TestManifest) => {
	const domain = manifest.servers?.search?.domain

	if (!domain) {
		return
	}

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

// Cache clients redirect to a real local redis, exactly like the local
// dev environment runs real redis.
const redirectCacheClients = async (manifest: TestManifest) => {
	if ((manifest.caches ?? []).length === 0) {
		return
	}

	const shared = manifest.servers?.redis

	if (!shared) {
		const { mockRedis } = await import('@awsless/redis')

		mockRedis()

		return
	}

	// One database per vitest worker on the run-wide server, flushed
	// per test file - files in a worker run one by one. Concurrent
	// vitest instances number their workers from 1, so the runner hands
	// each instance an offset that keeps their databases disjoint.
	const { createIoRedisClient, overrideOptions } = await import('@awsless/redis')
	const offset = parseInt(process.env.AWSLESS_TEST_REDIS_DB_OFFSET ?? '0', 10) || 0
	const db = (offset + (parseInt(process.env.VITEST_POOL_ID ?? '1', 10) || 1)) % 256

	overrideOptions({
		host: shared.host,
		port: shared.port,
		db,
		cluster: false,
		tls: undefined,
		// A full-suite run can transiently overload the local server's
		// accept queue, and the client default gives up after ~300ms of
		// refused connects. Local refusals clear within a scheduler
		// tick, so ride them out instead of failing the run.
		maxRetriesPerRequest: 20,
		connectTimeout: 10_000,
		retryStrategy: times => (times > 20 ? null : Math.min(times * 250, 2000)),
	})

	const flush = async () => {
		const client = createIoRedisClient({ host: shared.host, port: shared.port, db })

		try {
			await client.send('FLUSHDB', [])
		} finally {
			await client.destroy()
		}
	}

	// Every test file handshakes the run-wide server, even for stacks
	// without caches - so a hiccup here fails a completely unrelated
	// stack. One short retry rides it out & the thrown error keeps the
	// address, since the raw system error only says "ECONNREFUSED"
	// without saying what refused.
	try {
		await flush()
	} catch (error) {
		await new Promise(resolve => setTimeout(resolve, 1000))

		try {
			await flush()
		} catch (retryError) {
			throw new Error(
				`The shared test redis server at ${shared.host}:${shared.port} is unreachable: ${String(error)}`,
				{ cause: retryError }
			)
		}
	}
}

// One spy per declared resource, registered under its physical name.
// Consumers run their real handler, publish-only resources record as
// no-ops. Everything lands in the testRegistry for the `mock` api, and
// grouped per transport for the client mocks.
const registerResourceSpies = (manifest: TestManifest, importFile: ImportFile) => {
	const spies = {
		lambdas: {} as Record<string, Mock>,
		tasks: {} as Record<string, Mock>,
		queues: {} as Record<string, Mock>,
		topics: {} as Record<string, Mock>,
		jobs: {} as Record<string, Mock>,
	}

	for (const entry of manifest.functions) {
		const name = getFunctionName(entry.id, entry.stack)
		const spy = realHandler(importFile, entry.file)

		testRegistry.functions[name] = spy
		spies.lambdas[name] = spy
	}

	// Tasks invoke like a lambda & schedule like a task, so their spy
	// registers on both transports.
	for (const entry of manifest.tasks) {
		const name = getTaskName(entry.id, entry.stack)
		const spy = realHandler(importFile, entry.file)

		testRegistry.tasks[name] = spy
		spies.lambdas[name] = spy
		spies.tasks[name] = spy
	}

	for (const id of manifest.pubsub) {
		const name = getPubSubPublisherName(id)
		const spy = vi.fn(() => {})

		testRegistry.pubsub[name] = spy
		spies.lambdas[name] = spy
	}

	// A producer-only queue (no consumer) records the sends as a no-op
	// spy, so a valid send never throws.
	for (const entry of manifest.queues) {
		const name = getQueueName(entry.id, entry.stack)
		const spy = entry.file ? realHandler(importFile, entry.file) : vi.fn(() => {})

		testRegistry.queues[name] = spy
		spies.queues[name] = spy
	}

	for (const id of manifest.topics) {
		const name = getTopicName(id)
		const spy = vi.fn(() => {})

		testRegistry.topics[name] = spy
		spies.topics[name] = spy
	}

	// Alerts ride the same sns mock as the topics.
	for (const id of manifest.alerts ?? []) {
		const name = getAlertName(id)
		const spy = vi.fn(() => {})

		testRegistry.alerts[name] = spy
		spies.topics[name] = spy
	}

	// Instances consume through the same sqs mock as the queues. Their
	// code is a long running poller, not a handler, so they default to
	// recorded no-ops like the topics.
	for (const entry of manifest.instances ?? []) {
		const name = getInstanceQueueName(entry.id, entry.stack)
		const spy = vi.fn(() => {})

		testRegistry.instances[name] = spy
		spies.queues[name] = spy
	}

	if ((manifest.jobs ?? []).length > 0) {
		// Job.x() reads the network env vars before it ever reaches the
		// mocked ecs client - fabricate them like the deployed job
		// feature would.
		process.env.JOB_SUBNETS ??= JSON.stringify(['subnet-local'])
		process.env.JOB_SECURITY_GROUP ??= 'sg-local'
	}

	for (const entry of manifest.jobs ?? []) {
		const name = getJobName(entry.id, entry.stack)
		const spy = vi.fn(() => {})

		testRegistry.jobs[name] = spy
		spies.jobs[name] = spy
	}

	return spies
}

// Every Email.send records on the email spy instead of reaching ses,
// with the payload flattened for readable assertions.
const recordEmails = (mockSES: Awaited<typeof import('@awsless/ses')>['mockSES']) => {
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
}

// The wrapped mocks clear themselves, but the registry spies need
// their own reset between tests: mockReset restores the original
// implementation, then any baseline override (registered outside a
// test) re-applies - so a fake set up inside one test never leaks into
// the next, while module scope overrides persist.
const resetSpiesBetweenTests = () => {
	beforeEach(() => {
		mockState.inTest = true

		for (const registry of Object.values(testRegistry)) {
			for (const spy of Object.values(registry)) {
				spy.mockReset()

				const baseline = mockBaselines.get(spy)

				if (baseline) {
					spy.mockImplementation(baseline)
				}
			}
		}
	})

	afterEach(() => {
		mockState.inTest = false
	})
}
