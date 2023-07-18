import { z } from 'zod'
import { definePlugin } from "../plugin";
import { toArn, toId } from "../util/resource";
import { ResourceIdSchema } from "../schema/resource-id";
import { FunctionSchema, toFunction } from './function';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

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
				topicName: id,
				displayName: id,
			})
		})
	},
	onStack(ctx) {
		return Object.entries(ctx.stackConfig.topics || {}).map(([ id, props ]) => {
			const lambda = toFunction(ctx as any, id, props)

			const topic = Topic.fromTopicArn(
				ctx.stack,
				toId('topic', id),
				toArn(ctx.stack, 'sns', 'topic', id)
			)

			lambda.addEventSource(new SnsEventSource(topic))

			return lambda
		})
	},
})

// import { FunctionConfig, toFunction } from './function'
// import { Context } from '../stack'
// import { Topic } from 'aws-cdk-lib/aws-sns'
// import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
// import { toArn, toId } from '../util/resource'

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
