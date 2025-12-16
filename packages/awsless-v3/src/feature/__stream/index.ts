import { aws, Node } from '@awsless/formation'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { formatLocalResourceName } from '../../util/name.js'

export const streamFeature = defineFeature({
	name: 'stream',
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.streams ?? {})) {
			const group = new Node(ctx.stack, 'stream', id)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'stream',
				resourceName: id,
			})

			const channel = new aws.ivs.Channel(group, 'channel', {
				name,
				...props,
			})

			const streamKey = new aws.ivs.StreamKey(group, 'key', {
				channel: channel.arn,
			})

			const prefix = `STREAM_${constantCase(ctx.stack.name)}_${constantCase(id)}`
			// ctx.bindEnv(`${prefix}_ENDPOINT`, channel.playbackUrl)

			ctx.bind(`${prefix}_ENDPOINT`, channel.playbackUrl)
			ctx.addEnv(`${prefix}_INGEST_ENDPOINT`, channel.ingestEndpoint)
			ctx.addEnv(`${prefix}_STREAM_KEY`, streamKey.value)

			// ctx.onFunction(lambda => {
			// 	lambda.addEnvironment(`${prefix}_INGEST_ENDPOINT`, channel.ingestEndpoint)
			// 	lambda.addEnvironment(`${prefix}_STREAM_KEY`, streamKey.value)
			// })
		}
	},
})
