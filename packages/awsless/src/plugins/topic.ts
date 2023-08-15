
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { FunctionSchema, toLambdaFunction } from './function.js';
import { Topic } from '../formation/resource/sns/topic.js';
import { SnsEventSource } from '../formation/resource/lambda/event-source/sns.js';
import { sub } from '../formation/util.js';
// import { Topic } from 'aws-cdk-lib/aws-sns';
// import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
// import { Arn, ArnFormat } from 'aws-cdk-lib';
// import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export const topicPlugin = definePlugin({
	name: 'topic',
	schema: z.object({
		stacks: z.object({
			/** Define the topics to listen too in your stack
			 * @example
			 * {
			 *   topics: {
			 *     TOPIC_NAME: 'function.ts'
			 *   }
			 * }
			 * */
			topics: z.record(ResourceIdSchema, FunctionSchema).optional()
		}).array()
	}),
	onApp({ config, bootstrap, bind }) {
		const allTopicNames = config.stacks.map(stack => {
			// @ts-ignore
			return Object.keys(stack.topics || {})
		}).flat()

		const uniqueTopicNames = [...new Set(allTopicNames)]

		for(const id of uniqueTopicNames) {
			const topic = new Topic(id, {
				name: `${config.name}-${id}`
			})

			bootstrap.add(topic)
			bootstrap.export(`topic-${id}-arn`, topic.arn)

			// bind(lambda => {
			// 	lambda.addPermissions({
			// 		actions: [ 'sns:Publish' ],
			// 		resources: [ bootstrap.import(`topic-${id}-arn`) ],
			// 	})

			// 	lambda.addEnvironment(`RESOURCE_TOPIC_GLOBAL_${id}`, topic.name)
			// })
		}

		bind(lambda => {
			lambda.addPermissions({
				actions: [ 'sns:Publish' ],
				resources: [
					sub('arn:${AWS::Partition}:sns:${AWS::Region}:${AWS::AccountId}:${app}-*', {
						app: config.name,
					})
				],
			})
		})
	},
	onStack(ctx) {
		const { stack, stackConfig, bootstrap } = ctx

		for(const [ id, props ] of Object.entries(stackConfig.topics || {})) {
			const lambda = toLambdaFunction(ctx, id, props)
			const source = new SnsEventSource(id, lambda, {
				topicArn: bootstrap.import(`topic-${id}-arn`)
			})

			stack.add(lambda, source)
		}
	},
})
