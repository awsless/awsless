import { kebabCase } from 'change-case'
import { DevContext } from '../../feature.js'
import { shortId } from '../../util/id.js'
import { formatRouteKey } from '../bundle/util.js'
import { metadataRoutes } from './index.js'

export const mcpOnDev = async (ctx: DevContext) => {
	for (const [id, props] of Object.entries(ctx.appConfig.mcp ?? {})) {
		const serverRouteKey = formatRouteKey('base', 'mcp', id)
		const metadataRouteKey = formatRouteKey('base', 'mcp', `${id}-metadata`)
		const endpoint = `http://localhost:${ctx.routerPort(props.router)}${props.path}`

		// The same route the deployed router links to the mcp server.
		ctx.addRoute({
			routerId: props.router,
			pattern: props.path,
			routeKey: serverRouteKey,
		})

		ctx.addEnv(`${serverRouteKey}:NAME`, id)
		ctx.addEnv(`${serverRouteKey}:VERSION`, ctx.appConfig.name)

		if (props.title) {
			ctx.addEnv(`${serverRouteKey}:TITLE`, props.title)
		}

		if (props.instructions) {
			ctx.addEnv(`${serverRouteKey}:INSTRUCTIONS`, props.instructions)
		}

		if (props.auth) {
			for (const path of metadataRoutes(props.path)) {
				ctx.addRoute({
					routerId: props.router,
					pattern: path,
					routeKey: metadataRouteKey,
				})
			}

			for (const routeKey of [serverRouteKey, metadataRouteKey]) {
				ctx.addEnv(`${routeKey}:RESOURCE`, endpoint)
				ctx.addEnv(`${routeKey}:ISSUER`, props.auth.issuer)
				ctx.addEnv(`${routeKey}:SCOPES`, JSON.stringify(props.auth.scopes))

				// Local dev verifies against the real issuer, but it can't ask
				// for tokens bound to a localhost audience, so the check only
				// runs when an explicit audience is configured.
				if (props.auth.audience) {
					ctx.addEnv(`${routeKey}:AUDIENCE`, props.auth.audience)
				}
			}
		}

		const tools: string[] = []

		for (const stack of ctx.stackConfigs) {
			for (const [name, tool] of Object.entries(stack.mcp?.[id] ?? {})) {
				const entryId = kebabCase(`${id}-${shortId(name)}`)

				tools.push(name)

				ctx.addEnv(
					`${serverRouteKey}:TOOL:${name}`,
					JSON.stringify({
						function: formatRouteKey(stack.name, 'mcp', entryId),
						description: tool.description,
						title: tool.title,
						omit: tool.omit,
						permissions: tool.permissions,
						annotations: tool.annotations,
					})
				)
			}
		}

		ctx.registerResource({
			kind: 'mcp',
			id,
			routeKey: serverRouteKey,
			detail: endpoint,
			queries: tools.toSorted(),
		})
	}
}
