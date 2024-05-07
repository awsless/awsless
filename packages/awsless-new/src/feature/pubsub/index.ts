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
				resources: [`arn:aws:iot:${ctx.appConfig.region}:${ctx.accountId}:rule/*`],
			})
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.pubsub ?? {})) {
			const group = new Node(ctx.stack, 'pubsub', id)

			const { lambda } = createLambdaFunction(group, ctx, `pubsub`, id, props.consumer)

			const name = formatLocalResourceName(ctx.app.name, ctx.stack.name, 'pubsub', id)
			const topic = new aws.iot.TopicRule(group, 'rule', {
				name: name.replaceAll('-', '_'),
				sql: props.sql,
				sqlVersion: props.sqlVersion,
				actions: [{ lambda: { functionArn: lambda.arn } }],
			})

			new aws.lambda.Permission(group, 'permission', {
				action: 'lambda:InvokeFunction',
				principal: 'iot.amazonaws.com',
				functionArn: lambda.arn,
				sourceArn: topic.arn,
			})
		}
	},
})
