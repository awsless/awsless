import { definePlugin } from '../../plugin.js'
import { toLambdaFunction } from '../function/index.js'
import { IotEventSource } from '../../formation/resource/lambda/event-source/iot.js'

export const pubsubPlugin = definePlugin({
	name: 'pubsub',
	onApp({ bind }) {
		bind(lambda => {
			lambda.addPermissions({
				actions: ['iot:publish'],
				resources: ['*'],
			})
		})
	},
	onStack(ctx) {
		const { config, stack, stackConfig } = ctx

		for (const [id, props] of Object.entries(stackConfig.pubsub || {})) {
			const lambda = toLambdaFunction(ctx, `pubsub-${id}`, props.consumer)
			const source = new IotEventSource(id, lambda, {
				name: `${config.app.name}-${stack.name}-${id}`,
				sql: props.sql,
				sqlVersion: props.sqlVersion,
			})

			stack.add(lambda, source)
		}
	},
})
