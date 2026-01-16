// import { hasOnFailure } from './util.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { defineFeature } from '../../feature.js'
import { createLambdaFunction } from '../function/util.js'
import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'

export const onFailureFeature = defineFeature({
	name: 'on-failure',
	// onValidate(ctx) {
	// 	// ----------------------------------------------------------------
	// 	// Only allow a on-failure single listener

	// 	const count = ctx.stackConfigs.filter(s => s.onFailure).length

	// 	if (count > 1) {
	// 		throw new TypeError('Only 1 onFailure configuration is allowed in your app.')
	// 	}
	// },
	onApp(ctx) {
		// ----------------------------------------------------------------
		// Create a single on-failure queue to capture all failed jobs

		const group = new Group(ctx.base, 'on-failure', 'main')

		const deadletter = new aws.sqs.Queue(group, 'deadletter', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'on-failure',
				resourceName: 'deadletter',
			}),
		})

		const queue = new aws.sqs.Queue(group, 'on-failure', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'on-failure',
				resourceName: 'failure',
			}),
			redrivePolicy: $resolve([deadletter.arn], deadLetterTargetArn => {
				return JSON.stringify({
					deadLetterTargetArn,
					maxReceiveCount: 100,
				})
			}),
		})

		ctx.shared.set('on-failure', 'queue-arn', queue.arn)

		// ----------------------------------------------------------------
		// Link a consumer to the on-failure queue

		if (!ctx.appConfig.defaults.onFailure) {
			return
		}

		const result = createLambdaFunction(group, ctx, 'on-failure', 'consumer', ctx.appConfig.defaults.onFailure)

		new aws.lambda.EventSourceMapping(
			group,
			'on-failure',
			{
				functionName: result.lambda.functionName,
				eventSourceArn: queue.arn,
				batchSize: 10,
			},
			{
				dependsOn: [result.policy],
			}
		)

		result.addPermission({
			actions: [
				'sqs:SendMessage',
				'sqs:DeleteMessage',
				'sqs:ReceiveMessage',
				'sqs:GetQueueUrl',
				'sqs:GetQueueAttributes',
			],
			resources: [queue.arn],
		})
	},
})
