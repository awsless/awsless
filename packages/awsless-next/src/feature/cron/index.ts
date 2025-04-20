import { $, Group } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { createAsyncLambdaFunction } from '../function/util.js'
import { formatLocalResourceName } from '../../util/name.js'

export const cronFeature = defineFeature({
	name: 'cron',
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.crons ?? {})) {
			const group = new Group(ctx.stack, 'cron', id)

			const { lambda } = createAsyncLambdaFunction(group, ctx, 'cron', id, props.consumer)

			const rule = new $.aws.cloudwatch.EventRule(group, 'rule', {
				name: formatLocalResourceName({
					appName: ctx.app.name,
					stackName: ctx.stack.name,
					resourceType: 'cron',
					resourceName: id,
				}),
				description: `Cron ${ctx.stack.name} ${id}`,
				scheduleExpression: props.schedule,
				isEnabled: props.enabled,
				forceDestroy: true,
			})

			new $.aws.cloudwatch.EventTarget(group, 'target', {
				rule: rule.name,
				arn: lambda.arn,
				input: JSON.stringify(props.payload),
			})

			new $.aws.lambda.Permission(group, 'permission', {
				action: 'lambda:InvokeFunction',
				principal: 'events.amazonaws.com',
				functionName: lambda.functionName,
				sourceArn: rule.arn,
			})
		}
	},
})
