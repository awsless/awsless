import { definePlugin } from '../../plugin.js'
import { z } from 'zod'
import { FunctionSchema, toLambdaFunction } from '../function.js'
import { SqsEventSource } from '../../formation/resource/lambda/event-source/sqs.js'
import { Queue } from '../../formation/resource/sqs/queue.js'
import { hasOnFailure } from './util.js'

export const onFailurePlugin = definePlugin({
	name: 'on-failure',
	schema: z.object({
		stacks: z
			.object({
				/** Defining a onFailure handler will add a global onFailure handler for the following resources:
				 * - Async lambda functions
				 * - SQS queues
				 * - DynamoDB streams
				 * @example
				 * {
				 *   onFailure: 'on-failure.ts'
				 * }
				 */
				onFailure: FunctionSchema.optional(),
			})
			.array(),
	}),
	onApp({ config, bootstrap }) {
		if (!hasOnFailure(config)) {
			return
		}

		const queue = new Queue('on-failure', {
			name: `${config.name}-failure`,
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
		const lambda = toLambdaFunction(ctx as any, 'on-failure', onFailure)
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
