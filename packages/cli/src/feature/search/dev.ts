import { OpenSearchServer } from '@awsless/open-search-server'
import { Client } from '@opensearch-project/opensearch'
import { formatSearchIndexName } from 'awsless'
import { localEngine } from '../../dev/engine.js'
import { connectServerSink, createServerSink } from '../../dev/server-sink.js'
import { DevContext } from '../../feature.js'
import { applySearchIndex } from '../../formation/open-search.js'
import { resolveSearchMappings } from './util.js'

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
		const sink = createServerSink()

		const server = new OpenSearchServer({
			engine: localEngine() === 'real' ? 'opensearch' : 'memory',
			onExit: sink.onExit,
			onOutput: sink.onOutput,
		})

		await server.listen()

		return { value: { port: server.port, sink }, stop: () => server.close() }
	})

	connectServerSink(ctx, 'search', sink)

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
