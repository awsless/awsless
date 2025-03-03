import { Asset, aws, Node } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { LayerProps } from './schema.js'
import { shortId } from '../../util/id.js'
// import { FileError } from '../../error.js'
// import { StackConfig } from '../../config/stack.js'

// const stackSearch = <T>(stack: StackConfig, key: string) => {
// 	let found: T[] = []

// 	function search(obj: Record<string, unknown>) {
// 		if (typeof obj !== 'object' || obj === null) return

// 		if (obj[key]) {
// 			found.push(obj[key] as T)
// 		}

// 		for (let k in obj) {
// 			if (typeof obj[k] === 'object') {
// 				search(obj[k] as Record<string, unknown>)
// 			}
// 		}
// 	}

// 	search(stack)
// 	return found
// }

export const layerFeature = defineFeature({
	name: 'layer',
	onBefore(ctx) {
		const layers = Object.entries(ctx.appConfig.defaults.layers ?? {})

		if (layers.length === 0) {
			return
		}

		const group = new Node(ctx.base, 'layer', 'asset')

		// ------------------------------------------------------

		const bucket = new aws.s3.Bucket(group, 'bucket', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'layer',
				resourceName: 'assets',
				postfix: ctx.appId,
			}),
			// versioning: true,
			forceDelete: true,
		})

		ctx.shared.set('layer-bucket-name', bucket.name)
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
			const group = new Node(ctx.base, 'layer', id)

			const item = new aws.s3.BucketObject(group, 'code', {
				bucket: ctx.shared.get('layer-bucket-name'),
				key: `/layer/${id}.zip`,
				body: Asset.fromFile(props.file),
				contentType: 'application/zip',
			})

			const layer = new aws.lambda.Layer(group, 'layer', {
				name: formatGlobalResourceName({
					appName: ctx.appConfig.name,
					resourceType: 'layer',
					resourceName: shortId(id),
				}),
				description: id,
				architectures: props.architecture ? [props.architecture] : undefined,
				runtimes: props.runtimes,
				code: {
					bucket: item.bucket,
					key: item.key,
				},
			}).dependsOn(item)

			ctx.shared.set(`layer-${id}-arn`, layer.arn)
			ctx.shared.set(`layer-${id}-packages`, props.packages ?? [id])
		}
	},
})
