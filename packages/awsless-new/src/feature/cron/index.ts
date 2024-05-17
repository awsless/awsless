import { Node, aws } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { createLambdaFunction } from '../function/util.js'
import { formatLocalResourceName } from '../../util/name.js'

export const cronFeature = defineFeature({
	name: 'cron',
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.crons ?? {})) {
			const group = new Node(ctx.stack, 'cron', id)

			const { lambda } = createLambdaFunction(group, ctx, this.name, id, props.consumer)

			lambda.addEnvironment('LOG_VIEWABLE_ERROR', '1')

			const rule = new aws.events.Rule(group, 'rule', {
				name: formatLocalResourceName(ctx.app.name, ctx.stack.name, this.name, id),
				schedule: props.schedule,
				enabled: props.enabled,
				targets: [
					{
						id: 'default',
						arn: lambda.arn,
						input: props.payload,
					},
				],
			})

			new aws.lambda.Permission(group, 'permission', {
				action: 'lambda:InvokeFunction',
				principal: 'events.amazonaws.com',
				functionArn: lambda.arn,
				sourceArn: rule.arn,
			})
		}
	},
})
