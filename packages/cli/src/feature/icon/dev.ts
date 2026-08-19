import { cp } from 'fs/promises'
import { isAbsolute, join } from 'path'
import { formatRouteEnvName } from 'awsless'
import { DevContext } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { getFeatureFolder } from '../asset/index.js'
import { formatRouteKey } from '../bundle/util.js'

export const iconOnDev = async (ctx: DevContext) => {
	const icons = ctx.stackConfigs.flatMap(stack => Object.keys(stack.icons ?? {}))

	if (icons.length === 0) {
		return
	}

	// The icon handler reads its origin & writes its cache through the
	// shared s3 store, even when the app declares no stores itself.
	await ctx.useStore()

	const bucket = formatGlobalResourceName({
		appName: ctx.appConfig.name,
		resourceType: 'store',
		resourceName: 'assets',
		postfix: ctx.appId,
	})

	for (const stack of ctx.stackConfigs) {
		for (const [id, props] of Object.entries(stack.icons ?? {})) {
			const folder = getFeatureFolder('icon', stack.name, id)
			const routeKey = formatRouteKey(stack.name, 'icon', id)
			const pattern = props.path.endsWith('/') ? `${props.path}*` : `${props.path}/*`

			ctx.addRoute({
				routerId: props.router,
				pattern,
				routeKey,
				rewrite: {
					regex: `^${props.path}/(.*)$`,
					to: '/$1',
				},
			})

			ctx.addEnv(
				formatRouteEnvName(routeKey, 'ICON_CONFIG'),
				JSON.stringify({
					preserveIds: props.preserveIds,
					symbols: props.symbols,
				})
			)

			ctx.addEnv(formatRouteEnvName(routeKey, 'ICON_BUCKET'), bucket)
			ctx.addEnv(formatRouteEnvName(routeKey, 'ICON_FOLDER'), folder)

			if (props.origin.function) {
				ctx.addEnv(
					formatRouteEnvName(routeKey, 'ICON_ORIGIN'),
					formatRouteKey(stack.name, 'icon', `${id}-origin`)
				)
			}

			if (props.origin.static) {
				ctx.addEnv(formatRouteEnvName(routeKey, 'ICON_ORIGIN_S3'), 'true')

				// The deploy uploads the static origin icons to s3, so
				// locally they seed the filesystem store.
				const source = isAbsolute(props.origin.static)
					? props.origin.static
					: join(directories.root, props.origin.static)

				await cp(source, join(directories.output, 'local', 'store', bucket, folder, 'origin'), {
					recursive: true,
				})
			}

			ctx.registerResource({
				kind: 'icon',
				stack: stack.name,
				id,
				routeKey,
				detail: pattern,
			})
		}
	}
}
