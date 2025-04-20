// import { hasOnFailure } from './util.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { defineFeature } from '../../feature.js'
import { createLambdaFunction } from '../function/util.js'
import { Group, $ } from '@awsless/formation'

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
		// if (!hasOnFailure(ctx.stackConfigs)) {
		// 	return
		// }

		if (!ctx.appConfig.defaults.onFailure) {
			return
		}

		// ----------------------------------------------------------------
		// Create a single on-failure queue to capture all failed jobs

		const group = new Group(ctx.base, 'on-failure', 'main')

		const queue = new $.aws.sqs.Queue(group, 'on-failure', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'on-failure',
				resourceName: 'failure',
			}),
		})

		ctx.shared.set('on-failure', 'queue-arn', queue.arn)

		const result = createLambdaFunction(group, ctx, 'on-failure', 'consumer', ctx.appConfig.defaults.onFailure)

		new $.aws.lambda.EventSourceMapping(
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
	// onStack(ctx) {
	// 	const onFailure = ctx.stackConfig.onFailure

	// 	if (!onFailure) {
	// 		return
	// 	}

	// 	const queueArn = ctx.shared.get<aws.ARN>('on-failure-queue-arn')
	// 	const group = new Node(ctx.stack, 'on-failure', 'failure')

	// 	const { lambda, policy } = createLambdaFunction(group, ctx, 'on-failure', 'failure', onFailure)

	// 	const source = new aws.lambda.EventSourceMapping(group, 'on-failure', {
	// 		functionArn: lambda.arn,
	// 		sourceArn: queueArn,
	// 		batchSize: 10,
	// 	})

	// 	source.dependsOn(policy)

	// 	policy.addStatement({
	// 		actions: [
	// 			'sqs:SendMessage',
	// 			'sqs:DeleteMessage',
	// 			'sqs:ReceiveMessage',
	// 			'sqs:GetQueueUrl',
	// 			'sqs:GetQueueAttributes',
	// 		],
	// 		resources: [queueArn],
	// 	})
	// },
})
