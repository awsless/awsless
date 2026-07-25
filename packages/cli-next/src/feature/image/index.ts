import { toDays } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { formatRouteEnvName } from 'awsless'
import { kebabCase } from 'change-case'
import { glob } from 'glob'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { FileError } from '../../error'
import { defineFeature } from '../../feature'
import { formatGlobalResourceName } from '../../util/name'
import { formatRouteKey, registerBundleFunction, ROUTE_HEADER } from '../bundle/util.js'
import { getFeatureFolder } from '../store/index.js'

export const imageFeature = defineFeature({
	name: 'image',
	onApp(ctx) {
		const found = ctx.stackConfigs.filter(stack => {
			return Object.keys(stack.images ?? {}).length > 0
		})

		if (found.length === 0) {
			return
		}

		if (ctx.appConfig.defaults.function.architecture !== 'arm64') {
			throw new FileError('app.json', 'The image feature requires an arm64 function bundle.')
		}

		// ------------------------------------------------------------
		// Create the layer for the image transformation function

		const group = new Group(ctx.base, 'image', 'layer')

		const path = join(dirname(fileURLToPath(import.meta.url)), '/layers/sharp-arm.zip')

		const layerId = formatGlobalResourceName({
			appName: ctx.appConfig.name,
			resourceType: 'layer',
			resourceName: 'sharp',
		})

		const zipFile = new aws.s3.BucketObject(
			group,
			'layer',
			{
				bucket: ctx.shared.get('store', 'bucket').name,
				key: `layer/${layerId}.zip`,
				contentType: 'application/zip',
				source: path,
				sourceHash: $hash(path),
			},
			{
				replaceOnChanges: ['bucket', 'key'],
			}
		)

		const layer = new aws.lambda.LayerVersion(
			group,
			'layer',
			{
				layerName: layerId,
				description: 'sharp-arm.zip for the awsless image feature.',
				compatibleArchitectures: ['arm64'],
				s3Bucket: zipFile.bucket,
				s3ObjectVersion: zipFile.versionId,
				s3Key: zipFile.key.pipe(name => {
					if (name.startsWith('/')) {
						return name.substring(1)
					}

					return name
				}),
				sourceCodeHash: $hash(path),
				skipDestroy: true,
			},
			{
				dependsOn: [zipFile],
				replaceOnChanges: ['sourceCodeHash', 's3ObjectVersion'],
			}
		)

		ctx.shared.add('layer', 'arn', layerId, layer.arn)

		const bundle = ctx.shared.get('bundle', 'main')
		bundle.addLayer(layer.arn)
	},
	onStack(ctx) {
		const bundle = ctx.shared.get('bundle', 'main')
		const bucket = ctx.shared.get('store', 'bucket')

		for (const [id, props] of Object.entries(ctx.stackConfig.images ?? {})) {
			const group = new Group(ctx.stack, 'image', id)
			const folder = getFeatureFolder('image', ctx.stack.name, id)

			// const addInvalidation = ctx.shared.entry('router', 'addInvalidation', props.router)
			const routerId = ctx.shared.entry('router', 'id', props.router)
			const addRoutes = ctx.shared.entry('router', 'addRoutes', props.router)
			const routeKey = props.path.endsWith('/') ? `${props.path}*` : `${props.path}/*`

			// ------------------------------------------------------------
			// Create the image origins

			let originRouteKey: string | undefined

			if (props.origin.function) {
				const origin = props.origin.function
				originRouteKey = formatRouteKey(ctx.stack.name, 'image', `${id}-origin`)

				registerBundleFunction(ctx, originRouteKey, origin)
			}

			// ------------------------------------------------------------
			// The image cache lives in the shared bucket

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
			// Add the image server to the bundle

			const serverRouteKey = formatRouteKey(ctx.stack.name, 'image', id)

			bundle.addHandler({
				routeKey: serverRouteKey,
				file: join(dirname(fileURLToPath(import.meta.url)), '/handlers/image.js'),
				exportName: 'default',
				external: ['sharp'],
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
				formatRouteEnvName(serverRouteKey, 'IMAGE_CONFIG'),
				JSON.stringify({
					presets: props.presets,
					extensions: props.extensions,
				})
			)

			bundle.addEnv(formatRouteEnvName(serverRouteKey, 'IMAGE_BUCKET'), bucket.name)
			bundle.addEnv(formatRouteEnvName(serverRouteKey, 'IMAGE_FOLDER'), folder)

			if (originRouteKey) {
				bundle.addEnv(formatRouteEnvName(serverRouteKey, 'IMAGE_ORIGIN'), originRouteKey)
			}

			if (props.origin.static) {
				bundle.addEnv(formatRouteEnvName(serverRouteKey, 'IMAGE_ORIGIN_S3'), 'true')
			}

			// ------------------------------------------------------------
			// Upload static images to S3

			ctx.onReady(() => {
				if (props.origin.static) {
					const files = glob.sync('**', {
						cwd: props.origin.static,
						nodir: true,
					})

					for (const file of files) {
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

			ctx.shared.add('image', 'distribution-id', id, routerId)
			ctx.shared.add('image', 'cache', id, { bucket: bucket.name, prefix: `${folder}cache/` })
		}
	},
})
