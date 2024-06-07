import { aws, Node } from '@awsless/formation'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { formatLocalResourceName } from '../../util/name.js'

export const streamFeature = defineFeature({
	name: 'stream',
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.streams ?? {})) {
			const group = new Node(ctx.stack, 'stream', id)
			const name = formatLocalResourceName(ctx.appConfig.name, ctx.stack.name, 'stream', id)
			const channel = new aws.ivs.Channel(group, 'channel', {
				name,
				...props,
			})

			const streamKey = new aws.ivs.StreamKey(group, 'key', {
				channel: channel.arn,
			})

			const prefix = `STREAM_${constantCase(ctx.stack.name)}_${constantCase(id)}`
			ctx.bindEnv(`${prefix}_ENDPOINT`, channel.playbackUrl)

			ctx.onFunction(lambda => {
				lambda.addEnvironment(`${prefix}_INGEST_ENDPOINT`, channel.ingestEndpoint)
				lambda.addEnvironment(`${prefix}_STREAM_KEY`, streamKey.value)
			})

			// ctx.addEnvironment()

			// ctx.onInstance(instance => {
			// 	instance.addEnvironment(`${prefix}_INGEST_ENDPOINT`, channel.ingestEndpoint)
			// 	instance.addEnvironment(`${prefix}_STREAM_KEY`, streamKey.value)
			// })

			// ctx.onFunction(({ lambda }) => {
			// 	lambda.addEnvironment(`${prefix}_INGEST_ENDPOINT`, channel.ingestEndpoint)
			// 	lambda.addEnvironment(`${prefix}_PLAYBACK_URL`, channel.playbackUrl)
			// 	// lambda.addEnvironment(`${prefix}_SECRET`, )
			// })
		}
	},
})
