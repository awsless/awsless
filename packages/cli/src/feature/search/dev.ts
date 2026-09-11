import { OpenSearchServer } from '@awsless/open-search-server'
import { Client } from '@opensearch-project/opensearch'
import { localEngine } from '../../dev/engine.js'
import { DevContext } from '../../feature.js'
import { applySearchIndex } from '../../formation/open-search.js'
import { formatSearchIndexName, resolveSearchMappings } from './util.js'

export const searchOnDev = async (ctx: DevContext) => {
	const indexes = ctx.stackConfigs.flatMap(stack => {
		return Object.entries(stack.searchs ?? {}).map(([id, props]) => ({ stackName: stack.name, id, props }))
	})

	if (indexes.length === 0) {
		return
	}

	// The same server the search tests run against: in-memory by
	// default, the real distribution with AWSLESS_LOCAL_ENGINE=real. It
	// survives dev restarts so indexed data stays put, and the declared
	// indexes reapply on every run.
	const { port, sink } = await ctx.keep('opensearch', null, async () => {
		const sink: {
			health?: (status: 'up' | 'down', detail?: string) => void
			log?: (line: string) => void
			tail: string[]
			crashed?: string
		} = { tail: [] }

		const server = new OpenSearchServer({
			engine: localEngine() === 'real' ? 'opensearch' : 'memory',
			onExit(code, signal) {
				sink.crashed = code !== null ? `exited with code ${code}` : `killed by ${signal}`
				sink.health?.('down', sink.crashed)
			},
			// The real server's output streams to the dashboard's search
			// panel, with a short tail replayed into every fresh run's
			// event bus.
			onOutput(line) {
				sink.tail.push(line)

				while (sink.tail.length > 20) {
					sink.tail.shift()
				}

				sink.log?.(line)
			},
		})

		await server.listen()

		return { value: { port: server.port, sink }, stop: () => server.close() }
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
