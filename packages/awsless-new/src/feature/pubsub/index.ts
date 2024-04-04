import { Node, aws } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { createLambdaFunction } from '../function/util.js'
import { formatLocalResourceName } from '../../util/name.js'

export const pubsubFeature = defineFeature({
	name: 'pubsub',
	onApp(ctx) {
		ctx.onFunction(({ policy }) => {
			policy.addStatement({
				actions: ['iot:publish'],
				resources: ['arn:aws:iot:*:*:rule/*'],
			})
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.pubsub ?? {})) {
			const group = new Node('pubsub', id)
			ctx.stack.add(group)

			const { lambda } = createLambdaFunction(group, ctx, `pubsub`, 'function', props.consumer)

			const topic = new aws.iot.TopicRule('rule', {
				name: formatLocalResourceName(ctx.app.name, ctx.stack.name, 'pubsub', id).replaceAll('-', '_'),
				sql: props.sql,
				sqlVersion: props.sqlVersion,
				actions: [{ lambda: { functionArn: lambda.arn } }],
			})

			const permission = new aws.lambda.Permission('permission', {
				action: 'lambda:InvokeFunction',
				principal: 'iot.amazonaws.com',
				functionArn: lambda.arn,
				sourceArn: topic.arn,
			})

			group.add(topic, permission)

			// const source = new IotEventSource(id, lambda, {
			// 	name: `${config.app.name}-${stack.name}-${id}`,
			// 	sql: props.sql,
			// 	sqlVersion: props.sqlVersion,
			// })
		}
	},
})
