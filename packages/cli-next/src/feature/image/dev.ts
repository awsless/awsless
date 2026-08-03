import { cp } from 'fs/promises'
import { isAbsolute, join } from 'path'
import { DevContext } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { getFeatureFolder } from '../asset/index.js'
import { formatRouteKey } from '../bundle/util.js'

export const imageOnDev = async (ctx: DevContext) => {
	const images = ctx.stackConfigs.flatMap(stack => Object.keys(stack.images ?? {}))

	if (images.length === 0) {
		return
	}

	// The image handler reads its origin & writes its cache through the
	// shared s3 store, even when the app declares no stores itself.
	await ctx.useStore()

	const bucket = formatGlobalResourceName({
		appName: ctx.appConfig.name,
		resourceType: 'store',
		resourceName: 'assets',
		postfix: ctx.appId,
	})

	for (const stack of ctx.stackConfigs) {
		for (const [id, props] of Object.entries(stack.images ?? {})) {
			const folder = getFeatureFolder('image', stack.name, id)
			const routeKey = formatRouteKey(stack.name, 'image', id)
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
				`${routeKey}:IMAGE_CONFIG`,
				JSON.stringify({
					presets: props.presets,
					extensions: props.extensions,
				})
			)

			ctx.addEnv(`${routeKey}:IMAGE_BUCKET`, bucket)
			ctx.addEnv(`${routeKey}:IMAGE_FOLDER`, folder)

			if (props.origin.function) {
				ctx.addEnv(`${routeKey}:IMAGE_ORIGIN`, formatRouteKey(stack.name, 'image', `${id}-origin`))
			}

			if (props.origin.static) {
				ctx.addEnv(`${routeKey}:IMAGE_ORIGIN_S3`, 'true')

				// The deploy uploads the static origin images to s3, so
				// locally they seed the filesystem store.
				const source = isAbsolute(props.origin.static)
					? props.origin.static
					: join(directories.root, props.origin.static)

				await cp(source, join(directories.output, 'local', 'store', bucket, folder, 'origin'), {
					recursive: true,
				})
			}

			ctx.registerResource({
				kind: 'image',
				stack: stack.name,
				id,
				routeKey,
				detail: pattern,
			})
		}
	}
}
