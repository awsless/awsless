import { $, Group } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { createAsyncLambdaFunction } from '../function/util.js'
import { formatLocalResourceName } from '../../util/name.js'
import { shortId } from '../../util/id.js'

export const cronFeature = defineFeature({
	name: 'cron',
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.crons ?? {})) {
			const group = new Group(ctx.stack, 'cron', id)

			const { lambda } = createAsyncLambdaFunction(group, ctx, 'cron', id, {
				...props.consumer,
				// Never warm cronjob lambda's
				warm: 0,
			})

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'cron',
				resourceName: shortId(id),
			})

			const scheduleRole = new $.aws.iam.Role(group, 'warm', {
				name,
				description: `Cron ${ctx.stack.name} ${id}`,
				assumeRolePolicy: JSON.stringify({
					Version: '2012-10-17',
					Statement: [
						{
							Action: 'sts:AssumeRole',
							Effect: 'Allow',
							Principal: {
								Service: 'scheduler.amazonaws.com',
							},
						},
					],
				}),
				inlinePolicy: [
					{
						name: 'invoke function',
						policy: lambda.arn.pipe(arn =>
							JSON.stringify({
								Version: '2012-10-17',
								Statement: [
									{
										Action: ['lambda:InvokeFunction'],
										Effect: 'Allow',
										Resource: arn,
									},
								],
							})
						),
					},
				],
			})

			new $.aws.scheduler.Schedule(group, 'warm', {
				name,
				description: `Cron ${ctx.stack.name} ${id}`,
				scheduleExpression: props.schedule,
				target: {
					arn: lambda.arn,
					roleArn: scheduleRole.arn,
					input: JSON.stringify(props.payload),
				},
			})

			// const rule = new $.aws.cloudwatch.EventRule(group, 'rule', {
			// 	name: formatLocalResourceName({
			// 		appName: ctx.app.name,
			// 		stackName: ctx.stack.name,
			// 		resourceType: 'cron',
			// 		resourceName: shortId(id),
			// 	}),
			// 	description: `Cron ${ctx.stack.name} ${id}`,
			// 	scheduleExpression: props.schedule,
			// 	isEnabled: props.enabled,
			// 	forceDestroy: true,
			// })

			// new $.aws.cloudwatch.EventTarget(group, 'target', {
			// 	rule: rule.name,
			// 	arn: lambda.arn,
			// 	input: JSON.stringify(props.payload),
			// })

			// new $.aws.lambda.Permission(group, 'permission', {
			// 	action: 'lambda:InvokeFunction',
			// 	principal: 'events.amazonaws.com',
			// 	functionName: lambda.functionName,
			// 	sourceArn: rule.arn,
			// })
		}
	},
})
