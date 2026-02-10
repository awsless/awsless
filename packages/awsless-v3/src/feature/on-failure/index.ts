// import { hasOnFailure } from './util.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { defineFeature } from '../../feature.js'
import { createLambdaFunction } from '../function/util.js'
import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { days, toSeconds } from '@awsless/duration'

export const onFailureFeature = defineFeature({
	name: 'on-failure',
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
			messageRetentionSeconds: toSeconds(days(14)),
		})

		const queue = new aws.sqs.Queue(group, 'on-failure', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'on-failure',
				resourceName: 'failure',
			}),
			redrivePolicy: deadletter.arn.pipe(deadLetterTargetArn => {
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

		// Deny calling other functions to stop circular loop problems
		result.addPermission({
			effect: 'deny',
			actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync', 'sqs:SendMessage', 'sns:Publish'],
			resources: ['*'],
		})
	},
})
