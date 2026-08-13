import { toDays } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { formatRouteEnvName } from 'awsless'
import { kebabCase } from 'change-case'
import { glob } from 'glob'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { defineFeature } from '../../feature'
import { formatRouteKey, registerBundleFunction, ROUTE_HEADER } from '../bundle/util.js'
import { getFeatureFolder } from '../asset/index.js'
import { iconOnDev } from './dev.js'

export const iconFeature = defineFeature({
	name: 'icon',
	onDev: iconOnDev,
	onStack(ctx) {
		const bundle = ctx.shared.get('bundle', 'main')
		const bucket = ctx.shared.get('asset', 'bucket')

		for (const [id, props] of Object.entries(ctx.stackConfig.icons ?? {})) {
			const group = new Group(ctx.stack, 'icon', id)
			const folder = getFeatureFolder('icon', ctx.stack.name, id)

			const routerId = ctx.shared.entry('router', 'id', props.router)
			const addRoutes = ctx.shared.entry('router', 'addRoutes', props.router)
			const routeKey = props.path.endsWith('/') ? `${props.path}*` : `${props.path}/*`

			// ------------------------------------------------------------
			// Create the icon origins

			let originRouteKey: string | undefined

			if (props.origin.function) {
				const origin = props.origin.function
				originRouteKey = formatRouteKey(ctx.stack.name, 'icon', `${id}-origin`)

				registerBundleFunction(ctx, originRouteKey, origin)
			}

			// ------------------------------------------------------------
			// The icon cache lives in the shared bucket

			if (props.cacheDuration) {
				bucket.addLifecycleRule({
					id: kebabCase(`${folder}cache-duration`),
					enabled: true,
					prefix: `${folder}cache/`,
					expiration: {
						days: toDays(props.cacheDuration),
					},
				})
			}

			// ------------------------------------------------------------
			// Add the icon server to the bundle

			const serverRouteKey = formatRouteKey(ctx.stack.name, 'icon', id)

			bundle.addHandler({
				routeKey: serverRouteKey,
				file: join(dirname(fileURLToPath(import.meta.url)), '/handlers/icon.js'),
				exportName: 'default',
			})

			addRoutes({
				[routeKey]: {
					type: 'lambda',
					requestHeaders: {
						[ROUTE_HEADER]: serverRouteKey,
					},
					rewrite: {
						regex: `^${props.path}/(.*)$`,
						to: '/$1',
					},
				},
			})

			bundle.addEnv(
				formatRouteEnvName(serverRouteKey, 'ICON_CONFIG'),
				JSON.stringify({
					preserveIds: props.preserveIds,
					symbols: props.symbols,
				})
			)

			bundle.addEnv(formatRouteEnvName(serverRouteKey, 'ICON_BUCKET'), bucket.name)
			bundle.addEnv(formatRouteEnvName(serverRouteKey, 'ICON_FOLDER'), folder)

			if (originRouteKey) {
				bundle.addEnv(formatRouteEnvName(serverRouteKey, 'ICON_ORIGIN'), originRouteKey)
			}

			if (props.origin.static) {
				bundle.addEnv(formatRouteEnvName(serverRouteKey, 'ICON_ORIGIN_S3'), 'true')
			}

			// ------------------------------------------------------------
			// Upload static icons to S3

			ctx.onReady(() => {
				if (props.origin.static) {
					const files = glob.sync('**', {
						cwd: props.origin.static,
						nodir: true,
					})

					for (const file of files) {
						if (!file.endsWith('.svg')) {
							throw new Error(`Icon file "${file}" in "${props.origin.static}" is not an SVG file.`)
						}

						new aws.s3.BucketObject(
							group,
							`static-${file}`,
							{
								bucket: bucket.name,
								key: `${folder}origin/${file}`,
								source: join(props.origin.static, file),
								sourceHash: $hash(join(props.origin.static, file)),
							},
							{
								replaceOnChanges: ['bucket', 'key'],
							}
						)
					}
				}
			})

			// ------------------------------------------------------------
			// Domain name records and endpoint binding

			ctx.shared.add('icon', 'distribution-id', id, routerId)
			ctx.shared.add('icon', 'cache', id, { bucket: bucket.name, prefix: `${folder}cache/` })
		}
	},
})
