import { download, downloadJdk, launch, VERSION_2_8_0 } from '@awsless/open-search'
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
		} catch (_) {}

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

	// The same real OpenSearch that the search tests run against. The
	// bundle only ships a linux or windows jdk, so on other platforms a
	// matching jdk is downloaded next to it & the jars run on that.
	const native = process.platform === 'linux' || process.platform === 'win32'
	const port = await findFreePort()
	const path = await download(VERSION_2_8_0.version)
	const javaHome = native ? undefined : await downloadJdk()

	const kill = await launch({
		path,
		port,
		host: 'localhost',
		version: VERSION_2_8_0,
		debug: false,
		javaHome,
	})

	await waitForSearch(port, 60_000)

	// One local domain backs every index, exactly like the one shared
	// domain in production.
	ctx.addEnv('SEARCH_DOMAIN', `localhost:${port}`)

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
		})
	}

	ctx.registerServer({
		name: 'opensearch',
		start() {},
		stop() {
			return kill()
		},
	})
}
