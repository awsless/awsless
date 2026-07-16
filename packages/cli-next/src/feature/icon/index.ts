import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature'
import { formatLocalResourceName } from '../../util/name'
import { formatRouteEnvName } from 'awsless'
import { internalHandler } from '../bundle/build/bundle.js'
import { addBundleFunction, formatRouteKey, ROUTE_HEADER } from '../bundle/util.js'
import { join } from 'path'
import { toDays } from '@awsless/duration'
import { glob } from 'glob'
import { shortId } from '../../util/id'

export const iconFeature = defineFeature({
	name: 'icon',
	onStack(ctx) {
		const bundle = ctx.shared.get('bundle', 'main')

		for (const [id, props] of Object.entries(ctx.stackConfig.icons ?? {})) {
			const group = new Group(ctx.stack, 'icon', id)

			// const name = formatLocalResourceName({
			// 	appName: ctx.app.name,
			// 	stackName: ctx.stack.name,
			// 	resourceType: 'icon',
			// 	resourceName: id,
			// })

			const routerId = ctx.shared.entry('router', 'id', props.router)
			const addRoutes = ctx.shared.entry('router', 'addRoutes', props.router)
			const routeKey = props.path.endsWith('/') ? `${props.path}*` : `${props.path}/*`

			// ------------------------------------------------------------
			// Create the icon origins

			let originRouteKey: string | undefined

			if (props.origin.function) {
				const origin = props.origin.function
				originRouteKey = formatRouteKey(ctx.stack.name, 'icon', `${id}-origin`)

				addBundleFunction(ctx, originRouteKey, origin)
			}

			let s3Origin: aws.s3.Bucket | undefined

			if (props.origin.static) {
				s3Origin = new aws.s3.Bucket(group, 'origin', {
					bucket: formatLocalResourceName({
						appName: ctx.app.name,
						stackName: ctx.stack.name,
						resourceType: 'icon',
						resourceName: shortId(`${id}-${ctx.appId}`),
					}),
					forceDestroy: true,
				})
			}

			// ------------------------------------------------------------
			// Create the icon cache

			const cacheBucket = new aws.s3.Bucket(group, 'cache', {
				bucket: formatLocalResourceName({
					appName: ctx.app.name,
					stackName: ctx.stack.name,
					resourceType: 'icon',
					resourceName: shortId(`cache-${id}-${ctx.appId}`),
				}),
				tags: {
					cache: 'true',
				},
				forceDestroy: true,

				...(props.cacheDuration
					? {
							lifecycleRule: [
								{
									enabled: true,
									id: 'icon-cache-duration',
									expiration: {
										days: toDays(props.cacheDuration),
									},
								},
							],
						}
					: {}),
			})

			// ------------------------------------------------------------
			// Add the icon server to the bundle

			const serverRouteKey = formatRouteKey(ctx.stack.name, 'icon', id)

			bundle.addHandler({
				routeKey: serverRouteKey,
				file: internalHandler('icon'),
				exportName: 'default',
			})

			bundle.addPermission({
				actions: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:GetObjectAttributes'],
				resources: [
					//
					cacheBucket.arn,
					cacheBucket.arn.pipe(arn => `${arn}/*`),
					...(s3Origin ? [s3Origin.arn, s3Origin.arn.pipe(arn => `${arn}/*`)] : []),
				],
			})

			bundle.addEnv(
				formatRouteEnvName(serverRouteKey, 'ICON_CONFIG'),
				JSON.stringify({
					preserveIds: props.preserveIds,
					symbols: props.symbols,
				})
			)

			bundle.addEnv(formatRouteEnvName(serverRouteKey, 'ICON_CACHE_BUCKET'), cacheBucket.bucket)

			if (originRouteKey) {
				bundle.addEnv(formatRouteEnvName(serverRouteKey, 'ICON_ORIGIN'), originRouteKey)
			}

			if (s3Origin) {
				bundle.addEnv(formatRouteEnvName(serverRouteKey, 'ICON_ORIGIN_S3'), s3Origin.bucket)
			}

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

			// ------------------------------------------------------------
			// Upload static icons to S3

			ctx.onReady(() => {
				if (props.origin.static && s3Origin) {
					const files = glob.sync('**', {
						cwd: props.origin.static,
						nodir: true,
					})

					for (const file of files) {
						if (!file.endsWith('.svg')) {
							throw new Error(`Icon file "${file}" in "${props.origin.static}" is not an SVG file.`)
						}

						new aws.s3.BucketObject(group, `static-${file}`, {
							bucket: s3Origin.bucket,
							key: file,
							source: join(props.origin.static, file),
							sourceHash: $hash(join(props.origin.static, file)),
						})
					}
				}
			})

			// ------------------------------------------------------------
			// Domain name records and endpoint binding

			ctx.shared.add('icon', 'distribution-id', id, routerId)
			ctx.shared.add('icon', 'cache-bucket', id, cacheBucket.bucket)
		}
	},
})
