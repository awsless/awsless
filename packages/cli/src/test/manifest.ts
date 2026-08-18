import type { TestManifest } from 'awsless'
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
// The shape is declared once in awsless (lib/test/setup.ts), so the
// producer & consumer can never drift.
export type { TestManifest }

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
			// A producer-only queue registers without a handler file, so
			// its sends still resolve against the sqs mock.
			manifest.queues.push({
				stack: stack.name,
				id,
				file: props.consumer ? absolute(props.consumer.code.file) : undefined,
			})
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

	// zod 4 assembles async-parsed records in completion order instead of
	// key order, so the resource order shuffles between runs. The test
	// cache fingerprint hashes the manifest, so a stable order is what
	// keeps an unchanged app hitting the cache.
	const byStackAndId = (left: { stack: string; id: string }, right: { stack: string; id: string }) => {
		return left.stack.localeCompare(right.stack) || left.id.localeCompare(right.id)
	}

	manifest.tables.sort((left, right) => {
		return String((left as { TableName: string }).TableName).localeCompare(
			String((right as { TableName: string }).TableName)
		)
	})

	manifest.tableKeys.sort(byStackAndId)
	manifest.streams.sort(byStackAndId)
	manifest.searches.sort(byStackAndId)
	manifest.functions.sort(byStackAndId)
	manifest.tasks.sort(byStackAndId)
	manifest.queues.sort(byStackAndId)
	manifest.caches.sort(byStackAndId)
	manifest.jobs.sort(byStackAndId)
	manifest.instances.sort(byStackAndId)

	manifest.topics.sort()
	manifest.pubsub.sort()
	manifest.alerts.sort()

	return manifest
}
