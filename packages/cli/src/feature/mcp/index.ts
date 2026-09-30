import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Group } from '@terraforge/core'
import { formatRouteEnvName } from 'awsless'
import { kebabCase } from 'change-case'
import { FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { shortId } from '../../util/id.js'
import { formatRouteKey, registerBundleFunction, ROUTE_HEADER } from '../bundle/util.js'
import { mcpOnDev } from './dev.js'

const handler = (name: string) => {
	return join(dirname(fileURLToPath(import.meta.url)), `/handlers/${name}`)
}

// Clients probe the path suffixed document first & fall back to the one
// at the root, so both have to resolve.
export const metadataRoutes = (path: string) => {
	return [`/.well-known/oauth-protected-resource${path}`, '/.well-known/oauth-protected-resource']
}

export const mcpFeature = defineFeature({
	name: 'mcp',
	onDev: mcpOnDev,
	onValidate(ctx) {
		const names: Record<string, Set<string>> = {}

		for (const [id, props] of Object.entries(ctx.appConfig.mcp ?? {})) {
			names[id] = new Set()

			// The audience on every token is the server's own url, so an
			// authenticated server needs an address that won't move.
			if (props.auth && !ctx.appConfig.router?.[props.router]?.domain) {
				throw new Error(
					`The MCP server "${id}" is authenticated, so its router "${props.router}" needs a domain.`
				)
			}
		}

		for (const stack of ctx.stackConfigs) {
			for (const [id, tools] of Object.entries(stack.mcp ?? {})) {
				const list = names[id]

				if (!list) {
					throw new FileError(stack.file, `The MCP server for "${id}" isn't defined on app level.`)
				}

				for (const name of Object.keys(tools ?? {})) {
					if (list.has(name)) {
						throw new FileError(stack.file, `Duplicate MCP tool "${id}.${name}"`)
					}

					list.add(name)
				}
			}
		}
	},
	onApp(ctx) {
		const bundle = ctx.shared.get('bundle', 'main')

		for (const [id, props] of Object.entries(ctx.appConfig.mcp ?? {})) {
			new Group(ctx.base, 'mcp', id)

			const serverRouteKey = formatRouteKey('base', 'mcp', id)
			const metadataRouteKey = formatRouteKey('base', 'mcp', `${id}-metadata`)

			bundle.addHandler({
				routeKey: serverRouteKey,
				file: handler('mcp.js'),
				exportName: 'default',
			})

			bundle.addEnv(formatRouteEnvName(serverRouteKey, 'NAME'), id)
			bundle.addEnv(formatRouteEnvName(serverRouteKey, 'VERSION'), ctx.appConfig.name)

			if (props.title) {
				bundle.addEnv(formatRouteEnvName(serverRouteKey, 'TITLE'), props.title)
			}

			if (props.instructions) {
				bundle.addEnv(formatRouteEnvName(serverRouteKey, 'INSTRUCTIONS'), props.instructions)
			}

			const routes: Record<string, { type: 'lambda'; requestHeaders: Record<string, string> }> = {
				[props.path]: {
					type: 'lambda',
					requestHeaders: { [ROUTE_HEADER]: serverRouteKey },
				},
			}

			// ------------------------------------------------------
			// Publish the protected resource metadata

			if (props.auth) {
				const domain = ctx.appConfig.router![props.router]!.domain!
				const resource = `https://${domain}${props.path}`

				bundle.addHandler({
					routeKey: metadataRouteKey,
					file: handler('mcp-metadata.js'),
					exportName: 'default',
				})

				for (const routeKey of [serverRouteKey, metadataRouteKey]) {
					bundle.addEnv(formatRouteEnvName(routeKey, 'RESOURCE'), resource)
					bundle.addEnv(formatRouteEnvName(routeKey, 'ISSUER'), props.auth.issuer)
					bundle.addEnv(formatRouteEnvName(routeKey, 'AUDIENCE'), props.auth.audience ?? resource)
					bundle.addEnv(formatRouteEnvName(routeKey, 'SCOPES'), JSON.stringify(props.auth.scopes))
				}

				for (const path of metadataRoutes(props.path)) {
					routes[path] = {
						type: 'lambda',
						requestHeaders: { [ROUTE_HEADER]: metadataRouteKey },
					}
				}
			}

			const addRoutes = ctx.shared.entry('router', 'addRoutes', props.router)

			addRoutes(routes)
		}
	},
	onStack(ctx) {
		const bundle = ctx.shared.get('bundle', 'main')

		for (const [id, tools] of Object.entries(ctx.stackConfig.mcp ?? {})) {
			if (!ctx.appConfig.mcp?.[id]) {
				throw new FileError(ctx.stackConfig.file, `MCP definition is not defined on app level for "${id}"`)
			}

			const serverRouteKey = formatRouteKey('base', 'mcp', id)

			for (const [name, props] of Object.entries(tools ?? {})) {
				const entryId = kebabCase(`${id}-${shortId(name)}`)
				const routeKey = formatRouteKey(ctx.stack.name, 'mcp', entryId)

				registerBundleFunction(ctx, routeKey, props.function)

				// The description & input schema aren't baked in here - the
				// tool module reports them at runtime, so they can't drift
				// from the validator the handler enforces.
				bundle.addEnv(
					formatRouteEnvName(serverRouteKey, `TOOL:${name}`),
					JSON.stringify({
						function: routeKey,
						description: props.description,
						title: props.title,
						omit: props.omit,
						permissions: props.permissions,
						annotations: props.annotations,
					})
				)
			}
		}
	},
})
