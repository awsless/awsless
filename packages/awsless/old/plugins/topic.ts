
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { addResourceEnvironment, toId } from '../util/resource.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { FunctionSchema, toFunction } from './function/index.js';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Arn, ArnFormat } from 'aws-cdk-lib';
// import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export const topicPlugin = definePlugin({
	name: 'topic',
	schema: z.object({
		stacks: z.object({
			topics: z.record(ResourceIdSchema, FunctionSchema).optional()
		}).array()
	}),
	onBootstrap({ config, stack }) {
		const allTopicNames = config.stacks.map(stack => {
			// @ts-ignore
			return Object.keys(stack.topics || {})
		}).flat()

		const uniqueTopicNames = [...new Set(allTopicNames)]

		uniqueTopicNames.forEach(id => {
			new Topic(stack, toId('topic', id), {
				topicName: `${config.name}-${id}`,
				displayName: id,
			})
		})
	},
	onStack(ctx) {
		const { config, stack, stackConfig, bind } = ctx

		return Object.entries(stackConfig.topics || {}).map(([ id, props ]) => {
			const lambda = toFunction(ctx as any, id, props)

			const topic = Topic.fromTopicArn(
				stack,
				toId('topic', id),
				Arn.format({
					arnFormat: ArnFormat.NO_RESOURCE_NAME,
					service: 'sns',
					resource: `${config.name}-${id}`,
				}, stack)
			)

			lambda.addEventSource(new SnsEventSource(topic))

			bind(lambda => {
				addResourceEnvironment(stack, 'topic', id, lambda)
				topic.grantPublish(lambda)
				// lambda.addToRolePolicy(new PolicyStatement({
				// 	actions: [ 'sns:publish' ],
				// 	resources: [ '*' ],
				// }))
			})

			// topic.grantPublish(lambda)
			return lambda
		})
	},
})
