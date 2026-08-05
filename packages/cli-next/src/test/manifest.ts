import { isAbsolute, join } from 'path'
import { AppConfig } from '../config/app.js'
import { StackConfig } from '../config/stack.js'
import { resolveSearchMappings } from '../feature/search/util.js'
import { createTableInput } from '../feature/table/dev.js'
import { formatTableKeys } from '../feature/table/util.js'
import { formatLocalResourceName } from '../util/name.js'
import { directories } from '../util/path.js'

// The manifest hands the vitest setup everything it needs to
// materialize the whole app: every table, the real handler file of
// every function, task & queue consumer, and the test config values.
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
	queues: { stack: string; id: string; file: string }[]
	topics: string[]
	pubsub: string[]
	caches: { stack: string; id: string }[]
	alerts: string[]
	jobs: { stack: string; id: string }[]
	instances: { stack: string; id: string }[]

	// The shared resource servers the cli boots once for the whole test
	// run - test files namespace into them instead of booting their own.
	servers?: {
		dynamo?: { endpoint: string }
		redis?: { host: string; port: number }
		search?: { domain: string }
	}
}

const absolute = (file: string) => {
	return isAbsolute(file) ? file : join(directories.root, file)
}

export const createTestManifest = (appConfig: AppConfig, stackConfigs: StackConfig[]): TestManifest => {
	const manifest: TestManifest = {
		app: appConfig.name,
		region: appConfig.region,
		configs: appConfig.test.configs,
		tables: [],
		tableKeys: [],
		streams: [],
		searches: [],
		functions: [],
		tasks: [],
		queues: [],
		topics: appConfig.topics ?? [],
		pubsub: Object.keys(appConfig.pubsub ?? {}),
		caches: [],
		alerts: Object.keys(appConfig.alerts ?? {}),
		jobs: [],
		instances: [],
	}

	for (const stack of stackConfigs) {
		for (const [id, props] of Object.entries(stack.tables ?? {})) {
			const name = formatLocalResourceName({
				appName: appConfig.name,
				stackName: stack.name,
				resourceType: 'table',
				resourceName: id,
			})

			manifest.tables.push(createTableInput(name, props))
			manifest.tableKeys.push({ stack: stack.name, id, keys: formatTableKeys(props) })

			if (props.stream) {
				manifest.streams.push({
					stack: stack.name,
					id,
					file: absolute(props.stream.consumer.code.file),
					hash: props.hash,
					sort: props.sort,
				})
			}
		}

		for (const [id, props] of Object.entries(stack.searchs ?? {})) {
			manifest.searches.push({
				stack: stack.name,
				id,
				mappings: resolveSearchMappings(props),
				settings: props.settings,
			})
		}

		for (const [id, props] of Object.entries(stack.functions ?? {})) {
			manifest.functions.push({ stack: stack.name, id, file: absolute(props.code.file) })
		}

		for (const [id, props] of Object.entries(stack.tasks ?? {})) {
			manifest.tasks.push({ stack: stack.name, id, file: absolute(props.consumer.code.file) })
		}

		for (const [id, props] of Object.entries(stack.queues ?? {})) {
			if (props.consumer) {
				manifest.queues.push({ stack: stack.name, id, file: absolute(props.consumer.code.file) })
			}
		}

		for (const id of Object.keys(stack.caches ?? {})) {
			manifest.caches.push({ stack: stack.name, id })
		}

		for (const id of Object.keys(stack.jobs ?? {})) {
			manifest.jobs.push({ stack: stack.name, id })
		}

		for (const id of Object.keys(stack.instances ?? {})) {
			manifest.instances.push({ stack: stack.name, id })
		}
	}

	return manifest
}
