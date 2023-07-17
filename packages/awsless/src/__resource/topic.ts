import { FunctionConfig, toFunction } from './function'
import { Context } from '../stack'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { toArn, toId } from '../util/resource'

export type TopicConfig = FunctionConfig

export const toTopic = (ctx:Context, id:string, props:TopicConfig) => {
	const { stack } = ctx
	const { lambda } = toFunction(ctx, id, props)

	const topic = Topic.fromTopicArn(
		stack,
		toId('topic', id),
		toArn(stack, 'sns', 'topic', id)
	)

	lambda.addEventSource(new SnsEventSource(topic))

	return {
		topic,
		lambda,
	}
}
