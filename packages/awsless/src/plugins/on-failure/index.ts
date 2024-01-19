import { definePlugin } from '../../plugin.js'
import { toLambdaFunction } from '../function/index.js'
import { SqsEventSource } from '../../formation/resource/lambda/event-source/sqs.js'
import { Queue } from '../../formation/resource/sqs/queue.js'
import { hasOnFailure } from './util.js'

export const onFailurePlugin = definePlugin({
	name: 'on-failure',
	onApp({ config, bootstrap }) {
		if (!hasOnFailure(config)) {
			return
		}

		const queue = new Queue('on-failure', {
			name: `${config.app.name}-failure`,
		})

		bootstrap.add(queue).export('on-failure-queue-arn', queue.arn)
	},
	onStack(ctx) {
		const { stack, stackConfig, bootstrap } = ctx
		const onFailure = stackConfig.onFailure

		if (!onFailure) {
			return
		}

		const queueArn = bootstrap.import('on-failure-queue-arn')
		const lambda = toLambdaFunction(ctx, 'on-failure', onFailure)
		const source = new SqsEventSource('on-failure', lambda, {
			queueArn,
		})

		lambda.addPermissions({
			actions: ['sqs:SendMessage', 'sqs:ReceiveMessage', 'sqs:GetQueueUrl', 'sqs:GetQueueAttributes'],
			resources: [queueArn],
		})

		stack.add(lambda, source)
	},
})
