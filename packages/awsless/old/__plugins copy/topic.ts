
import { z } from 'zod'
import { definePlugin } from '../plugin.js';
import { toId } from '../util/resource.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { FunctionSchema, toFunction } from './function/index.js';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Arn, ArnFormat } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

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

		bind(lambda => {
			lambda.addToRolePolicy(new PolicyStatement({
				actions: [ 'sns:publish' ],
				resources: [ '*' ],
			}))
		})

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

			// topic.grantPublish(lambda)
			return lambda
		})
	},
})

// import { FunctionConfig, toFunction } from './function.js'
// import { Context } from '../stack.js'
// import { Topic } from 'aws-cdk-lib/aws-sns'
// import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
// import { toArn, toId } from '../util/resource.js'

// export type TopicConfig = FunctionConfig

// export const toTopic = (ctx:Context, id:string, props:TopicConfig) => {
// 	const { stack } = ctx
// 	const { lambda } = toFunction(ctx, id, props)

// 	const topic = Topic.fromTopicArn(
// 		stack,
// 		toId('topic', id),
// 		toArn(stack, 'sns', 'topic', id)
// 	)

// 	lambda.addEventSource(new SnsEventSource(topic))

// 	return {
// 		topic,
// 		lambda,
// 	}
// }
