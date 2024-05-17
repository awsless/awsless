import { hasOnFailure } from './util.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { defineFeature } from '../../feature.js'
import { createLambdaFunction } from '../function/util.js'
import { Node, aws } from '@awsless/formation'

export const onFailureFeature = defineFeature({
	name: 'on-failure',
	onApp(ctx) {
		if (!hasOnFailure(ctx.stackConfigs)) {
			return
		}

		// ----------------------------------------------------------------
		// Only allow a on-failure single listener

		const count = ctx.stackConfigs.filter(s => s.onFailure).length

		if (count > 1) {
			throw new TypeError('Only 1 onFailure configuration is allowed in your app.')
		}

		// ----------------------------------------------------------------
		// Create a single on-failure queue to capture all failed jobs

		const queue = new aws.sqs.Queue(ctx.base, 'on-failure', {
			name: formatGlobalResourceName(ctx.appConfig.name, 'on-failure', 'failure'),
		})

		ctx.shared.set('on-failure-queue-arn', queue.arn)
	},
	onStack(ctx) {
		const onFailure = ctx.stackConfig.onFailure

		if (!onFailure) {
			return
		}

		// ----------------------------------------------------------------
		// The lambda listening to the on-failure queue lives on the
		// stack level.

		const queueArn = ctx.shared.get<aws.ARN>('on-failure-queue-arn')
		const group = new Node(ctx.stack, 'on-failure', 'failure')

		const { lambda, policy } = createLambdaFunction(group, ctx, 'on-failure', 'failure', onFailure)

		const source = new aws.lambda.EventSourceMapping(group, 'on-failure', {
			functionArn: lambda.arn,
			sourceArn: queueArn,
			batchSize: 10,
		})

		source.dependsOn(policy)

		policy.addStatement({
			actions: [
				'sqs:SendMessage',
				'sqs:DeleteMessage',
				'sqs:ReceiveMessage',
				'sqs:GetQueueUrl',
				'sqs:GetQueueAttributes',
			],
			resources: [queueArn],
		})
	},
})
