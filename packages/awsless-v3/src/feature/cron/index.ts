import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature.js'
import { createAsyncLambdaFunction } from '../function/util.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { shortId } from '../../util/id.js'

export const cronFeature = defineFeature({
	name: 'cron',
	onApp(ctx) {
		const found = ctx.stackConfigs.find(stackConfig => Object.keys(stackConfig.crons ?? {}).length > 0)
		if (found) {
			const group = new aws.scheduler.ScheduleGroup(ctx.base, 'cron', {
				name: formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'cron',
					resourceName: 'group',
				}),
				tags: {
					app: ctx.app.name,
				},
			})

			ctx.shared.set('cron', 'group-name', group.name)
		}
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.crons ?? {})) {
			const group = new Group(ctx.stack, 'cron', id)

			const { lambda } = createAsyncLambdaFunction(group, ctx, 'cron', id, props.consumer)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'cron',
				resourceName: shortId(id),
			})

			// ctx.shared.add('cron', ctx.stack.name, id, name)

			const scheduleRole = new aws.iam.Role(group, 'warm', {
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
						name: 'InvokeFunction',
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

			new aws.scheduler.Schedule(group, 'warm', {
				name,
				state: props.enabled ? 'ENABLED' : 'DISABLED',
				groupName: ctx.shared.get('cron', 'group-name'),
				description: `${ctx.stack.name} ${id}`,
				scheduleExpression: props.schedule,
				flexibleTimeWindow: { mode: 'OFF' },
				target: {
					arn: lambda.arn,
					roleArn: scheduleRole.arn,
					input: JSON.stringify(props.payload),
				},
			})
		}
	},
})
