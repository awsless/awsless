import { constantCase } from 'change-case'
import { createRestServer, RestRoute } from '../../dev/servers/rest.js'
import { DevContext } from '../../feature.js'
import { shortId } from '../../util/id.js'
import { formatRouteKey } from '../bundle/util.js'

export const restOnDev = async (ctx: DevContext) => {
	const ids = Object.keys(ctx.appConfig.defaults.rest ?? {})

	if (ids.length === 0) {
		return
	}

	// Every rest api runs as its own local server, mirroring the one
	// api gateway per rest api in production.
	for (const id of ids) {
		const routes: RestRoute[] = []

		for (const stack of ctx.stackConfigs) {
			for (const routeKey of Object.keys(stack.rest?.[id] ?? {})) {
				routes.push({
					routeKey,
					bundleRoute: formatRouteKey(stack.name, 'rest', `${id}-${shortId(routeKey)}`),
				})
			}
		}

		const server = createRestServer({ id, routes })
		const port = await server.listen()

		ctx.addEnv(`REST_${constantCase(id)}_ENDPOINT`, `http://localhost:${port}`)

		ctx.registerServer({
			name: `rest ${id}`,
			start({ dispatch }) {
				server.connect(dispatch)
			},
			stop() {
				return server.stop()
			},
		})

		ctx.registerResource({
			kind: 'rest',
			id,
			detail: `http://localhost:${port}`,
		})
	}
}
