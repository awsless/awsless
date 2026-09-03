import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Duration, toDays } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { formatRouteEnvName } from 'awsless'
import { constantCase, kebabCase } from 'change-case'
import { glob } from 'glob'
import { getBuildPath } from '../../build/index.js'
import { FileError } from '../../error.js'
import { defineFeature, StackContext } from '../../feature.js'
import { formatByteSize } from '../../util/byte-size.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { relativePath } from '../../util/path.js'
import { getFeatureFolder } from '../asset/index.js'
import { formatRouteKey, registerBundleFunction, ROUTE_HEADER } from '../bundle/util.js'
import { imageOnDev } from './dev.js'

// The image & icon features share one server shape: a bundle handler
// behind a router path, an optional origin function or static folder,
// and a cache folder in the shared bucket.
export const registerMediaServer = (
	ctx: StackContext,
	props: {
		kind: 'image' | 'icon'
		id: string
		router: string
		path: string
		cacheDuration?: Duration
		origin: {
			function?: Parameters<typeof registerBundleFunction>[2]
			static?: string
		}
		handler: {
			file: string
			external?: string[]
		}
		// The server config, passed as json through the route env.
		config: unknown
		// Rejects a static file before it's uploaded.
		validateFile?: (file: string) => void
	}
) => {
	const { kind, id } = props
	const bundle = ctx.shared.get('bundle', 'main')
	const bucket = ctx.shared.get('asset', 'bucket')
	const group = new Group(ctx.stack, kind, id)
	const folder = getFeatureFolder(kind, ctx.stack.name, id)
	const envPrefix = constantCase(kind)

	const routerId = ctx.shared.entry('router', 'id', props.router)
	const addRoutes = ctx.shared.entry('router', 'addRoutes', props.router)
	const routeKey = props.path.endsWith('/') ? `${props.path}*` : `${props.path}/*`

	// ------------------------------------------------------------
	// The origins

	let originRouteKey: string | undefined

	if (props.origin.function) {
		originRouteKey = formatRouteKey(ctx.stack.name, kind, `${id}-origin`)

		registerBundleFunction(ctx, originRouteKey, props.origin.function)
	}

	// ------------------------------------------------------------
	// The cache lives in the shared bucket

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
	// Add the server to the bundle

	const serverRouteKey = formatRouteKey(ctx.stack.name, kind, id)

	bundle.addHandler({
		routeKey: serverRouteKey,
		file: props.handler.file,
		exportName: 'default',
		external: props.handler.external,
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

	bundle.addEnv(formatRouteEnvName(serverRouteKey, `${envPrefix}_CONFIG`), JSON.stringify(props.config))
	bundle.addEnv(formatRouteEnvName(serverRouteKey, `${envPrefix}_BUCKET`), bucket.name)
	bundle.addEnv(formatRouteEnvName(serverRouteKey, `${envPrefix}_FOLDER`), folder)

	if (originRouteKey) {
		bundle.addEnv(formatRouteEnvName(serverRouteKey, `${envPrefix}_ORIGIN`), originRouteKey)
	}

	if (props.origin.static) {
		bundle.addEnv(formatRouteEnvName(serverRouteKey, `${envPrefix}_ORIGIN_S3`), 'true')
	}

	// ------------------------------------------------------------
	// Upload the static origin files to S3

	ctx.onReady(() => {
		if (props.origin.static) {
			const files = glob.sync('**', {
				cwd: props.origin.static,
				nodir: true,
			})

			for (const file of files) {
				props.validateFile?.(file)

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

	ctx.shared.add(kind, 'distribution-id', id, routerId)
	ctx.shared.add(kind, 'cache', id, { bucket: bucket.name, prefix: `${folder}cache/` })
}

export const imageFeature = defineFeature({
	name: 'image',
	onDev: imageOnDev,
	onApp(ctx) {
		const found = ctx.stackConfigs.filter(stack => {
			return Object.keys(stack.images ?? {}).length > 0
		})

		if (found.length === 0) {
			return
		}

		if (ctx.appConfig.function.architecture !== 'arm64') {
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

		// The cli package path changes with every release, so the zip is
		// copied into the build folder to keep a stable upload source.
		ctx.registerBuild('image', layerId, async build => {
			const file = await readFile(path)
			const fingerprint = createHash('sha1').update(file).digest('hex')

			return build(fingerprint, async write => {
				await Promise.all([
					//
					write('HASH', fingerprint),
					write('layer.zip', file),
				])

				return {
					size: formatByteSize(file.byteLength),
				}
			})
		})

		const source = relativePath(getBuildPath('image', layerId, 'layer.zip'))
		const sourceHash = $file(getBuildPath('image', layerId, 'HASH'))

		const zipFile = new aws.s3.BucketObject(
			group,
			'layer',
			{
				bucket: ctx.shared.get('asset', 'bucket').name,
				key: `layer/${layerId}.zip`,
				contentType: 'application/zip',
				source,
				sourceHash,
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
				sourceCodeHash: sourceHash,
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
		for (const [id, props] of Object.entries(ctx.stackConfig.images ?? {})) {
			registerMediaServer(ctx, {
				kind: 'image',
				id,
				router: props.router,
				path: props.path,
				cacheDuration: props.cacheDuration,
				origin: props.origin,
				handler: {
					file: join(dirname(fileURLToPath(import.meta.url)), '/handlers/image.js'),
					external: ['sharp'],
				},
				config: {
					presets: props.presets,
					extensions: props.extensions,
				},
			})
		}
	},
})
