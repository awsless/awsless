import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { defineFeature } from '../../feature.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { LayerProps } from './schema.js'

export const layerFeature = defineFeature({
	name: 'layer',
	onApp(ctx) {
		const layers = Object.entries(ctx.appConfig.layers ?? {})

		if (layers.length === 0) {
			return
		}

		for (const [id, _props] of layers) {
			const props = _props as LayerProps
			const group = new Group(ctx.base, 'layer', id)

			const zip = new aws.s3.BucketObject(
				group,
				'zip',
				{
					bucket: ctx.shared.get('asset', 'bucket').name,
					key: `layer/${id}.zip`,
					contentType: 'application/zip',
					source: props.file,
					sourceHash: $hash(props.file),
				},
				{
					replaceOnChanges: ['bucket', 'key'],
				}
			)

			const layer = new aws.lambda.LayerVersion(
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
					s3Key: zip.key,
					sourceCodeHash: $hash(props.file),
					skipDestroy: true,
				},
				{
					dependsOn: [zip],
					replaceOnChanges: ['sourceCodeHash', 's3ObjectVersion'],
				}
			)

			ctx.shared.add('layer', 'arn', id, layer.arn)
			ctx.shared.add('layer', 'packages', id, props.packages ?? [id])
		}
	},
})
