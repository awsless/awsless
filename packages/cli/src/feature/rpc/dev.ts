import { CreateTableCommand } from '@aws-sdk/client-dynamodb'
import { toSeconds } from '@awsless/duration'
import { formatRouteEnvName } from 'awsless'
import { kebabCase } from 'change-case'
import { DevContext } from '../../feature.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatRouteKey } from '../bundle/util.js'

export const rpcOnDev = async (ctx: DevContext) => {
	const ids = Object.keys(ctx.appConfig.rpc ?? {})

	if (ids.length === 0) {
		return
	}

	for (const [id, props] of Object.entries(ctx.appConfig.rpc ?? {})) {
		const serverRouteKey = formatRouteKey('base', 'rpc', id)

		// The same route the deployed router links to the rpc server.
		ctx.addRoute({
			routerId: props.router,
			pattern: props.path,
			routeKey: serverRouteKey,
		})

		ctx.addEnv(`${serverRouteKey}:TIMEOUT`, toSeconds(ctx.appConfig.function.timeout).toString())

		if (props.auth) {
			ctx.addEnv(formatRouteEnvName(serverRouteKey, 'AUTH'), formatRouteKey('base', 'rpc', `${id}-auth`))
		}

		// The lock table lives in the shared local dynamodb.
		const lockTable = formatGlobalResourceName({
			appName: ctx.appConfig.name,
			resourceType: 'rpc-lock',
			resourceName: id,
		})

		const { server } = await ctx.useDynamo()

		// The pooled server keeps the lock table across restarts.
		try {
			await server.getClient().send(
				new CreateTableCommand({
					TableName: lockTable,
					BillingMode: 'PAY_PER_REQUEST',
					KeySchema: [{ AttributeName: 'key', KeyType: 'HASH' }],
					AttributeDefinitions: [{ AttributeName: 'key', AttributeType: 'S' }],
				})
			)
		} catch (error) {
			if (!(error instanceof Error) || error.name !== 'ResourceInUseException') {
				throw error
			}
		}

		ctx.addEnv(`${serverRouteKey}:LOCK_TABLE`, lockTable)

		// Whitelist every declared query, like the deployed bundle env.
		const queries: string[] = []

		for (const stack of ctx.stackConfigs) {
			for (const [name, query] of Object.entries(stack.rpc?.[id] ?? {})) {
				const entryId = kebabCase(`${id}-${shortId(name)}`)

				queries.push(name)

				ctx.addEnv(
					`${serverRouteKey}:QUERY:${name}`,
					JSON.stringify({
						function: formatRouteKey(stack.name, 'rpc', entryId),
						lock: query.lock,
					})
				)
			}
		}

		ctx.registerResource({
			kind: 'rpc',
			id,
			routeKey: serverRouteKey,
			detail: `http://localhost:${ctx.routerPort(props.router)}${props.path}`,
			queries: queries.sort(),
		})
	}
}
