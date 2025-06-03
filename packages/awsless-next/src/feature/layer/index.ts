import { $, Group } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { LayerProps } from './schema.js'
import { shortId } from '../../util/id.js'
// import { FileError } from '../../error.js'
// import { StackConfig } from '../../config/stack.js'

export const layerFeature = defineFeature({
	name: 'layer',
	onBefore(ctx) {
		const group = new Group(ctx.base, 'layer', 'asset')

		const bucket = new $.aws.s3.Bucket(group, 'bucket', {
			bucket: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'layer',
				resourceName: 'assets',
				postfix: ctx.appId,
			}),
			forceDestroy: true,
		})

		ctx.shared.set('layer', 'bucket-name', bucket.bucket)
	},
	// onValidate(ctx) {
	// 	const layers = Object.keys(ctx.appConfig.defaults.layers ?? [])

	// 	for (const stack of ctx.stackConfigs) {
	// 		const stackLayers = stackSearch<string[]>(stack, 'layers').flat()
	// 		for (const layer of stackLayers) {
	// 			if (!layers.includes(layer)) {
	// 				throw new FileError(stack.file, `Layer "${layer}" is not defined in app.json`)
	// 			}
	// 		}
	// 	}
	// },
	onApp(ctx) {
		const layers = Object.entries(ctx.appConfig.defaults.layers ?? {})

		if (layers.length === 0) {
			return
		}

		for (const [id, _props] of layers) {
			const props = _props as LayerProps
			const group = new Group(ctx.base, 'layer', id)

			const zip = new $.aws.s3.BucketObject(group, 'zip', {
				bucket: ctx.shared.get('layer', 'bucket-name'),
				key: `/layer/${id}.zip`,
				contentType: 'application/zip',
				source: props.file,
				sourceHash: $hash(props.file),
			})

			const layer = new $.aws.lambda.LayerVersion(
				group,
				'layer',
				{
					layerName: formatGlobalResourceName({
						appName: ctx.appConfig.name,
						resourceType: 'layer',
						resourceName: shortId(id),
					}),
					description: id,
					compatibleArchitectures: props.architecture ? [props.architecture] : undefined,
					compatibleRuntimes: props.runtimes,
					s3Bucket: zip.bucket,
					s3ObjectVersion: zip.versionId,
					s3Key: zip.key.pipe(name => {
						if (name.startsWith('/')) {
							return name.substring(1)
						}

						return name
					}),
					sourceCodeHash: $hash(props.file),
				},
				{
					dependsOn: [zip],
				}
			)

			ctx.shared.add('layer', 'arn', id, layer.arn)
			ctx.shared.add('layer', 'packages', id, props.packages ?? [id])
		}
	},
})
