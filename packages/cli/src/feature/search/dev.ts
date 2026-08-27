import { download, launch, VERSION_3_5_0_MIN } from '@awsless/open-search'
import { Client } from '@opensearch-project/opensearch'
import { findFreePort } from '../../dev/util.js'
import { DevContext } from '../../feature.js'
import { applySearchIndex } from '../../formation/open-search.js'
import { formatSearchIndexName, resolveSearchMappings } from './util.js'

const waitForSearch = async (port: number, timeoutMs: number) => {
	const deadline = Date.now() + timeoutMs

	while (Date.now() < deadline) {
		try {
			const res = await fetch(`http://localhost:${port}`)

			if (res.ok) {
				return
			}
		} catch {}

		await new Promise(resolve => setTimeout(resolve, 500))
	}

	throw new Error('The local OpenSearch server never became ready.')
}

export const searchOnDev = async (ctx: DevContext) => {
	const indexes = ctx.stackConfigs.flatMap(stack => {
		return Object.entries(stack.searchs ?? {}).map(([id, props]) => ({ stackName: stack.name, id, props }))
	})

	if (indexes.length === 0) {
		return
	}

	// The same real OpenSearch min distribution that the search tests
	// run against - it needs a local JDK 21+, which launch resolves.
	// The server is slow to boot, so it survives dev restarts & the
	// declared indexes reapply on every run.
	const { port, sink } = await ctx.keep('opensearch', null, async () => {
		const port = await findFreePort()
		const path = await download(VERSION_3_5_0_MIN)

		const sink: {
			health?: (status: 'up' | 'down', detail?: string) => void
			log?: (line: string) => void
			tail: string[]
			crashed?: string
		} = { tail: [] }

		const kill = await launch({
			path,
			port,
			host: 'localhost',
			version: VERSION_3_5_0_MIN,
			debug: false,
			onExit(code, signal) {
				sink.crashed = code !== null ? `exited with code ${code}` : `killed by ${signal}`
				sink.health?.('down', sink.crashed)
			},
			// The output streams to the dashboard's search panels, with a
			// short tail replayed into every fresh run's event bus.
			onOutput(line) {
				sink.tail.push(line)

				while (sink.tail.length > 20) {
					sink.tail.shift()
				}

				sink.log?.(line)
			},
		})

		await waitForSearch(port, 60_000)

		return { value: { port, sink }, stop: kill }
	})

	// The health & log sinks swap every run - a crash while no run
	// listened still reports through the crashed marker.
	sink.health = (status, detail) => ctx.reportHealth('search', status, detail)
	sink.health(sink.crashed ? 'down' : 'up', sink.crashed)
	sink.log = line => ctx.emitEvent('search', { date: Date.now(), line })

	for (const line of sink.tail) {
		ctx.emitEvent('search', { date: Date.now(), line })
	}

	// One local domain backs every index, exactly like the one shared
	// domain in production.
	ctx.addEnv('SEARCH_ENDPOINT', `http://localhost:${port}`)

	const client = new Client({ node: `http://localhost:${port}` })

	for (const { stackName, id, props } of indexes) {
		// The declared indexes exist on boot, exactly like a deploy
		// creates them on the real domain.
		await applySearchIndex(client, {
			index: formatSearchIndexName(stackName, id),
			mappings: resolveSearchMappings(props),
			settings: props.settings,
		})

		ctx.registerResource({
			kind: 'search',
			stack: stackName,
			id,
			detail: `localhost:${port}`,
			channel: 'search',
		})
	}
}
